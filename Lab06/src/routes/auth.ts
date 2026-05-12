import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { validate } from '../middleware/validate';
import { authSchema } from '../schemas/auth.schema';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

const issueTokensAndSetCookies = (res: Response, userId: string) => {
    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ userId }, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, secret, { expiresIn: '30d' });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
    };

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

router.post('/register', validate(authSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const newUser = new User({ email, password });
        await newUser.save();

        res.status(201).json({
            message: 'Користувача успішно створено',
            user: { id: newUser._id, email: newUser.email, createdAt: newUser.createdAt }
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(409).json({ message: 'Користувач з такою поштою вже існує' });
            return;
        }
        next(error);
    }
});

router.post('/login', validate(authSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: 'Невірні облікові дані' });
            return;
        }

        issueTokensAndSetCookies(res, user._id.toString());
        res.status(200).json({ message: 'Успішний вхід' });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            res.status(401).json({ message: 'Не авторизовано' });
            return;
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };
        issueTokensAndSetCookies(res, decoded.userId);
        res.status(200).json({ message: 'Токени оновлено' });
    } catch (error) {
        res.status(401).json({ message: 'Недійсний refresh токен' });
    }
});

router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).json({ message: 'Вийшли з системи' });
});

export default router;
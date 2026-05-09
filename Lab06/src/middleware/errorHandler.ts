import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
        res.status(400).json({ error: 'Validation failed', issues: err.issues });
        return;
    }

    if (err instanceof mongoose.Error.CastError) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
    }

    if (err instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: 'Database validation failed', details: err.errors });
        return;
    }

    if (err.code === 11000) {
        res.status(409).json({ error: 'Duplicate key conflict' });
        return;
    }
    res.status(500).json({ error: 'Internal Server Error' });
};
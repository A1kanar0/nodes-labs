import request from 'supertest';
import app from '../app';
import { connectTestDB, closeTestDB, clearTestDB } from './setup';

process.env.JWT_SECRET = 'test_secret_key_123';

beforeAll(async () => {
    await connectTestDB();
});

afterEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await closeTestDB();
});

describe('Auth API Integration Tests', () => {
    const validUser = {
        email: 'test@example.com',
        password: 'password123'
    };

    describe('POST /auth/register', () => {
        it('should register a new user and return 201', async () => {
            const res = await request(app).post('/auth/register').send(validUser);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Користувача успішно створено');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.email).toBe(validUser.email);
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should return 409 Conflict if email already exists', async () => {
            await request(app).post('/auth/register').send(validUser);
            const res = await request(app).post('/auth/register').send(validUser);

            expect(res.status).toBe(409);
        });

        it('should return 400 for invalid email or short password (Zod Validation)', async () => {
            const res = await request(app).post('/auth/register').send({ email: 'bad-email', password: '123' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/auth/register').send(validUser);
        });

        it('should login successfully and set cookies', async () => {
            const res = await request(app).post('/auth/login').send(validUser);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Успішний вхід');

            const cookies = res.headers['set-cookie'] as unknown as string[];
            expect(cookies).toBeDefined();
            expect(cookies.some((cookie: string) => cookie.includes('access_token='))).toBeTruthy();
            expect(cookies.some((cookie: string) => cookie.includes('refresh_token='))).toBeTruthy();
        });

        it('should return 401 for wrong password', async () => {
            const res = await request(app).post('/auth/login').send({ email: validUser.email, password: 'wrongpassword' });
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Невірні облікові дані');
        });

        it('should return 401 for non-existent user', async () => {
            const res = await request(app).post('/auth/login').send({ email: 'ghost@example.com', password: 'password123' });
            expect(res.status).toBe(401);
        });
    });

    describe('POST /auth/refresh & logout', () => {
        let refreshTokenCookie: string;

        beforeEach(async () => {
            await request(app).post('/auth/register').send(validUser);
            const loginRes = await request(app).post('/auth/login').send(validUser);

            const cookies = loginRes.headers['set-cookie'] as unknown as string[];
            const foundCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
            refreshTokenCookie = foundCookie ? foundCookie.split(';')[0] : '';
        });

        it('should refresh tokens and return 200', async () => {
            const res = await request(app)
                .post('/auth/refresh')
                .set('Cookie', [refreshTokenCookie]);

            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should return 401 if no refresh token is provided', async () => {
            const res = await request(app).post('/auth/refresh');
            expect(res.status).toBe(401);
        });

        it('should logout and clear cookies', async () => {
            const res = await request(app).post('/auth/logout');

            expect(res.status).toBe(200);
            const cookies = res.headers['set-cookie'] as unknown as string[];
            expect(cookies.some((c: string) => c.includes('access_token=;') || c.includes('Expires='))).toBeTruthy();
        });
    });
});
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { PrintModel } from '../models/printModel.model';
import { connectTestDB, closeTestDB, clearTestDB } from './setup';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'super_secret_test_key_123';

beforeAll(async () => {
    await connectTestDB();
});

afterEach(async () => {
    await clearTestDB();
});

afterAll(async () => {
    await closeTestDB();
});

describe('1. PrintModel Unit Tests (Mongoose Model)', () => {
    const testOwnerId = new mongoose.Types.ObjectId();

    const validData = {
        title: 'Benchy',
        printTimeMinutes: 135,
        weightGrams: 12,
        material: 'PLA',
        ownerId: testOwnerId
    };

    it('should correctly compute the virtual formattedTime', () => {
        const model: any = new PrintModel(validData as any);
        expect(model.formattedTime).toBe('2h 15m');
    });

    it('should set default material to PLA if not provided', async () => {
        const model: any = new PrintModel({ title: 'Test', printTimeMinutes: 10, weightGrams: 5, ownerId: testOwnerId } as any);
        expect(model.material).toBe('PLA');
    });

    it('should fail database validation if printTimeMinutes is a float', async () => {
        const model: any = new PrintModel({ ...validData, printTimeMinutes: 14.5 } as any);
        let error: any;
        try {
            await model.validate();
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
        expect(error.errors.printTimeMinutes).toBeDefined();
    });
});

describe('2. PrintModel API Integration Tests', () => {
    const user1Id = new mongoose.Types.ObjectId();
    const user2Id = new mongoose.Types.ObjectId();

    const token1 = jwt.sign({ userId: user1Id.toString() }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const token2 = jwt.sign({ userId: user2Id.toString() }, process.env.JWT_SECRET!, { expiresIn: '15m' });

    const validModelParams = {
        title: 'Benchy for Bambu Lab A1',
        description: 'Speed boat test',
        printTimeMinutes: 14,
        weightGrams: 12,
        material: 'PLA',
    };

    const seedData = { ...validModelParams, ownerId: user1Id };

    it('should return 401 Unauthorized if no token is provided for POST', async () => {
        const res = await request(app).post('/api/models').send(validModelParams);
        expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden when trying to update another user\'s model', async () => {
        const model: any = await PrintModel.create(seedData as any);

        const res = await request(app)
            .patch(`/api/models/${model._id}`)
            .set('Cookie', [`access_token=${token2}`])
            .send({ title: 'Hacked Title' });

        expect(res.status).toBe(403);
    });

    it('should create a new print model', async () => {
        const res = await request(app)
            .post('/api/models')
            .set('Cookie', [`access_token=${token1}`])
            .send(validModelParams);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe(validModelParams.title);
    });

    it('should return 400 for invalid request body (Zod Validation)', async () => {
        const res = await request(app)
            .post('/api/models')
            .set('Cookie', [`access_token=${token1}`])
            .send({ title: '' });

        expect(res.status).toBe(400);
    });

    it('should return paginated models (Public)', async () => {
        await PrintModel.create(seedData as any);
        await PrintModel.create({ ...seedData, title: 'Second Model' } as any);

        const res = await request(app).get('/api/models?limit=10&page=1');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toBe(2);
    });

    it('should return model by id (Public)', async () => {
        const model: any = await PrintModel.create(seedData as any);
        const res = await request(app).get(`/api/models/${model._id}`);
        expect(res.status).toBe(200);
        expect(res.body.title).toBe(model.title);
    });

    it('should update a model', async () => {
        const model: any = await PrintModel.create(seedData as any);
        const res = await request(app)
            .patch(`/api/models/${model._id}`)
            .set('Cookie', [`access_token=${token1}`])
            .send({ title: 'Updated Benchy' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Updated Benchy');
    });

    it('should delete a model', async () => {
        const model: any = await PrintModel.create(seedData as any);
        const res = await request(app)
            .delete(`/api/models/${model._id}`)
            .set('Cookie', [`access_token=${token1}`]);

        expect(res.status).toBe(204);

        const dbCheck = await PrintModel.findById(model._id);
        expect(dbCheck).toBeNull();
    });

    it('should filter models by maxTime (Public)', async () => {
        await PrintModel.create(seedData as any);
        await PrintModel.create({ ...seedData, title: 'Long', printTimeMinutes: 120 } as any);

        const res = await request(app).get('/api/models?maxTime=60');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
    });
});
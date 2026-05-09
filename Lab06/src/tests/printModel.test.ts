import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { PrintModel } from '../models/printModel.model';
import { connectTestDB, closeTestDB, clearTestDB } from './setup';

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
    const validData = {
        title: 'Benchy',
        printTimeMinutes: 135,
        weightGrams: 12,
        material: 'PLA'
    };

    it('should correctly compute the virtual formattedTime', () => {
        const model = new PrintModel(validData);
        expect(model.formattedTime).toBe('2h 15m');
    });

    it('should set default material to PLA if not provided', async () => {
        const model = new PrintModel({ title: 'Test', printTimeMinutes: 10, weightGrams: 5 });
        expect(model.material).toBe('PLA');
    });

    it('should fail database validation if printTimeMinutes is a float', async () => {
        const model = new PrintModel({ ...validData, printTimeMinutes: 14.5 });
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
    const validModelParams = {
        title: 'Benchy for Bambu Lab A1',
        description: 'Speed boat test',
        printTimeMinutes: 14,
        weightGrams: 12,
        material: 'PLA'
    };

    it('should create a new print model', async () => {
        const res = await request(app).post('/api/models').send(validModelParams);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe(validModelParams.title);
    });

    it('should return 400 for invalid request body (Zod Validation)', async () => {
        const res = await request(app).post('/api/models').send({ title: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    it('should return paginated models', async () => {
        await PrintModel.create(validModelParams);
        await PrintModel.create({ ...validModelParams, title: 'Second Model' });

        const res = await request(app).get('/api/models?limit=10&page=1');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.data.length).toBe(2);
        expect(res.body.pagination.totalItems).toBe(2);
    });

    it('should return model by id', async () => {
        const model = await PrintModel.create(validModelParams);
        const res = await request(app).get(`/api/models/${model._id}`);
        expect(res.status).toBe(200);
        expect(res.body.title).toBe(model.title);
    });

    it('should return 400 for invalid MongoDB ObjectId format', async () => {
        const res = await request(app).get('/api/models/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent but valid ObjectId', async () => {
        const validFakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/models/${validFakeId}`);
        expect(res.status).toBe(404);
    });

    it('should update a model', async () => {
        const model = await PrintModel.create(validModelParams);
        const res = await request(app)
            .patch(`/api/models/${model._id}`)
            .send({ title: 'Updated Benchy' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Updated Benchy');
    });

    it('should return 404 when updating non-existent id', async () => {
        const validFakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .patch(`/api/models/${validFakeId}`)
            .send({ title: 'New' });
        expect(res.status).toBe(404);
    });

    it('should delete a model', async () => {
        const model = await PrintModel.create(validModelParams);
        const res = await request(app).delete(`/api/models/${model._id}`);
        expect(res.status).toBe(204);

        const dbCheck = await PrintModel.findById(model._id);
        expect(dbCheck).toBeNull();
    });

    it('should return 404 when deleting non-existent id', async () => {
        const validFakeId = new mongoose.Types.ObjectId();
        const res = await request(app).delete(`/api/models/${validFakeId}`);
        expect(res.status).toBe(404);
    });

    it('should filter models by maxTime', async () => {
        await PrintModel.create(validModelParams); // 14 min
        await PrintModel.create({ ...validModelParams, title: 'Long', printTimeMinutes: 120 }); // 120 min

        const res = await request(app).get('/api/models?maxTime=60');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].title).toBe(validModelParams.title);
    });

    it('should filter by multiple parameters', async () => {
        await PrintModel.create(validModelParams);
        await PrintModel.create({ ...validModelParams, material: 'PETG' });

        const res = await request(app).get('/api/models?maxTime=60&material=PETG');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].material).toBe('PETG');
    });

    it('should return models under 60 minutes for quick-prints route', async () => {
        await PrintModel.create(validModelParams);
        await PrintModel.create({ ...validModelParams, printTimeMinutes: 300 });

        const res = await request(app).get('/api/models/quick-prints');
        expect(res.status).toBe(200);
        expect(res.body.data ? res.body.data.length : res.body.length).toBe(1);
    });
});
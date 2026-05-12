import { Router, Request, Response, NextFunction } from 'express';
import { printModelStorage } from '../storage/printModel';
import { validate } from '../middleware/validate';
import { createPrintModelSchema, updatePrintModelSchema } from '../schemas/printModel.schema';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/quick-prints', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quickModels = await printModelStorage.getAll({ maxTime: 60 });
        res.status(200).json(quickModels);
    } catch (error) {
        next(error);
    }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const maxTime = req.query.maxTime ? parseInt(req.query.maxTime as string) : undefined;
        const material = req.query.material as string | undefined;

        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await printModelStorage.getAll({ maxTime, material, page, limit });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const model = await printModelStorage.getById(req.params.id);
        if (!model) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
});

router.post('/', requireAuth, validate(createPrintModelSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const newModel = await printModelStorage.create({
            ...req.body,
            ownerId: req.userId
        });
        res.status(201).json(newModel);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', requireAuth, validate(updatePrintModelSchema), async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const existingModel = await printModelStorage.getById(req.params.id);
        if (!existingModel) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }

        if (existingModel.ownerId.toString() !== req.userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const updatedModel = await printModelStorage.update(req.params.id, req.body);
        res.status(200).json(updatedModel);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const existingModel = await printModelStorage.getById(req.params.id);
        if (!existingModel) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }

        if (existingModel.ownerId.toString() !== req.userId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const success = await printModelStorage.delete(req.params.id);
        if (!success) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
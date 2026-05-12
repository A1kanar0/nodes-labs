import { z } from 'zod';

export const createPrintModelSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    printTimeMinutes: z.number().int().positive(),
    weightGrams: z.number().positive(),
    material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'PETG-CF']).default('PLA'),
});

export const updatePrintModelSchema = createPrintModelSchema.partial();

export type CreatePrintModelInput = z.infer<typeof createPrintModelSchema>;
export type UpdatePrintModelInput = z.infer<typeof updatePrintModelSchema>;

export type PrintModelEntity = CreatePrintModelInput & {
    id: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
};
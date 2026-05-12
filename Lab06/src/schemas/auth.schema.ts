import { z } from 'zod';

export const authSchema = z.object({
    email: z.string().email('Некоректний формат пошти'),
    password: z.string().min(6, 'Пароль має містити мінімум 6 символів')
});

export type AuthInput = z.infer<typeof authSchema>;
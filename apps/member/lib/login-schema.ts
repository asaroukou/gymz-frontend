import { z } from 'zod';
import { meetsPasswordPolicy } from './password-rules';

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const newPasswordSchema = z
  .object({
    newPassword: z.string().refine(meetsPasswordPolicy, { message: 'policy' }),
    confirmPassword: z.string().min(1, { message: 'mismatch' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });

export type CredentialsValues = z.infer<typeof credentialsSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

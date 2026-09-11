import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });

export type CredentialsValues = z.infer<typeof credentialsSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

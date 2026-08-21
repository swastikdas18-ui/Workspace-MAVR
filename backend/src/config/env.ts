import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().default('workspace-os-secure-secret-key-32-chars-long-minimum'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEMO_MODE: z.string().default('true').transform((val) => val === 'true' || val === '1'),
});

export const env = envSchema.parse(process.env);

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
  // Backblaze B2 S3-Compatible Object Storage
  B2_KEY_ID: z.string().optional(),
  B2_APPLICATION_KEY: z.string().optional(),
  B2_BUCKET_NAME: z.string().default('workspace-os-vault'),
  B2_ENDPOINT: z.string().default('https://s3.us-west-004.backblazeb2.com'),
  B2_REGION: z.string().default('us-west-004'),
  B2_PUBLIC_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

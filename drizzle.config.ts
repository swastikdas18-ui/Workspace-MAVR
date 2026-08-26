import 'dotenv/config';

export default {
  schema: './backend/packages/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql' as const,
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};

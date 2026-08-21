/**
 * Database Connection & Better Auth Configuration
 * Demonstrates PostgreSQL connection via Neon Serverless / Drizzle ORM and Better Auth integration.
 */

export const dbConnectionCode = `
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Connection String from environment variable
const sql = neon(process.env.DATABASE_URL || 'postgresql://user:password@host/workspace_os?sslmode=require');

export const db = drizzle(sql, { schema });
`;

export const betterAuthCode = `
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/connection";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "employee",
        input: true
      },
      title: {
        type: "string",
        required: false
      },
      teamId: {
        type: "string",
        required: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  }
});
`;

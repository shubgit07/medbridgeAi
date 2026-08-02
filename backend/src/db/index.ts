import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { config } from '../config.js';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('supabase') || config.databaseUrl.includes('render') || config.databaseUrl.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(pool, { schema });
export { schema };

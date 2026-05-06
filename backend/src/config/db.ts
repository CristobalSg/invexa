import { Pool, type PoolConfig } from 'pg';

import { env } from './env.js';

const poolConfig: PoolConfig = {
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const createPostgresPool = (): Pool => new Pool(poolConfig);

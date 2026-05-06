import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 1000);

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('PostgreSQL is ready');
    process.exit(0);
  } catch (error) {
    await client.end().catch(() => undefined);
    console.log(`Waiting for PostgreSQL (${attempt}/${maxAttempts})`);

    if (attempt === maxAttempts) {
      console.error(error);
      process.exit(1);
    }

    await wait(delayMs);
  }
}

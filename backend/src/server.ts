import { env } from './config/env.js';
import { buildApp } from './app.js';

const start = async (): Promise<void> => {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();

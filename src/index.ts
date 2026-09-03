import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port, host });
    // eslint-disable-next-line no-console
    console.log(`AngleSharp TestSite listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.close().then(() => process.exit(0));
    });
  }
}

void main();

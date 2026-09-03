import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { registerRoutes } from './routes.js';
import { registerTestCases } from './testcases.js';
import { registerWebSocket } from './websocket.js';

// `public/` sits next to `src/` (dev) and `dist/` (prod) — one level up from here.
const publicDir = fileURLToPath(new URL('../public', import.meta.url));

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    // ASP.NET routing is case-insensitive (e.g. /PostUrlEncodeNormal).
    routerOptions: { caseSensitive: false },
    bodyLimit: 16 * 1024 * 1024,
    logger: false,
  });

  // Capture every request body verbatim as a Buffer; the routes parse it
  // themselves so that /Echo can echo the raw bytes while also reading fields.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    index: false,
    wildcard: true,
  });

  await registerWebSocket(app);
  registerRoutes(app);
  registerTestCases(app);

  return app;
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Captured real-world pages live next to this module's compiled/dev output.
const assetsDir = fileURLToPath(new URL('../public/test-cases', import.meta.url));

/** Loads a captured HTML asset and pre-computes its gzip-encoded form. */
function loadAsset(name: string): { raw: Buffer; gzip: Buffer } {
  const raw = readFileSync(`${assetsDir}/${name}`);
  return { raw, gzip: gzipSync(raw) };
}

const pages = {
  powerball: loadAsset('powerball.html'),
  empireaerials: loadAsset('empireaerials.html'),
  kommersant: loadAsset('kommersant.html'),
  eurobelarus: loadAsset('eurobelarus.html'),
  europarl: loadAsset('europarl.html'),
};

/** Serves a captured page, gzip-encoded to exercise the decoding path. */
function sendGzipHtml(reply: FastifyReply, page: { gzip: Buffer }): FastifyReply {
  return reply
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('Content-Encoding', 'gzip')
    .header('Vary', 'Accept-Encoding')
    .send(page.gzip);
}

/**
 * Serializes a value the way Go's `json.MarshalIndent(v, "", "  ")` does, which
 * is what httpbingo uses: two-space indentation and alphabetically sorted object
 * keys. A trailing newline is appended by the callers that need it.
 */
function goJson(value: unknown, indent = ''): string {
  const inner = indent + '  ';

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map((item) => inner + goJson(item, inner));
    return `[\n${items.join(',\n')}\n${indent}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  if (entries.length === 0) {
    return '{}';
  }

  const body = entries.map(([key, val]) => `${inner}${JSON.stringify(key)}: ${goJson(val, inner)}`);
  return `{\n${body.join(',\n')}\n${indent}}`;
}

function rawBody(request: FastifyRequest): Buffer {
  return Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
}

/** Builds an httpbingo-style response body for a method that reflects its body. */
function reflectBody(request: FastifyRequest): string {
  const body = rawBody(request);
  const contentType = request.headers['content-type'];
  const mediaType = contentType && contentType.length > 0 ? contentType : 'application/octet-stream';
  const data = body.length > 0 ? `data:${mediaType};base64,${body.toString('base64')}` : '';

  return (
    goJson({
      data,
      method: request.method,
      url: request.url,
    }) + '\n'
  );
}

function methodNotAllowed(reply: FastifyReply, allow: string): FastifyReply {
  return reply.code(405).header('Allow', allow).type('text/plain; charset=utf-8').send('');
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) {
    return cookies;
  }
  for (const part of header.split(';')) {
    const segment = part.trim();
    if (segment.length === 0) {
      continue;
    }
    const index = segment.indexOf('=');
    if (index < 0) {
      cookies[segment] = '';
    } else {
      cookies[segment.slice(0, index).trim()] = segment.slice(index + 1).trim();
    }
  }
  return cookies;
}

export function registerTestCases(app: FastifyInstance): void {
  // --- Captured pages ---
  app.get('/test-cases/powerball', async (_request, reply) => sendGzipHtml(reply, pages.powerball));
  app.get('/test-cases/empireaerials', async (_request, reply) =>
    sendGzipHtml(reply, pages.empireaerials),
  );
  app.get('/test-cases/kommersant', async (_request, reply) =>
    sendGzipHtml(reply, pages.kommersant),
  );
  app.get('/test-cases/eurobelarus', async (_request, reply) =>
    sendGzipHtml(reply, pages.eurobelarus),
  );
  app.get('/test-cases/europarl', async (_request, reply) =>
    reply.header('Content-Type', 'text/html; charset=utf-8').send(pages.europarl.raw),
  );

  // --- Status code passthrough ---
  // Written on the raw response because Fastify rejects status codes above 599,
  // whereas the contract allows any code in the 100-999 range.
  app.get('/test-cases/status/:code', async (request, reply) => {
    const code = Number((request.params as { code: string }).code);
    if (!Number.isInteger(code) || code < 100 || code > 999) {
      return reply.code(400).type('text/plain; charset=utf-8').send('Invalid status code');
    }
    reply.hijack();
    reply.raw.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    reply.raw.end();
  });

  // --- Method-restricted endpoints ---
  app.all('/test-cases/methods/get', async (request, reply) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return reply.type('text/plain; charset=utf-8').send('');
    }
    return methodNotAllowed(reply, 'GET');
  });

  app.all('/test-cases/methods/delete', async (request, reply) => {
    if (request.method === 'DELETE') {
      return reply.type('text/plain; charset=utf-8').send('');
    }
    return methodNotAllowed(reply, 'DELETE');
  });

  app.all('/test-cases/methods/post', async (request, reply) => {
    if (request.method === 'POST') {
      return reply.type('application/json; charset=utf-8').send(reflectBody(request));
    }
    return methodNotAllowed(reply, 'POST');
  });

  app.all('/test-cases/methods/put', async (request, reply) => {
    if (request.method === 'PUT') {
      return reply.type('application/json; charset=utf-8').send(reflectBody(request));
    }
    return methodNotAllowed(reply, 'PUT');
  });

  // --- User agent reflection ---
  app.get('/test-cases/user-agent', async (request, reply) => {
    const agent = request.headers['user-agent'] ?? '';
    return reply
      .type('application/json; charset=utf-8')
      .send(goJson({ 'user-agent': agent }) + '\n');
  });

  // --- robots.txt ---
  app.get('/test-cases/robots', async (_request, reply) => {
    return reply.type('text/plain; charset=utf-8').send('User-agent: *\nDisallow: /deny\n');
  });

  // --- Cookies ---
  app.get('/test-cases/set-cookies', async (request, reply) => {
    const query = request.query as Record<string, string | string[]>;
    const setCookies: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      const v = Array.isArray(value) ? value[value.length - 1] : value;
      setCookies.push(`${key}=${v}; Path=/`);
    }
    if (setCookies.length > 0) {
      reply.header('Set-Cookie', setCookies);
    }
    return reply.code(302).header('Location', '/test-cases/get-cookies').send('');
  });

  app.get('/test-cases/get-cookies', async (request, reply) => {
    const cookies = parseCookieHeader(request.headers.cookie);
    return reply.type('application/json; charset=utf-8').send(goJson({ cookies }) + '\n');
  });

  // --- Redirect ---
  app.get('/test-cases/redirect', async (request, reply) => {
    const target = (request.query as { url?: string }).url;
    if (!target) {
      return reply.code(400).type('text/plain; charset=utf-8').send('Missing url parameter');
    }
    return reply.code(302).header('Location', target).send('');
  });
}

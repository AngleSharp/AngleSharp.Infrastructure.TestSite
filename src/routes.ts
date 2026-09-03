import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  firstValue,
  groupFields,
  parseMultipart,
  parseUrlEncoded,
  type Field,
  type FilePart,
} from './lib/forms.js';
import * as views from './lib/views.js';

/** GET actions listed on the overview page, in declaration order. */
const GET_ACTIONS = [
  'PostUrlencodeNormal',
  'PostUrlencodeFile',
  'PostMultipartNormal',
  'PostMultipartFile',
  'PostMultipartFiles',
  'PostAnything',
  'Header',
  'Chunked',
];

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Builds a buffer with byte values 0, 1, 2, ... (wrapping at 256). */
function sequentialBytes(length: number): Buffer {
  const buffer = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = i & 0xff;
  }
  return buffer;
}

function rawBody(request: FastifyRequest): Buffer {
  const body = request.body;
  return Buffer.isBuffer(body) ? body : Buffer.alloc(0);
}

function isMultipart(request: FastifyRequest): boolean {
  return (request.headers['content-type'] ?? '').toLowerCase().includes('multipart/form-data');
}

/** Mirrors `TestsController.Test`: 200 "okay" on success, 400 "error" otherwise. */
function testResult(reply: FastifyReply, ok: boolean): FastifyReply {
  return reply
    .code(ok ? 200 : 400)
    .type('text/html; charset=utf-8')
    .send(ok ? 'okay' : 'error');
}

function validateNormal(fields: Field[]): boolean {
  return (
    firstValue(fields, 'Name') === 'Test' &&
    Number(firstValue(fields, 'Number')) === 1 &&
    firstValue(fields, 'IsActive') === 'true'
  );
}

function validateFile(file: FilePart | undefined): boolean {
  if (!file || file.filename !== 'Filename.txt' || file.contentType !== 'text/plain') {
    return false;
  }
  return file.data.equals(sequentialBytes(32));
}

function validateFiles(files: FilePart[]): boolean {
  if (files.length !== 5) {
    return false;
  }
  for (let k = 1; k <= 5; k++) {
    const file = files[k - 1];
    if (file.filename !== `Filename${k}.txt` || file.contentType !== 'text/plain') {
      return false;
    }
    if (!file.data.equals(sequentialBytes((k + 1) * 5))) {
      return false;
    }
  }
  return true;
}

export function registerRoutes(app: FastifyInstance): void {
  // Overview page (Tests/Index).
  app.get('/', async (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(views.testsIndex(GET_ACTIONS));
  });

  // --- Urlencode ---
  app.get('/PostUrlencodeNormal', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(
      views.modelForm({
        title: 'PostUrlencodeNormal',
        action: '/PostUrlencodeNormal',
        subheading: 'Normal Model',
        submit: 'Create',
        multipart: false,
      }),
    ),
  );

  app.post('/PostUrlencodeNormal', async (request, reply) => {
    const fields = parseUrlEncoded(rawBody(request));
    return testResult(reply, validateNormal(fields));
  });

  app.get('/PostUrlencodeFile', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(
      views.modelForm({
        title: 'PostUrlencodeFile',
        action: '/PostUrlencodeFile',
        subheading: 'FileModel',
        submit: 'Save',
        multipart: false,
        file: { name: 'File', label: 'File', multiple: false },
      }),
    ),
  );

  app.post('/PostUrlencodeFile', async (request, reply) => {
    const fields = parseUrlEncoded(rawBody(request));
    const ok = validateNormal(fields) && firstValue(fields, 'File') === 'Filename.txt';
    return testResult(reply, ok);
  });

  // --- Multipart ---
  app.get('/PostMultipartNormal', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(
      views.modelForm({
        title: 'PostMultipartNormal',
        action: '/PostMultipartNormal',
        subheading: 'Normal Model',
        submit: 'Create',
        multipart: true,
      }),
    ),
  );

  app.post('/PostMultipartNormal', async (request, reply) => {
    const { fields } = await parseMultipart(rawBody(request), request.headers['content-type'] ?? '');
    return testResult(reply, validateNormal(fields));
  });

  app.get('/PostMultipartFile', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(
      views.modelForm({
        title: 'PostMultipartFile',
        action: '/PostMultipartFile',
        subheading: 'FileModel',
        submit: 'Save',
        multipart: true,
        file: { name: 'File', label: 'File', multiple: false },
      }),
    ),
  );

  app.post('/PostMultipartFile', async (request, reply) => {
    const { fields, files } = await parseMultipart(
      rawBody(request),
      request.headers['content-type'] ?? '',
    );
    const file = files.find((f) => f.name === 'File');
    return testResult(reply, validateNormal(fields) && validateFile(file));
  });

  app.get('/PostMultipartFiles', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(
      views.modelForm({
        title: 'PostMultipartFiles',
        action: '/PostMultipartFiles',
        subheading: 'FilesModel',
        submit: 'Save',
        multipart: true,
        file: { name: 'Files', label: 'Files', multiple: true },
      }),
    ),
  );

  app.post('/PostMultipartFiles', async (request, reply) => {
    const { fields, files } = await parseMultipart(
      rawBody(request),
      request.headers['content-type'] ?? '',
    );
    const posted = files.filter((f) => f.name === 'Files');
    return testResult(reply, validateNormal(fields) && validateFiles(posted));
  });

  // --- PostAnything ---
  app.get('/PostAnything', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(views.postAnything([])),
  );

  app.post('/PostAnything', async (request, reply) => {
    let fields: Field[];
    if (isMultipart(request)) {
      fields = (await parseMultipart(rawBody(request), request.headers['content-type'] ?? '')).fields;
    } else {
      fields = parseUrlEncoded(rawBody(request));
    }
    return reply.type('text/html; charset=utf-8').send(views.postAnything(groupFields(fields)));
  });

  // --- Headers ---
  const headerHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = ((request.params as { id?: string }).id ?? 'referer').toLowerCase();
    const value = request.headers[id];
    const text = Array.isArray(value) ? value.join(',') : (value ?? '');
    return reply.type('text/plain; charset=utf-8').send(text);
  };
  app.get('/Header', headerHandler);
  app.get('/Header/:id', headerHandler);

  // --- Chunked ---
  app.get('/Chunked', async (_request, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });
    res.write(`<!DOCTYPE html>
<html lang=en>
<head>
<meta charset='utf-8'>
<title>Chunked transfer encoding test</title>
</head>
<body>`);
    res.write('<h1>Chunked transfer encoding test</h1>');
    await delay(100);
    res.write('<h5>This is a chunked response after 100 ms.</h5>');
    await delay(1000);
    res.write(
      '<h5>This is a chunked response after 1 second. The server should not close the stream before all chunks are sent to a client.</h5>',
    );
    res.write('</body></html>');
    res.end();
  });

  // --- Echo ---
  app.post('/Echo', async (request, reply) => {
    const body = rawBody(request);
    const contentType = (request.headers['content-type'] ?? '').toLowerCase();

    let fields: Field[] = [];
    if (contentType.includes('multipart/form-data')) {
      // Only non-file parts populate Request.Form.
      fields = (await parseMultipart(body, request.headers['content-type'] ?? '')).fields;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      fields = parseUrlEncoded(body);
    }

    const rows = groupFields(fields);
    return reply.type('text/html; charset=utf-8').send(views.echo(rows, body.toString('utf8')));
  });

  // --- Static (randomized) content ---
  app.get('/static/Css/:id', async (_request, reply) => {
    return reply.type('text/css').send(randomText(4096, 16384));
  });

  // --- Resource loading page ---
  app.get('/Page', async (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(views.resourcePage());
  });
}

const RANDOM_SOURCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZzyxwvutsrqponmlkjihgfedcba0123456789.:;+-*/ ';

function randomText(minChars: number, maxChars: number): string {
  const length = minChars + Math.floor(Math.random() * (maxChars - minChars));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += RANDOM_SOURCE[Math.floor(Math.random() * RANDOM_SOURCE.length)];
  }
  return result;
}

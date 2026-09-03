import { Readable } from 'node:stream';
import busboy from 'busboy';

/** A single submitted form field, preserving order and duplicate keys. */
export interface Field {
  name: string;
  value: string;
}

/** A submitted file part from a multipart/form-data body. */
export interface FilePart {
  name: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface MultipartResult {
  fields: Field[];
  files: FilePart[];
}

/** HTML-encodes text the way Razor's `@value` does, so `TextContent` round-trips. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    // Mirror the lenient behavior of ASP.NET for malformed sequences.
    return value.replace(/\+/g, ' ');
  }
}

/**
 * Parses an `application/x-www-form-urlencoded` body into ordered fields,
 * preserving duplicate keys and their order of appearance.
 */
export function parseUrlEncoded(body: Buffer): Field[] {
  const text = body.toString('utf8');

  if (text.length === 0) {
    return [];
  }

  const fields: Field[] = [];

  for (const pair of text.split('&')) {
    if (pair.length === 0) {
      continue;
    }

    const index = pair.indexOf('=');

    if (index < 0) {
      fields.push({ name: decodeComponent(pair), value: '' });
    } else {
      fields.push({
        name: decodeComponent(pair.slice(0, index)),
        value: decodeComponent(pair.slice(index + 1)),
      });
    }
  }

  return fields;
}

/**
 * Groups fields the way an ASP.NET `NameValueCollection` (i.e. `Request.Form`)
 * exposes them: distinct keys in first-appearance order, with all values for a
 * key joined by a comma.
 */
export function groupFields(fields: Field[]): Field[] {
  const order: string[] = [];
  const values = new Map<string, string[]>();

  for (const field of fields) {
    if (!values.has(field.name)) {
      values.set(field.name, []);
      order.push(field.name);
    }
    values.get(field.name)!.push(field.value);
  }

  return order.map((name) => ({ name, value: values.get(name)!.join(',') }));
}

/** Returns the first submitted value for a field name, or `undefined`. */
export function firstValue(fields: Field[], name: string): string | undefined {
  return fields.find((field) => field.name === name)?.value;
}

/** Parses a `multipart/form-data` body into its text fields and file parts. */
export function parseMultipart(body: Buffer, contentType: string): Promise<MultipartResult> {
  return new Promise((resolve, reject) => {
    const fields: Field[] = [];
    const files: FilePart[] = [];
    let pending = 0;
    let finished = false;

    const maybeDone = () => {
      if (finished && pending === 0) {
        resolve({ fields, files });
      }
    };

    let bb: busboy.Busboy;

    try {
      bb = busboy({ headers: { 'content-type': contentType } });
    } catch (error) {
      reject(error);
      return;
    }

    bb.on('field', (name, value) => {
      fields.push({ name, value });
    });

    bb.on('file', (name, stream, info) => {
      pending++;
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('limit', () => stream.resume());
      stream.on('end', () => {
        files.push({
          name,
          filename: info.filename ?? '',
          contentType: info.mimeType,
          data: Buffer.concat(chunks),
        });
        pending--;
        maybeDone();
      });
      stream.on('error', reject);
    });

    bb.on('close', () => {
      finished = true;
      maybeDone();
    });
    bb.on('error', reject);

    Readable.from(body).pipe(bb);
  });
}

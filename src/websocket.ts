import type { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

/**
 * Registers `/ws-echo`: a WebSocket endpoint that echoes back every message it
 * receives, verbatim, preserving whether the frame was text or binary.
 */
export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(fastifyWebsocket);

  app.get('/ws-echo', { websocket: true }, (socket) => {
    socket.on('message', (data: Buffer, isBinary: boolean) => {
      socket.send(data, { binary: isBinary });
    });
  });
}

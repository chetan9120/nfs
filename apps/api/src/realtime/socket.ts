import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../auth/tokens.js';

let io: Server | undefined;

export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
      next(new Error('Missing auth token'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  return io;
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUsers(userIds: string[], event: string, payload: unknown): void {
  if (!io) return;
  const rooms = userIds.map(userRoom);
  io.to(rooms).emit(event, payload);
}

import { io, type Socket } from 'socket.io-client';
import { config } from './config.js';
import { getLocalState } from './db.js';

export function connectSocket(onEvent: (event: string) => void): Socket {
  const { accessToken } = getLocalState();
  const socket = io(config.apiBaseUrl, { auth: { token: accessToken }, reconnection: true });

  socket.on('connect', () => onEvent('connect'));
  socket.on('disconnect', () => onEvent('disconnect'));
  socket.on('file_received', () => onEvent('file_received'));
  socket.on('message_added', () => onEvent('message_added'));
  socket.on('status_changed', () => onEvent('status_changed'));

  return socket;
}

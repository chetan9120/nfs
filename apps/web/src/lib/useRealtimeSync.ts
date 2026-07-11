import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { useConversationsStore } from '../store/conversations';
import type { Conversation } from '../types';

export function useRealtimeSync(): void {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io({ auth: { token: accessToken } });
    const { upsert, applyMessageAdded, applyStatusChanged } = useConversationsStore.getState();

    socket.on('file_received', (payload: { conversation: Conversation }) => {
      upsert(payload.conversation);
    });
    socket.on('message_added', applyMessageAdded);
    socket.on('status_changed', applyStatusChanged);

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);
}

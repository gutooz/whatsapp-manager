'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  joinConversation: (id: string) => void;
  leaveConversation: (id: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? '', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('conversation_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('member_status_update', () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });

    const heartbeat = setInterval(() => {
      socket.emit('member_heartbeat');
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [token, queryClient]);

  const joinConversation = (id: string) => socketRef.current?.emit('join_conversation', id);
  const leaveConversation = (id: string) => socketRef.current?.emit('leave_conversation', id);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, connected, joinConversation, leaveConversation }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

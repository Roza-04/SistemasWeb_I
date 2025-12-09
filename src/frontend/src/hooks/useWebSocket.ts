"use client";

import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://127.0.0.1:8000';

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Create socket connection
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      // Authenticate after connection
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('authenticated', (data: any) => {
      console.log('✅ WebSocket authenticated:', data);
    });

    newSocket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  return { socket, isConnected };
}

export default useWebSocket;

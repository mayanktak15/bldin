'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface BrowserState {
  image: string | null;
  url: string;
  title: string;
}

export function useRemoteBrowser() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBrowserRunning, setIsBrowserRunning] = useState(false);
  const [browserState, setBrowserState] = useState<BrowserState>({
    image: null,
    url: '',
    title: '',
  });
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const frameTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    console.log(`[Socket] Connecting to backend at ${BACKEND_URL}`);
    const socket = io(BACKEND_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server.');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server.');
      setIsConnected(false);
      setIsBrowserRunning(false);
      setBrowserState({ image: null, url: '', title: '' });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
      setError('Failed to connect to the backend server. Please verify it is running.');
      setIsConnected(false);
    });

    socket.on('browser-started', (data: { url: string; title: string }) => {
      console.log('[Socket] Remote browser started.');
      setIsBrowserRunning(true);
      setBrowserState((prev) => ({
        ...prev,
        url: data.url,
        title: data.title,
      }));
      setError(null);
    });

    socket.on('browser-navigated', (data: { url: string; title: string }) => {
      setBrowserState((prev) => ({
        ...prev,
        url: data.url,
        title: data.title,
      }));
    });

    socket.on('browser-frame', (data: { image: string; url: string; title: string }) => {
      // Calculate roundtrip / latency estimation
      const now = Date.now();
      const elapsed = now - frameTimestampRef.current;
      setLatency(elapsed > 0 ? elapsed : 0);
      frameTimestampRef.current = now;

      setBrowserState({
        image: `data:image/jpeg;base64,${data.image}`,
        url: data.url,
        title: data.title,
      });
    });

    socket.on('browser-error', (data: { message: string }) => {
      console.error('[Socket] Remote browser error:', data.message);
      setError(data.message);
    });

    return () => {
      console.log('[Socket] Cleaning up socket connection.');
      socket.disconnect();
    };
  }, []);

  const startBrowser = useCallback((url: string, width: number, height: number) => {
    if (!socketRef.current || !isConnected) return;
    setError(null);
    socketRef.current.emit('start-browser', { url, width, height });
  }, [isConnected]);

  const stopBrowser = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('stop-browser');
    setIsBrowserRunning(false);
    setBrowserState({ image: null, url: '', title: '' });
  }, [isConnected]);

  const navigate = useCallback((url: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('navigate', { url });
  }, [isConnected]);

  const goBack = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('go-back');
  }, [isConnected]);

  const goForward = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('go-forward');
  }, [isConnected]);

  const reload = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('reload');
  }, [isConnected]);

  const sendClick = useCallback((x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mouse-click', { x, y, button });
  }, [isConnected]);

  const sendMouseMove = useCallback((x: number, y: number) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mouse-move', { x, y });
  }, [isConnected]);

  const sendMouseDown = useCallback((x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mouse-down', { x, y, button });
  }, [isConnected]);

  const sendMouseUp = useCallback((x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mouse-up', { x, y, button });
  }, [isConnected]);

  const sendType = useCallback((text: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('keyboard-type', { text });
  }, [isConnected]);

  const sendKeyPress = useCallback((key: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('keyboard-press', { key });
  }, [isConnected]);

  const sendScroll = useCallback((deltaX: number, deltaY: number) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('scroll', { deltaX, deltaY });
  }, [isConnected]);

  const sendResize = useCallback((width: number, height: number) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('resize', { width, height });
  }, [isConnected]);

  return {
    isConnected,
    isBrowserRunning,
    browserState,
    latency,
    error,
    startBrowser,
    stopBrowser,
    navigate,
    goBack,
    goForward,
    reload,
    sendClick,
    sendMouseMove,
    sendMouseDown,
    sendMouseUp,
    sendType,
    sendKeyPress,
    sendScroll,
    sendResize,
  };
}

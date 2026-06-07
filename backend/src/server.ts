import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { BrowserSession } from './browserManager.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // Allow handling large payloads if needed
});

// Store active browser sessions by socket ID
const activeSessions = new Map<string, BrowserSession>();

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Create a new session for this socket connection
  const session = new BrowserSession(socket);
  activeSessions.set(socket.id, session);

  // 1. Start Browser Session
  socket.on('start-browser', async (data?: { url?: string; width?: number; height?: number }) => {
    const url = data?.url || 'https://www.google.com';
    const width = data?.width || 1280;
    const height = data?.height || 720;
    
    await session.resize(width, height);
    await session.start(url);
  });

  // 2. Stop Browser Session
  socket.on('stop-browser', async () => {
    console.log(`[Socket] Stop browser requested by: ${socket.id}`);
    await session.stop();
  });

  // 3. Navigation Events
  socket.on('navigate', async (data: { url: string }) => {
    await session.navigate(data.url);
  });

  socket.on('go-back', async () => {
    await session.goBack();
  });

  socket.on('go-forward', async () => {
    await session.goForward();
  });

  socket.on('reload', async () => {
    await session.reload();
  });

  // 4. Mouse Interactivity Events
  socket.on('mouse-click', async (data: { x: number; y: number; button?: 'left' | 'right' | 'middle' }) => {
    await session.click(data.x, data.y, data.button);
  });

  socket.on('mouse-move', async (data: { x: number; y: number }) => {
    await session.mouseMove(data.x, data.y);
  });

  socket.on('mouse-down', async (data: { x: number; y: number; button?: 'left' | 'right' | 'middle' }) => {
    await session.mouseDown(data.x, data.y, data.button);
  });

  socket.on('mouse-up', async (data: { x: number; y: number; button?: 'left' | 'right' | 'middle' }) => {
    await session.mouseUp(data.x, data.y, data.button);
  });

  // 5. Keyboard Interactivity Events
  socket.on('keyboard-type', async (data: { text: string }) => {
    await session.type(data.text);
  });

  socket.on('keyboard-press', async (data: { key: string }) => {
    await session.keyPress(data.key);
  });

  // 6. Scroll Event
  socket.on('scroll', async (data: { deltaX: number; deltaY: number }) => {
    await session.scroll(data.deltaX, data.deltaY);
  });

  // 7. Resize Event
  socket.on('resize', async (data: { width: number; height: number }) => {
    await session.resize(data.width, data.height);
  });

  // 8. Connection Disconnect - ALWAYS clean up resources to prevent server memory leaks
  socket.on('disconnect', async () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const activeSession = activeSessions.get(socket.id);
    if (activeSession) {
      await activeSession.stop();
      activeSessions.delete(socket.id);
    }
  });
});

// Start listening
httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Remote Browser Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});

// Process-wide termination handlers to ensure no headless Chromium processes are orphaned
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Stopping all active browser sessions...');
  for (const [id, session] of activeSessions.entries()) {
    await session.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Stopping all active browser sessions...');
  for (const [id, session] of activeSessions.entries()) {
    await session.stop();
  }
  process.exit(0);
});

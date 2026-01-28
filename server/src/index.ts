import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupSocketHandlers } from './socket/SocketHandler.js';
import { ServerToClientEvents, ClientToServerEvents } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: isProduction ? undefined : {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
});

if (!isProduction) {
  app.use(cors());
}
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files in production
if (isProduction) {
  const clientDistPath = join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
}

setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${isProduction ? 'production' : 'development'} mode`);
});

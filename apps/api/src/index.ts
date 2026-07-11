import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import type { HealthCheckResponse } from '@nfs/shared';
import { authRouter } from './auth/router.js';
import { filesRouter } from './files/router.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', filesRouter);

app.get('/api/health', (_req, res) => {
  const body: HealthCheckResponse = {
    status: 'ok',
    service: 'nfs-api',
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

app.listen(port, () => {
  console.log(`[nfs-api] hello world — listening on http://localhost:${port}`);
});

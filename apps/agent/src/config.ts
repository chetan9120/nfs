import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';

// AGENT_HOME isolates one agent "instance" (its SQLite cache + downloaded file
// content) from another — used to run two simulated devices side by side in tests.
const agentHome = process.env.AGENT_HOME ?? path.join(os.homedir(), '.nfs-agent');

export const config = {
  apiBaseUrl: process.env.NFS_API_URL ?? 'http://localhost:4000',
  agentHome,
  dbPath: path.join(agentHome, 'agent.db'),
  filesDir: path.join(agentHome, 'files'),
  pollIntervalMs: Number(process.env.AGENT_POLL_INTERVAL_MS) || 30_000,
  // Deterministically simulates a dead endpoint / unreachable network for testing,
  // instead of actually taking the OS offline.
  forceOffline: process.env.AGENT_FORCE_OFFLINE === '1',
};

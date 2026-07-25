import { config } from './config.js';
import { flushOutbox } from './outbox.js';
import { reconcile } from './reconcile.js';
import { connectSocket } from './socket.js';

// The continuous background-service mode: live push via Socket.IO for low-latency
// updates, plus a periodic reconciliation poll as a fallback for anything missed
// while the socket was disconnected (flaky wifi, sleep/wake, etc).
export async function runDaemon(): Promise<void> {
  const runCycle = async (trigger: string) => {
    const flush = await flushOutbox();
    const pull = await reconcile();
    console.log(
      `[${new Date().toISOString()}] sync cycle (${trigger}): ` +
        `outbox synced=${flush.synced} offline=${flush.offline} | ` +
        `pulled conversations=${pull.conversationsTouched} messages=${pull.messagesReceived} files=${pull.filesDownloaded} offline=${pull.offline}`,
    );
  };

  if (config.forceOffline) {
    console.log('[agent] AGENT_FORCE_OFFLINE=1 — daemon running in offline mode, only queuing local actions.');
  } else {
    const socket = connectSocket((event) => {
      console.log(`[socket] ${event}`);
      if (event === 'connect' || event === 'file_received' || event === 'message_added' || event === 'status_changed') {
        void runCycle(`socket:${event}`);
      }
    });
    process.on('SIGINT', () => {
      socket.disconnect();
      process.exit(0);
    });
  }

  await runCycle('startup');
  setInterval(() => void runCycle('poll'), config.pollIntervalMs);
}

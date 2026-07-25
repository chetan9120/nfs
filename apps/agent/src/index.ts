import { login, register } from './auth.js';
import { config } from './config.js';
import { runDaemon } from './daemon.js';
import { enqueuePostMessage, flushOutbox, resendClientId } from './outbox.js';
import { reconcile } from './reconcile.js';
import { statusSnapshot } from './status.js';

function flag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'register': {
      const res = await register(
        flag(args, 'email')!,
        flag(args, 'password')!,
        flag(args, 'name')!,
        flag(args, 'device'),
      );
      console.log(JSON.stringify({ user: res.user, device: res.device }, null, 2));
      break;
    }

    case 'login': {
      const res = await login(flag(args, 'email')!, flag(args, 'password')!, flag(args, 'device'));
      console.log(JSON.stringify({ user: res.user, device: res.device }, null, 2));
      break;
    }

    case 'pull': {
      const res = await reconcile();
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'send': {
      const [conversationId, body] = args;
      if (!conversationId || !body) {
        console.error('usage: send <conversationId> <body> [--client-id <id>]');
        process.exit(1);
      }
      const clientId = enqueuePostMessage(conversationId, body, flag(args, 'client-id'));
      console.log(`queued locally with clientId=${clientId}`);
      const flushResult = await flushOutbox();
      console.log(JSON.stringify(flushResult, null, 2));
      break;
    }

    case 'flush': {
      const res = await flushOutbox();
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'resend': {
      const res = await resendClientId(flag(args, 'conversation')!, flag(args, 'body')!, flag(args, 'client-id')!);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'status': {
      console.log(JSON.stringify(statusSnapshot(), null, 2));
      break;
    }

    case 'daemon': {
      await runDaemon();
      break;
    }

    default:
      console.error(
        'usage: agent <register|login|pull|send|flush|resend|status|daemon> [...args]\n' +
          `  (AGENT_HOME=${config.agentHome}, API=${config.apiBaseUrl}, offline=${config.forceOffline})`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

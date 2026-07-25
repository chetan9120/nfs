import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';
import { emitToUsers } from '../realtime/socket.js';
import { storageKeyForHash, storageProvider } from '../storage/index.js';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } });

export const filesRouter = Router();

const STATUS_RANK: Record<string, number> = { PENDING: 0, DELIVERED: 1, OPENED: 2, DOWNLOADED: 3 };

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const conversationInclude = {
  file: true,
  participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
  invites: true,
  messages: { orderBy: { createdAt: 'asc' as const } },
};

async function fetchConversation(conversationId: string) {
  return prisma.conversation.findUnique({ where: { id: conversationId }, include: conversationInclude });
}

function participantIds(conversation: { participants: { userId: string }[] }): string[] {
  return conversation.participants.map((p) => p.userId);
}

// Advances a participant's status forward only (PENDING -> DELIVERED -> OPENED -> DOWNLOADED), never regresses.
async function advanceParticipantStatus(
  conversationId: string,
  userId: string,
  target: 'DELIVERED' | 'OPENED' | 'DOWNLOADED',
) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant || STATUS_RANK[participant.status] >= STATUS_RANK[target]) {
    return participant;
  }

  const timestampField = target === 'DELIVERED' ? 'deliveredAt' : target === 'OPENED' ? 'openedAt' : 'downloadedAt';
  const updated = await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { status: target, [timestampField]: new Date() },
  });

  const conversation = await fetchConversation(conversationId);
  if (conversation) {
    emitToUsers(participantIds(conversation), 'status_changed', {
      conversationId,
      userId,
      status: updated.status,
      deliveredAt: updated.deliveredAt,
      openedAt: updated.openedAt,
      downloadedAt: updated.downloadedAt,
    });
  }

  return updated;
}

async function requireParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

filesRouter.post(
  '/files/send',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    const senderId = req.userId!;
    const file = req.file;
    const { recipientEmail, message } = req.body ?? {};

    if (!file) {
      res.status(400).json({ error: 'file is required (multipart field "file")' });
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      res.status(400).json({ error: 'recipientEmail is required' });
      return;
    }

    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = storageKeyForHash(hash);

    let fileRecord = await prisma.file.findUnique({ where: { hash } });
    if (!fileRecord) {
      fileRecord = await prisma.file.create({
        data: {
          hash,
          size: file.size,
          mimeType: file.mimetype,
          originalName: file.originalname,
          uploaderId: senderId,
        },
      });
    }

    const existingLocation = await prisma.fileLocation.findUnique({
      where: { fileId_provider: { fileId: fileRecord.id, provider: 'LOCAL_DISK' } },
    });
    if (!existingLocation) {
      await storageProvider.save(storageKey, file.buffer);
      await prisma.fileLocation.create({
        data: { fileId: fileRecord.id, provider: 'LOCAL_DISK', storageKey },
      });
    }

    const conversation = await prisma.conversation.upsert({
      where: { fileId: fileRecord.id },
      create: { fileId: fileRecord.id },
      update: {},
    });

    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId: senderId } },
      create: { conversationId: conversation.id, userId: senderId, role: 'OWNER' },
      update: {},
    });

    const recipientUser = await prisma.user.findUnique({ where: { email: recipientEmail } });
    let recipientStatus: 'existing_user' | 'invited';

    if (recipientUser) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId: recipientUser.id } },
        create: {
          conversationId: conversation.id,
          userId: recipientUser.id,
          role: 'RECIPIENT',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
        update: {},
      });
      recipientStatus = 'existing_user';
    } else {
      await prisma.invite.upsert({
        where: { email_conversationId: { email: recipientEmail, conversationId: conversation.id } },
        create: { email: recipientEmail, conversationId: conversation.id, invitedById: senderId },
        update: {},
      });
      recipientStatus = 'invited';
    }

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    const systemMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        type: 'SYSTEM',
        body: `${sender?.displayName ?? 'Someone'} sent ${file.originalname}`,
      },
    });

    if (typeof message === 'string' && message.trim().length > 0) {
      await prisma.message.create({
        data: { conversationId: conversation.id, senderId, type: 'TEXT', body: message },
      });
    }

    const fullConversation = await fetchConversation(conversation.id);

    if (fullConversation) {
      const recipientIds = recipientUser ? [recipientUser.id] : [];
      if (recipientIds.length > 0) {
        emitToUsers(recipientIds, 'file_received', { conversation: fullConversation });
        emitToUsers(recipientIds, 'status_changed', {
          conversationId: conversation.id,
          userId: recipientUser!.id,
          status: 'DELIVERED',
          deliveredAt: new Date(),
        });
      }
      emitToUsers(participantIds(fullConversation), 'message_added', {
        conversationId: conversation.id,
        messages: fullConversation.messages,
      });
    }

    res.status(201).json({
      file: {
        id: fileRecord.id,
        hash: fileRecord.hash,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        originalName: fileRecord.originalName,
        deduplicated: Boolean(existingLocation),
      },
      conversation: fullConversation,
      recipient: { email: recipientEmail, status: recipientStatus },
      message: systemMessage,
    });
  },
);

// Delta sync for offline-first clients (the desktop agent): returns only conversations
// touched since the given cursor — new conversations, new messages, or participant
// status changes — instead of the full `mine` list every poll.
filesRouter.get('/sync/updates', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const sinceParam = req.query.since;
  const since =
    typeof sinceParam === 'string' && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : new Date(0);
  const serverTime = new Date();

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId } },
      OR: [
        { createdAt: { gt: since } },
        { messages: { some: { createdAt: { gt: since } } } },
        {
          participants: {
            some: {
              OR: [{ deliveredAt: { gt: since } }, { openedAt: { gt: since } }, { downloadedAt: { gt: since } }],
            },
          },
        },
      ],
    },
    include: conversationInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ conversations, serverTime: serverTime.toISOString() });
});

filesRouter.get('/conversations/mine', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: conversationInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ conversations });
});

filesRouter.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const participant = await requireParticipant(id, userId);
  if (!participant) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  await advanceParticipantStatus(id, userId, 'OPENED');

  const conversation = await fetchConversation(id);
  res.json({ conversation });
});

filesRouter.post('/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { body, clientId } = req.body ?? {};

  const participant = await requireParticipant(id, userId);
  if (!participant) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  if (typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'body is required' });
    return;
  }

  const hasClientId = typeof clientId === 'string' && clientId.length > 0;

  // Lets an offline-queued send be safely retried after an ambiguous network
  // failure (e.g. the server received it but the response was lost) — replaying
  // the same clientId is a no-op instead of creating a duplicate message.
  if (hasClientId) {
    const existing = await prisma.message.findUnique({ where: { clientId } });
    if (existing) {
      const conversation = await fetchConversation(id);
      res.status(200).json({ conversation, deduplicated: true });
      return;
    }
  }

  await prisma.message.create({
    data: { conversationId: id, senderId: userId, type: 'TEXT', body, clientId: hasClientId ? clientId : undefined },
  });

  const conversation = await fetchConversation(id);
  if (conversation) {
    emitToUsers(participantIds(conversation), 'message_added', {
      conversationId: id,
      messages: conversation.messages,
    });
  }

  res.status(201).json({ conversation, deduplicated: false });
});

filesRouter.get('/files/:fileId/download', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { conversation: true, locations: true },
  });
  if (!file || !file.conversation) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const participant = await requireParticipant(file.conversation.id, userId);
  if (!participant) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const location = file.locations.find((l) => l.provider === 'LOCAL_DISK');
  if (!location) {
    res.status(404).json({ error: 'File content not available' });
    return;
  }

  const buffer = await storageProvider.get(location.storageKey);

  await advanceParticipantStatus(file.conversation.id, userId, 'DOWNLOADED');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.send(buffer);
});

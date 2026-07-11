import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';
import { storageKeyForHash, storageProvider } from '../storage/index.js';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } });

export const filesRouter = Router();

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
        create: { conversationId: conversation.id, userId: recipientUser.id, role: 'RECIPIENT' },
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

    res.status(201).json({
      file: {
        id: fileRecord.id,
        hash: fileRecord.hash,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        originalName: fileRecord.originalName,
        deduplicated: Boolean(existingLocation),
      },
      conversation: { id: conversation.id },
      recipient: { email: recipientEmail, status: recipientStatus },
      message: systemMessage,
    });
  },
);

filesRouter.get('/conversations/mine', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      file: true,
      participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      invites: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ conversations });
});

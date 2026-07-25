import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';
import {
  hashRefreshToken,
  refreshTokenMatchesHash,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens.js';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_HASH_ROUNDS = 12;
const DEVICE_TYPES = ['WEB', 'DESKTOP', 'MOBILE'] as const;
type DeviceTypeValue = (typeof DEVICE_TYPES)[number];

export const authRouter = Router();

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveDeviceType(deviceType: unknown): DeviceTypeValue {
  return typeof deviceType === 'string' && (DEVICE_TYPES as readonly string[]).includes(deviceType)
    ? (deviceType as DeviceTypeValue)
    : 'WEB';
}

async function issueTokensForDevice(userId: string, deviceId: string) {
  const accessToken = signAccessToken({ sub: userId, deviceId });
  const refreshToken = signRefreshToken({ sub: userId, deviceId });
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      refreshTokenHash,
      refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      lastSeenAt: new Date(),
    },
  });

  return { accessToken, refreshToken };
}

// Resolves any pending Invites for this email into real ConversationParticipant rows.
async function claimPendingInvites(userId: string, email: string): Promise<void> {
  const invites = await prisma.invite.findMany({
    where: { email, claimedAt: null },
  });

  for (const invite of invites) {
    await prisma.$transaction([
      prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: invite.conversationId, userId } },
        create: { conversationId: invite.conversationId, userId, role: 'RECIPIENT' },
        update: {},
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { claimedById: userId, claimedAt: new Date() },
      }),
    ]);
  }
}

authRouter.post('/register', async (req, res) => {
  const { email, password, displayName, deviceName, deviceType } = req.body ?? {};

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    return;
  }
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    res.status(400).json({ error: 'displayName is required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  await claimPendingInvites(user.id, email);

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name: typeof deviceName === 'string' ? deviceName : 'Unknown device',
      type: resolveDeviceType(deviceType),
    },
  });

  const tokens = await issueTokensForDevice(user.id, device.id);

  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
    device: { id: device.id, name: device.name },
    ...tokens,
  });
});

authRouter.post('/login', async (req, res) => {
  const { email, password, deviceName, deviceType } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== 'string') {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name: typeof deviceName === 'string' ? deviceName : 'Unknown device',
      type: resolveDeviceType(deviceType),
    },
  });

  const tokens = await issueTokensForDevice(user.id, device.id);

  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
    device: { id: device.id, name: device.name },
    ...tokens,
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== 'string') {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const device = await prisma.device.findUnique({ where: { id: payload.deviceId } });
  if (
    !device ||
    device.userId !== payload.sub ||
    !device.refreshTokenHash ||
    !device.refreshTokenExpiresAt ||
    device.refreshTokenExpiresAt < new Date()
  ) {
    res.status(401).json({ error: 'Refresh token no longer valid for this device' });
    return;
  }

  const matches = refreshTokenMatchesHash(refreshToken, device.refreshTokenHash);
  if (!matches) {
    res.status(401).json({ error: 'Refresh token no longer valid for this device' });
    return;
  }

  const tokens = await issueTokensForDevice(device.userId, device.id);
  res.json(tokens);
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  await prisma.device.update({
    where: { id: req.deviceId },
    data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
  });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
    deviceId: req.deviceId,
  });
});

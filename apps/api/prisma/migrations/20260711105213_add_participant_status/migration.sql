-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'DELIVERED', 'OPENED', 'DOWNLOADED');

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "downloadedAt" TIMESTAMP(3),
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING';

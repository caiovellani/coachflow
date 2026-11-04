-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "whatsappLinkCode" TEXT,
ADD COLUMN     "whatsappLinkCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "whatsappUserId" TEXT;

-- AlterTable
ALTER TABLE "MessageEvent" ADD COLUMN     "whatsappUserId" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Client_whatsappUserId_key" ON "Client"("whatsappUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_whatsappLinkCode_key" ON "Client"("whatsappLinkCode");


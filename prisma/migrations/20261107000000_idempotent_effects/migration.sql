-- AlterTable
ALTER TABLE "ExerciseLog" ADD COLUMN     "sourceKey" TEXT;

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "sourceKey" TEXT;

-- AlterTable
ALTER TABLE "MessageEvent" ADD COLUMN     "lastAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLog_sourceKey_key" ON "ExerciseLog"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_sourceKey_key" ON "Alert"("sourceKey");


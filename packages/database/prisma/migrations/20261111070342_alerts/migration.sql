-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'WEEKLY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "alertEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertPush" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "city" TEXT,
    "state" CHAR(2),
    "zipCode" TEXT,
    "radiusMiles" INTEGER NOT NULL DEFAULT 25,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationLabel" TEXT,
    "frequency" "AlertFrequency" NOT NULL,
    "lastDigestAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_topic_frequency_idx" ON "alerts"("topic", "frequency");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

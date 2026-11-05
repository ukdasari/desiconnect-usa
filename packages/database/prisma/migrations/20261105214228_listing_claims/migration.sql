-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "listing_claims" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "claimantId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verification" TEXT,
    "reviewNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_claims_status_createdAt_idx" ON "listing_claims"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listing_claims_listingId_idx" ON "listing_claims"("listingId");

-- CreateIndex
CREATE INDEX "listing_claims_claimantId_idx" ON "listing_claims"("claimantId");

-- AddForeignKey
ALTER TABLE "listing_claims" ADD CONSTRAINT "listing_claims_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_claims" ADD CONSTRAINT "listing_claims_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_claims" ADD CONSTRAINT "listing_claims_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_claims" ADD CONSTRAINT "listing_claims_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "coversFee" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."Checkout" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "coversFee" BOOLEAN NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "consumoIds" TEXT[],
    "consumosAmount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_mpPaymentId_key" ON "public"."Checkout"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_paymentId_key" ON "public"."Checkout"("paymentId");

-- CreateIndex
CREATE INDEX "Checkout_memberId_status_idx" ON "public"."Checkout"("memberId", "status");

-- AddForeignKey
ALTER TABLE "public"."Checkout" ADD CONSTRAINT "Checkout_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Checkout" ADD CONSTRAINT "Checkout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

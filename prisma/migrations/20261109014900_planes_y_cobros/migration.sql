-- AlterTable
ALTER TABLE "public"."Consumption" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "gymName" TEXT NOT NULL DEFAULT 'Mi gimnasio',
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "blockOverdue" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "classesPerWeek" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "planName" TEXT,
    "feeAmount" INTEGER NOT NULL,
    "consumosAmount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_memberId_period_idx" ON "public"."Payment"("memberId", "period");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "public"."Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Consumption_memberId_paymentId_idx" ON "public"."Consumption"("memberId", "paymentId");

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consumption" ADD CONSTRAINT "Consumption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

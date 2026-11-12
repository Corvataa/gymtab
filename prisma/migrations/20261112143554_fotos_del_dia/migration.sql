-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "photoDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "public"."GymPhoto" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "caption" TEXT,
    "image" TEXT NOT NULL,
    "thumb" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymPhoto_date_idx" ON "public"."GymPhoto"("date");


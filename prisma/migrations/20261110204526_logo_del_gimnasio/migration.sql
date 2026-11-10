-- AlterTable
ALTER TABLE "public"."Settings" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "logoVersion" INTEGER NOT NULL DEFAULT 0;

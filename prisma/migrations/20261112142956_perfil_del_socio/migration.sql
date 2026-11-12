-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "avatarVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "nickname" TEXT;


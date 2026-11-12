-- Antes de exigir emails únicos: pasarlos a minúsculas, vaciar los vacíos y
-- dejar el email solo en el socio más antiguo si hubiera repetidos.
UPDATE "Member" SET "email" = NULLIF(lower(trim("email")), '');
UPDATE "Member" m SET "email" = NULL
WHERE "email" IS NOT NULL AND EXISTS (
  SELECT 1 FROM "Member" o WHERE o."email" = m."email" AND (o."createdAt" < m."createdAt" OR (o."createdAt" = m."createdAt" AND o."id" < m."id"))
);

-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "activationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "legacy" JSONB,
ADD COLUMN     "pendingDni" TEXT,
ADD COLUMN     "pendingPinHash" TEXT,
ALTER COLUMN "dni" DROP NOT NULL,
ALTER COLUMN "pinHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "public"."Member"("email");


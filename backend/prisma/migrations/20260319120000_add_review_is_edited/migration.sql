-- Align reviews table with Prisma schema (isEdited, editedAt)
ALTER TABLE "reviews" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reviews" ADD COLUMN "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "restaurant_members" ADD COLUMN     "directlyAssigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;

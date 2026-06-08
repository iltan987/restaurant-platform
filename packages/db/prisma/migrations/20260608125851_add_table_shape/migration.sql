-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('SQUARE', 'RECT', 'ROUND');

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "shape" "TableShape" NOT NULL DEFAULT 'SQUARE';

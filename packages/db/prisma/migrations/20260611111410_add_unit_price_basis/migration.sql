-- CreateEnum
CREATE TYPE "UnitPriceBasis" AS ENUM ('AUTO', 'HIDE', 'PER_KG', 'PER_100G', 'PER_L', 'PER_100ML', 'PER_PIECE');

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "unitPriceBasis" "UnitPriceBasis" NOT NULL DEFAULT 'AUTO';

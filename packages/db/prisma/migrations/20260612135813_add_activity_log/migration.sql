-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RESTAURANT_CREATED', 'RESTAURANT_RENAMED', 'SLUG_CHANGED', 'STATUS_CHANGED', 'PLAN_CHANGED', 'ONBOARDING_CHANGED', 'CATEGORY_CREATED', 'CATEGORY_DELETED', 'MENU_ITEM_CREATED', 'MENU_ITEM_DELETED');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "type" "ActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_restaurantId_createdAt_idx" ON "activities"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

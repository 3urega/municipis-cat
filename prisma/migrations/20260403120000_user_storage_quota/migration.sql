-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" "UserPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN "storage_used" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT;

-- AlterTable
ALTER TABLE "media" ADD COLUMN "size_bytes" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

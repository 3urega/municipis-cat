-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reward_ads_daily_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reward_ads_daily_utc_date" TEXT,
ADD COLUMN     "reward_ads_watched" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reward_unlock_blocks" INTEGER NOT NULL DEFAULT 0;

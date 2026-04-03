-- CreateTable
CREATE TABLE "google_play_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "purchase_token" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "order_id" TEXT,
    "expiry_time" TIMESTAMPTZ(6),
    "auto_renewing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_play_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_play_subscriptions_purchase_token_key" ON "google_play_subscriptions"("purchase_token");

-- CreateIndex
CREATE INDEX "google_play_subscriptions_user_id_idx" ON "google_play_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "google_play_subscriptions" ADD CONSTRAINT "google_play_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "referralRewards" JSONB NOT NULL,
    "spinWheelCooldownHours" REAL NOT NULL,
    "spinWheelProbabilities" JSONB NOT NULL,
    "energyPrice" INTEGER NOT NULL,
    "healthPrice" INTEGER NOT NULL,
    "upgradables" JSONB NOT NULL,
    "upgradeCosts" JSONB NOT NULL,
    "upgradablesMaxLevel" INTEGER NOT NULL,
    "coinToTonRate" INTEGER NOT NULL,
    "minimumCoinWithdrawal" INTEGER NOT NULL,
    "maximumCoinWithdrawal" INTEGER NOT NULL,
    "channels" JSONB NOT NULL,
    "rewardForSubscription" INTEGER NOT NULL
);

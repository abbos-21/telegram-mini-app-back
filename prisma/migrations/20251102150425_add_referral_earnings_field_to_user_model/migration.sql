-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "totalCoins" REAL NOT NULL DEFAULT 0,
    "coins" REAL NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "miningRate" REAL NOT NULL DEFAULT 0.01,
    "referredById" INTEGER,
    "rewardedLevels" TEXT NOT NULL DEFAULT '[]',
    "referralEarnings" REAL NOT NULL DEFAULT 0,
    "lastMiningTick" DATETIME,
    "isMining" BOOLEAN NOT NULL DEFAULT false,
    "tempCoins" REAL NOT NULL DEFAULT 0,
    "vaultCapacity" REAL NOT NULL DEFAULT 36,
    "currentHealth" REAL NOT NULL DEFAULT 3600,
    "maxHealth" REAL NOT NULL DEFAULT 3600,
    "currentEnergy" REAL NOT NULL DEFAULT 3600,
    "maxEnergy" REAL NOT NULL DEFAULT 3600,
    "healthPerSecond" REAL NOT NULL DEFAULT 0.5,
    "energyPerSecond" REAL NOT NULL DEFAULT 1,
    "lastWheelSpin" DATETIME,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("coins", "createdAt", "currentEnergy", "currentHealth", "energyPerSecond", "firstName", "healthPerSecond", "id", "isBot", "isMining", "languageCode", "lastMiningTick", "lastName", "lastWheelSpin", "level", "maxEnergy", "maxHealth", "miningRate", "referredById", "rewardedLevels", "telegramId", "tempCoins", "totalCoins", "updatedAt", "username", "vaultCapacity") SELECT "coins", "createdAt", "currentEnergy", "currentHealth", "energyPerSecond", "firstName", "healthPerSecond", "id", "isBot", "isMining", "languageCode", "lastMiningTick", "lastName", "lastWheelSpin", "level", "maxEnergy", "maxHealth", "miningRate", "referredById", "rewardedLevels", "telegramId", "tempCoins", "totalCoins", "updatedAt", "username", "vaultCapacity" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

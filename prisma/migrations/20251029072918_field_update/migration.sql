/*
  Warnings:

  - You are about to drop the column `energyMax` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `healthMax` on the `User` table. All the data in the column will be lost.

*/
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
    "coins" REAL NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "miningStarted" DATETIME,
    "miningRate" REAL NOT NULL DEFAULT 0.01,
    "referredById" INTEGER,
    "lastMiningTick" DATETIME,
    "tempCoins" REAL NOT NULL DEFAULT 0,
    "vaultCapacity" REAL NOT NULL DEFAULT 60,
    "health" REAL NOT NULL DEFAULT 60,
    "maxHealth" REAL NOT NULL DEFAULT 60,
    "energy" REAL NOT NULL DEFAULT 60,
    "maxEnergy" REAL NOT NULL DEFAULT 60,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("coins", "createdAt", "energy", "firstName", "health", "id", "isBot", "languageCode", "lastMiningTick", "lastName", "level", "miningRate", "miningStarted", "referredById", "telegramId", "tempCoins", "updatedAt", "username", "vaultCapacity") SELECT "coins", "createdAt", "energy", "firstName", "health", "id", "isBot", "languageCode", "lastMiningTick", "lastName", "level", "miningRate", "miningStarted", "referredById", "telegramId", "tempCoins", "updatedAt", "username", "vaultCapacity" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to alter the column `telegramId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" BIGINT NOT NULL,
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
    "healthMax" REAL NOT NULL DEFAULT 60,
    "energy" REAL NOT NULL DEFAULT 60,
    "energyMax" REAL NOT NULL DEFAULT 60,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("coins", "createdAt", "energy", "energyMax", "firstName", "health", "healthMax", "id", "isBot", "languageCode", "lastMiningTick", "lastName", "level", "miningRate", "miningStarted", "referredById", "telegramId", "tempCoins", "updatedAt", "username", "vaultCapacity") SELECT "coins", "createdAt", "energy", "energyMax", "firstName", "health", "healthMax", "id", "isBot", "languageCode", "lastMiningTick", "lastName", "level", "miningRate", "miningStarted", "referredById", "telegramId", "tempCoins", "updatedAt", "username", "vaultCapacity" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "./generated/prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      id: 1,
    },
  });

  if (!user) {
    console.log("User with id 1 not found");
    return;
  }

  const amountCoins = faker.number.int({ min: 50, max: 500 });
  const amountTon = amountCoins / 10;
  const targetAddress = faker.finance.ethereumAddress();

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amountCoins,
      amountTon,
      targetAddress,
      status: "PENDING",
      txHash: faker.string.uuid(),
      errorMessage: faker.lorem.sentence(),
    },
  });

  console.log("Fake withdrawal created:", withdrawal);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

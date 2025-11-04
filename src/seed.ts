import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "./generated/prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  // Get the user with id 1
  const user = await prisma.user.findUnique({
    where: {
      id: 1,
    },
  });

  if (!user) {
    console.log("User with id 1 not found");
    return;
  }

  // Create a fake withdrawal for the user
  const amountCoins = faker.number.int({ min: 50, max: 500 }); // Use faker.number.int() for random integer
  const amountTon = amountCoins / 10; // Convert coins to TON using the same conversion rate as in your code
  const targetAddress = faker.finance.ethereumAddress();

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amountCoins,
      amountTon,
      targetAddress,
      status: "PENDING", // You can change this to 'COMPLETED' or 'FAILED' if needed
      txHash: faker.string.uuid(), // Use faker.string.uuid() to generate a random UUID
      errorMessage: faker.lorem.sentence(),
    },
  });

  console.log("Fake withdrawal created:", withdrawal);
}

// Call the main function to seed the database
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

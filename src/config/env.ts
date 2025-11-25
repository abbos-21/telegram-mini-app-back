import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const WEB_APP_URL = process.env.WEB_APP_URL!;
export const PORT = process.env.PORT!;
export const BOT_USERNAME = process.env.BOT_USERNAME!;
export const HEALTH_REWARD_SECRET = process.env.HEALTH_REWARD_SECRET!;
export const ENERGY_REWARD_SECRET = process.env.ENERGY_REWARD_SECRET!;
export const TASK_REWARD_SECRET = process.env.TASK_REWARD_SECRET!;
export const HOT_WALLET_MNEMONIC = process.env.HOT_WALLET_MNEMONIC!;
export const TON_API_ENDPOINT = process.env.TON_API_ENDPOINT!;
export const TON_API_TOKEN = process.env.TON_API_TOKEN!;

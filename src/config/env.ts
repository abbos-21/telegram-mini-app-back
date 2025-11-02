import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const JWT_SECRET = process.env.JWT_SECRET!;
export const WEB_APP_URL = process.env.WEB_APP_URL!;
export const PORT = process.env.PORT!;
export const BOT_USERNAME = process.env.BOT_USERNAME!;
export const HEALTH_REWARD_SECRET = process.env.HEALTH_REWARD_SECRET!;
export const ENERGY_REWARD_SECRET = process.env.ENERGY_REWARD_SECRET!;

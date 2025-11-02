import CryptoJS from "crypto-js";
import { BOT_TOKEN } from "../config/env";

export function verifyTelegramAuth(initData: string) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing in .env");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false };

  params.delete("hash");

  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = CryptoJS.HmacSHA256("WebAppData", BOT_TOKEN);
  const computedHash = CryptoJS.HmacSHA256(sorted, secret).toString(
    CryptoJS.enc.Hex
  );

  const valid = computedHash === hash;
  const userData = Object.fromEntries(params);
  const user = userData.user ? JSON.parse(userData.user) : undefined;

  return { valid, user };
}

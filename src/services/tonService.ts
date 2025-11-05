import { TonClient, WalletContractV4, internal, type SendMode } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, toNano } from "@ton/core";

// 1. Configuration
import {
  TON_API_ENDPOINT,
  TON_API_TOKEN,
  HOT_WALLET_MNEMONIC,
} from "../config/env";

if (!TON_API_ENDPOINT || !HOT_WALLET_MNEMONIC) {
  throw new Error("Missing TON_API_ENDPOINT or HOT_WALLET_MNEMONIC from .env");
}

// 2. TON Client Initialization
const client = new TonClient({
  endpoint: TON_API_ENDPOINT,
  apiKey: TON_API_TOKEN,
});

// 3. Hot Wallet Loading Function
async function getHotWallet() {
  const key = await mnemonicToWalletKey(HOT_WALLET_MNEMONIC.split(" "));
  const wallet = WalletContractV4.create({
    publicKey: key.publicKey,
    workchain: 0, // 0 for basechain
  });

  // Open the wallet contract with the client
  const walletContract = client.open(wallet);
  return { walletContract, key };
}

/**
 * Sends a TON transaction.
 * @param targetAddress The recipient's TON wallet address.
 * @param amountTon The amount of TON to send (e.g., 0.5).
 * @param message An optional message/comment for the transaction.
 * @returns The transaction hash (boc).
 */
export async function sendTonTransaction({
  targetAddress,
  amountTon,
  message = "Withdrawal",
}: {
  targetAddress: string;
  amountTon: number;
  message?: string;
}) {
  try {
    // 4. Load wallet and keys
    const { walletContract, key } = await getHotWallet();
    const seqno = await walletContract.getSeqno();

    // 5. Create the transfer
    const transfer = walletContract.createTransfer({
      seqno: seqno,
      secretKey: key.secretKey,
      messages: [
        internal({
          to: Address.parse(targetAddress), // Use Address.parse for validation
          value: toNano(amountTon.toString()), // Convert TON to nanoTON
          body: message,
          bounce: false, // Don't bounce (send back) if a non-existent wallet
        }),
      ],
      // SendMode 3 = Pay gas separately + Ignore errors
      sendMode: 3 as SendMode,
    });

    // 6. Send the transaction
    await walletContract.send(transfer);

    return transfer; // You can return the transfer cell or other info
  } catch (error) {
    console.error("Error in sendTonTransaction:", error);
    // Re-throw the error to be handled by the controller
    throw error;
  }
}

/**
 * Helper to validate a TON address.
 * Throws an error if invalid.
 */
export function validateTonAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch (error) {
    return false;
  }
}

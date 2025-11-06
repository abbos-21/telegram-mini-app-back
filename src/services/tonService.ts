import { mnemonicToWalletKey } from "@ton/crypto";
import {
  comment,
  internal,
  toNano,
  TonClient,
  WalletContractV5R1,
  WalletContractV4,
} from "@ton/ton";
import { SendMode } from "@ton/core";

import {
  TON_API_ENDPOINT,
  TON_API_TOKEN,
  HOT_WALLET_MNEMONIC,
} from "../config/env";

export async function sendTonTransaction(
  targetAddress: string,
  amountTon: number,
  message?: string
): Promise<{ txHash: string }> {
  const tonClient = new TonClient({
    endpoint: TON_API_ENDPOINT,
    apiKey: TON_API_TOKEN,
  });

  const mnemonic = HOT_WALLET_MNEMONIC.split(" ");
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

  const walletContract = WalletContractV4.create({
    workchain: 0,
    publicKey,
  });

  const wallet = tonClient.open(walletContract);
  const seqno = await wallet.getSeqno();

  // Prepare the transfer (we’ll sign it manually)
  const transfer = wallet.createTransfer({
    seqno,
    secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [
      internal({
        to: targetAddress,
        value: toNano(amountTon),
        body: comment(message ?? "Withdrawal from BrunoPlay"),
      }),
    ],
  });

  // Calculate the transaction hash (base64)
  const txHash = transfer.hash().toString("base64");

  // Actually send the message
  await tonClient.sendExternalMessage(walletContract, transfer);

  // Return hash
  return { txHash };
}

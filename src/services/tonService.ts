import { mnemonicToWalletKey } from "@ton/crypto";
import {
  comment,
  internal,
  toNano,
  TonClient,
  WalletContractV5R1,
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
) {
  const tonClient = new TonClient({
    endpoint: TON_API_ENDPOINT,
    apiKey: TON_API_TOKEN,
  });
  const mnemonic = HOT_WALLET_MNEMONIC.split(" ");
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);
  const walletContract = WalletContractV5R1.create({
    workchain: 0,
    walletId: { networkGlobalId: -3 },
    publicKey,
  });
  const wallet = tonClient.open(walletContract);
  const seqno = await wallet.getSeqno();
  await wallet.sendTransfer({
    seqno,
    secretKey,
    messages: [
      internal({
        to: targetAddress,
        value: toNano(amountTon),
        body: comment(message || "Withdrawal from BrunoPlay"),
      }),
    ],
    sendMode: SendMode.PAY_GAS_SEPARATELY,
  });
}

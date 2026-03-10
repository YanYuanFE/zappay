import { Hono } from "hono";
import { prisma } from "../db.js";
import { privy, verifyToken } from "../middleware/auth.js";

const wallet = new Hono();

// POST /wallet-create
wallet.post("/wallet-create", async (c) => {
  const authHeader = c.req.header("authorization");
  const userId = await verifyToken(authHeader);
  if (!userId) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Check if user already has a wallet
  const existing = await prisma.userWallet.findUnique({
    where: { privy_user_id: userId },
  });

  if (existing) {
    return c.json({
      wallet: {
        id: existing.wallet_id,
        publicKey: existing.public_key,
        address: existing.address,
      },
      isNew: false,
    });
  }

  // Create new Starknet wallet via Privy
  const w = await privy.wallets().create({ chain_type: "starknet" });

  // Store in database
  await prisma.userWallet.create({
    data: {
      privy_user_id: userId,
      wallet_id: w.id,
      public_key: w.public_key as string,
      address: w.address,
    },
  });

  return c.json({
    wallet: {
      id: w.id,
      publicKey: w.public_key,
      address: w.address,
    },
    isNew: true,
  });
});

// POST /wallet-sign
wallet.post("/wallet-sign", async (c) => {
  const { walletId, hash } = await c.req.json();

  if (!walletId || !hash) {
    return c.json({ error: "walletId and hash required" }, 400);
  }

  const result = await privy
    .wallets()
    .rawSign(walletId, { params: { hash } });

  return c.json({ signature: result.signature });
});

export default wallet;

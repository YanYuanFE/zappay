import { StarkZap, mainnetTokens } from "starkzap";

export const sdk = new StarkZap({
  network: "mainnet",
  paymaster: {
    nodeUrl: "/api/paymaster",
  },
});

// Contract addresses (to be updated after deployment)
export const CONTRACTS = {
  paymentRouter: import.meta.env.VITE_PAYMENT_ROUTER_ADDRESS as string || "0x0",
};

// Re-export tokens for convenience
export const TOKENS = mainnetTokens;

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  OnboardStrategy,
  accountPresets,
  type WalletInterface,
} from "starkzap";
import { sdk } from "@/lib/starkzap";
import { setAuthTokenProvider } from "@/lib/db";

const API_PREFIX = "/api";
const WALLET_CACHE_KEY = "zappay_wallet";

interface WalletCredentials {
  id: string;
  publicKey: string;
}

function getCachedWallet(): WalletCredentials | null {
  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedWallet(data: WalletCredentials) {
  localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(data));
}

function clearCachedWallet() {
  localStorage.removeItem(WALLET_CACHE_KEY);
}

interface StarknetWalletContextType {
  wallet: WalletInterface | null;
  starknetAddress: string | null;
  connecting: boolean;
  error: string | null;
  connectStarknet: () => Promise<WalletInterface | null>;
}

const StarknetWalletContext = createContext<StarknetWalletContextType>({
  wallet: null,
  starknetAddress: null,
  connecting: false,
  error: null,
  connectStarknet: async () => null,
});

export function StarknetWalletProvider({ children }: { children: ReactNode }) {
  const { authenticated, getAccessToken } = usePrivy();

  // Inject Privy token provider into db.ts so all API calls are authenticated
  useEffect(() => {
    setAuthTokenProvider(getAccessToken);
  }, [getAccessToken]);

  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [starknetAddress, setStarknetAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectStarknet = useCallback(async () => {
    if (wallet) return wallet;

    setConnecting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      // Try cached wallet credentials first
      let walletData = getCachedWallet();

      if (!walletData) {
        // Create/get Starknet wallet via API
        const res = await fetch(`${API_PREFIX}/wallet-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create wallet");
        }

        const { wallet: data } = await res.json();
        walletData = { id: data.id, publicKey: data.publicKey };
        setCachedWallet(walletData);
      }

      // Connect via starkzap SDK with Privy signer
      const onboard = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        deploy: "never",
        accountPreset: accountPresets.argentXV050,
        privy: {
          resolve: async () => ({
            walletId: walletData.id,
            publicKey: walletData.publicKey,
            serverUrl: `${window.location.origin}${API_PREFIX}/wallet-sign`,
          }),
        },
        feeMode: "sponsored",
      });

      setWallet(onboard.wallet);
      setStarknetAddress(onboard.wallet.address);
      setConnecting(false);
      return onboard.wallet;
    } catch (err) {
      console.error("[ZapPay] connectStarknet error:", err);
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
      clearCachedWallet();
      setConnecting(false);
      return null;
    }
  }, [getAccessToken, wallet]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (authenticated && !wallet && !connecting) {
      connectStarknet();
    }
    if (!authenticated) {
      setWallet(null);
      setStarknetAddress(null);
      clearCachedWallet();
    }
  }, [authenticated]);

  return (
    <StarknetWalletContext.Provider
      value={{ wallet, starknetAddress, connecting, error, connectStarknet }}
    >
      {children}
    </StarknetWalletContext.Provider>
  );
}

export function useStarknetWallet() {
  return useContext(StarknetWalletContext);
}

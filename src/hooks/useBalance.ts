import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RpcProvider } from "starknet";

const provider = new RpcProvider({
  nodeUrl: "https://starknet-mainnet.infura.io/v3/4fb6afdca8f74fa6845f3bbe0387d5cb",
});

const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function fetchStrkBalance(address: string): Promise<string> {
  const result = await provider.callContract({
    contractAddress: STRK_ADDRESS,
    entrypoint: "balance_of",
    calldata: [address],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  const raw = low + (high << 128n);

  const whole = raw / 10n ** 18n;
  const frac = raw % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

export function useBalance(starknetAddress?: string | null) {
  const queryClient = useQueryClient();

  const { data: strk = null, isLoading: loading, error } = useQuery({
    queryKey: ["balance", starknetAddress],
    queryFn: () => fetchStrkBalance(starknetAddress!),
    enabled: !!starknetAddress,
    refetchInterval: 60_000,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["balance", starknetAddress] });
  }

  return {
    strk,
    loading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch balance") : null,
    refetch,
  };
}

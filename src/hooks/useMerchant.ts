import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { getMerchantByWallet, upsertMerchant, type Merchant } from "@/lib/db";

export function useMerchant() {
  const { starknetAddress } = useStarknetWallet();
  const queryClient = useQueryClient();

  const { data: merchant = null, isLoading: loading } = useQuery<Merchant | null>({
    queryKey: ["merchant", starknetAddress],
    queryFn: () => getMerchantByWallet(starknetAddress!),
    enabled: !!starknetAddress,
  });

  const saveMerchant = useCallback(
    async (data: { name: string; slug: string; description?: string }) => {
      if (!starknetAddress) return null;
      const m = await upsertMerchant({
        wallet_address: starknetAddress,
        ...data,
      });
      queryClient.setQueryData(["merchant", starknetAddress], m);
      return m;
    },
    [starknetAddress, queryClient],
  );

  return { merchant, loading, saveMerchant };
}

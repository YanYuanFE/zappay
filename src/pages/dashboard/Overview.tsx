import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBalance } from "@/hooks/useBalance";
import { useMerchant } from "@/hooks/useMerchant";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { listTransactions } from "@/lib/db";
import { sdk } from "@/lib/starkzap";
import { mainnetValidators, type Address, type PoolMember } from "starkzap";

const FEATURED_VALIDATORS = [
  mainnetValidators.KARNOT, mainnetValidators.BRAAVOS, mainnetValidators.AVNU,
  mainnetValidators.NETHERMIND, mainnetValidators.BINANCE, mainnetValidators.FIGMENT,
  mainnetValidators.PRAGMA, mainnetValidators.CARTRIDGE, mainnetValidators.CARBONABLE,
  mainnetValidators.P2P_ORG, mainnetValidators.NANSEN, mainnetValidators.TWINSTAKE,
  mainnetValidators.READY_PREV_ARGENT, mainnetValidators.KEPLR, mainnetValidators.STAKEFISH,
];

export default function DashboardOverview() {
  const { starknetAddress, wallet } = useStarknetWallet();
  const { strk, loading: balanceLoading } = useBalance(starknetAddress);
  const { merchant } = useMerchant();

  const { data: txns = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", merchant?.id],
    queryFn: () => listTransactions(merchant!.id),
    enabled: !!merchant,
  });

  const { data: pools = [] } = useQuery({
    queryKey: ["stakingPools"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        FEATURED_VALIDATORS.map(async (v) => {
          const stakerPools = await sdk.getStakerPools(v.stakerAddress);
          if (!stakerPools.length) return null;
          const firstPool = stakerPools[0]!;
          return { poolAddress: String(firstPool.poolContract), name: v.name };
        }),
      );
      const loaded: { poolAddress: string; name: string }[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) loaded.push(r.value);
      }
      return loaded;
    },
    staleTime: 5 * 60_000,
  });

  const { data: myStakes = [] } = useQuery({
    queryKey: ["myStakes", starknetAddress, pools.length],
    queryFn: async () => {
      if (!wallet || !pools.length) return [];
      const results = await Promise.allSettled(
        pools.map(async (pool) => {
          const position = await wallet.getPoolPosition(pool.poolAddress as Address);
          if (!position) return null;
          return { poolAddress: pool.poolAddress, position };
        }),
      );
      const stakes: { poolAddress: string; position: PoolMember }[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) stakes.push(r.value);
      }
      return stakes;
    },
    enabled: !!wallet && pools.length > 0,
    staleTime: 60_000,
  });

  const totalRewards = myStakes.reduce((sum, s) => {
    const r = s.position.rewards;
    // Amount may be a class instance or a plain object from react-query cache
    if (typeof r.toFormatted === "function") {
      const val = Number(r.toFormatted(true).replace(/,/g, ""));
      return sum + (isNaN(val) ? 0 : val);
    }
    // Plain object with baseValue
    const base = BigInt((r as any).baseValue ?? "0");
    const decimals = (r as any).decimals ?? 18;
    return sum + Number(base) / 10 ** decimals;
  }, 0);

  const totalReceived = txns.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownLeft className="size-4 text-emerald-500" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{strk ?? "0.00"} STRK</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Available in wallet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="size-4 text-accent" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {totalReceived.toFixed(2)} STRK
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {txns.length} transaction{txns.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-500" />
              Staking Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {totalRewards.toFixed(4)} STRK
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Earned from {myStakes.length} pool{myStakes.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : txns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No transactions yet. Create a payment code to get started.
            </div>
          ) : (
            <div className="divide-y">
              {txns.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      From {tx.payer_address.slice(0, 8)}...
                      {tx.payer_address.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                    +{tx.amount} {tx.token}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

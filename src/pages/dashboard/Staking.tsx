import { useState } from "react";
import {
  TrendingUp,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Coins,
  Gift,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sdk, TOKENS } from "@/lib/starkzap";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import {
  mainnetValidators,
  Amount,
  type Address,
  type Token,
  type PoolMember,
} from "starkzap";

const STRK_TOKEN = Object.values(TOKENS).find((t) => t.symbol === "STRK") as Token;

interface ValidatorPool {
  name: string;
  poolAddress: string;
  stakerAddress: string;
  logoUrl: string | null;
  totalStaked: string;
}

interface MyStake {
  validatorName: string;
  logoUrl: string | null;
  poolAddress: string;
  position: PoolMember;
}

const FEATURED_VALIDATORS = [
  mainnetValidators.KARNOT,
  mainnetValidators.BRAAVOS,
  mainnetValidators.AVNU,
  mainnetValidators.NETHERMIND,
  mainnetValidators.BINANCE,
  mainnetValidators.FIGMENT,
  mainnetValidators.PRAGMA,
  mainnetValidators.CARTRIDGE,
  mainnetValidators.CARBONABLE,
  mainnetValidators.P2P_ORG,
  mainnetValidators.NANSEN,
  mainnetValidators.TWINSTAKE,
  mainnetValidators.READY_PREV_ARGENT,
  mainnetValidators.KEPLR,
  mainnetValidators.STAKEFISH,
];

async function fetchPools(): Promise<ValidatorPool[]> {
  const results = await Promise.allSettled(
    FEATURED_VALIDATORS.map(async (v) => {
      const stakerPools = await sdk.getStakerPools(v.stakerAddress);
      if (!stakerPools.length) return null;
      const firstPool = stakerPools[0]!;
      return {
        name: v.name,
        poolAddress: String(firstPool.poolContract),
        stakerAddress: String(v.stakerAddress),
        logoUrl: v.logoUrl ? String(v.logoUrl) : null,
        totalStaked: firstPool.amount.toFormatted(true),
      } satisfies ValidatorPool;
    }),
  );

  const loaded: ValidatorPool[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      loaded.push(r.value);
    }
  }
  return loaded;
}

export default function Staking() {
  const { wallet, starknetAddress } = useStarknetWallet();
  const queryClient = useQueryClient();
  const [expandedPool, setExpandedPool] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [exiting, setExiting] = useState<string | null>(null);

  const { data: pools = [], isLoading: loading } = useQuery({
    queryKey: ["stakingPools"],
    queryFn: fetchPools,
    staleTime: 5 * 60_000,
  });

  const { data: myStakes = [], isLoading: stakesLoading } = useQuery({
    queryKey: ["myStakes", starknetAddress, pools.length],
    queryFn: async () => {
      if (!wallet || !pools.length) return [];
      const results = await Promise.allSettled(
        pools.map(async (pool) => {
          const position = await wallet.getPoolPosition(pool.poolAddress as Address);
          if (!position) return null;
          return {
            validatorName: pool.name,
            logoUrl: pool.logoUrl,
            poolAddress: pool.poolAddress,
            position,
          } satisfies MyStake;
        }),
      );

      const stakes: MyStake[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          stakes.push(r.value);
        }
      }
      return stakes;
    },
    enabled: !!wallet && pools.length > 0,
    staleTime: 60_000,
  });

  function refreshStakes() {
    queryClient.invalidateQueries({ queryKey: ["myStakes"] });
  }

  async function handleStake(pool: ValidatorPool) {
    if (!wallet || !starknetAddress || !stakeAmount || parseFloat(stakeAmount) <= 0) return;

    setStaking(true);

    try {
      const tx = await wallet.stake(
        pool.poolAddress as Address,
        Amount.parse(stakeAmount, STRK_TOKEN),
      );
      await tx.wait();
      toast.success(`Staked ${stakeAmount} STRK to ${pool.name}`, {
        description: `Tx: ${tx.hash.slice(0, 12)}...`,
        action: {
          label: "View on Voyager",
          onClick: () => window.open(`https://voyager.online/tx/${tx.hash}`, "_blank"),
        },
        duration: 10000,
      });
      setStakeAmount("");
      refreshStakes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Staking failed");
    } finally {
      setStaking(false);
    }
  }

  async function handleClaimRewards(stake: MyStake) {
    if (!wallet) return;
    setClaiming(stake.poolAddress);
    try {
      const tx = await wallet.claimPoolRewards(stake.poolAddress as Address);
      await tx.wait();
      toast.success(`Rewards claimed from ${stake.validatorName}`, {
        description: `Tx: ${tx.hash.slice(0, 12)}...`,
        action: {
          label: "View on Voyager",
          onClick: () => window.open(`https://voyager.online/tx/${tx.hash}`, "_blank"),
        },
        duration: 10000,
      });
      refreshStakes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(null);
    }
  }

  async function handleExitIntent(stake: MyStake) {
    if (!wallet) return;
    setExiting(stake.poolAddress);
    try {
      const tx = await wallet.exitPoolIntent(
        stake.poolAddress as Address,
        stake.position.staked,
      );
      await tx.wait();
      toast.success(`Unstake requested from ${stake.validatorName}`, {
        description: `Tx: ${tx.hash.slice(0, 12)}...`,
        action: {
          label: "View on Voyager",
          onClick: () => window.open(`https://voyager.online/tx/${tx.hash}`, "_blank"),
        },
        duration: 10000,
      });
      refreshStakes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unstake failed");
    } finally {
      setExiting(null);
    }
  }

  async function handleExitPool(stake: MyStake) {
    if (!wallet) return;
    setExiting(stake.poolAddress);
    try {
      const tx = await wallet.exitPool(stake.poolAddress as Address);
      await tx.wait();
      toast.success(`Exit completed from ${stake.validatorName}`, {
        description: `Tx: ${tx.hash.slice(0, 12)}...`,
        action: {
          label: "View on Voyager",
          onClick: () => window.open(`https://voyager.online/tx/${tx.hash}`, "_blank"),
        },
        duration: 10000,
      });
      refreshStakes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Exit failed");
    } finally {
      setExiting(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Staking</h1>

      {/* My Stakes */}
      <Card className="mb-6">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-5 text-accent" />
            My Stakes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stakesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : myStakes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You haven't staked in any pools yet. Choose a validator below to get started.
            </div>
          ) : (
            <div className="divide-y">
              {myStakes.map((stake) => (
                <div key={stake.poolAddress} className="p-4 sm:p-6">
                  {/* Validator name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                      {stake.logoUrl ? (
                        <img
                          src={stake.logoUrl}
                          alt={stake.validatorName}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <TrendingUp className="size-4 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{stake.validatorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {stake.position.commissionPercent}% commission
                      </p>
                    </div>
                  </div>

                  {/* Position stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Coins className="size-3" />
                        Staked
                      </div>
                      <p className="font-semibold tabular-nums text-sm">
                        {stake.position.staked.toFormatted(true)} STRK
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Gift className="size-3" />
                        Rewards
                      </div>
                      <p className="font-semibold tabular-nums text-sm text-emerald-600">
                        {stake.position.rewards.toFormatted(true)} STRK
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="size-3" />
                        Total
                      </div>
                      <p className="font-semibold tabular-nums text-sm">
                        {stake.position.total.toFormatted(true)} STRK
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Clock className="size-3" />
                        Exiting
                      </div>
                      <p className="font-semibold tabular-nums text-sm">
                        {stake.position.unpooling.toFormatted(true)} STRK
                      </p>
                      {stake.position.unpoolTime && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {stake.position.unpoolTime.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClaimRewards(stake)}
                      disabled={claiming === stake.poolAddress}
                    >
                      {claiming === stake.poolAddress && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      Claim Rewards
                    </Button>
                    {stake.position.unpooling.toBase() > 0n && stake.position.unpoolTime && stake.position.unpoolTime <= new Date() ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExitPool(stake)}
                        disabled={exiting === stake.poolAddress}
                      >
                        {exiting === stake.poolAddress && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        Complete Exit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleExitIntent(stake)}
                        disabled={exiting === stake.poolAddress || stake.position.staked.toBase() === 0n}
                      >
                        {exiting === stake.poolAddress && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        Unstake
                      </Button>
                    )}
                    {stake.position.unpooling.toBase() > 0n && stake.position.unpoolTime && stake.position.unpoolTime > new Date() && (
                      <Badge variant="secondary" className="text-xs">
                        Exit pending until {stake.position.unpoolTime.toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Validator Pools */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Validator Pools</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : pools.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No staking pools available at the moment.
            </div>
          ) : (
            <div className="divide-y">
              {pools.map((pool) => (
                <div key={pool.poolAddress}>
                  <button
                    onClick={() =>
                      setExpandedPool(
                        expandedPool === pool.poolAddress
                          ? null
                          : pool.poolAddress,
                      )
                    }
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                        {pool.logoUrl ? (
                          <img
                            src={pool.logoUrl}
                            alt={pool.name}
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <TrendingUp className="size-4 text-accent" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{pool.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {pool.totalStaked} staked
                        </p>
                      </div>
                    </div>
                    {expandedPool === pool.poolAddress ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedPool === pool.poolAddress && (
                    <div className="px-6 pb-4 pt-1">
                      <div className="rounded-lg bg-muted p-4 space-y-3">
                        <div className="space-y-2">
                          <Label>Amount to stake (STRK)</Label>
                          <Input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStake(pool)}
                            disabled={
                              staking ||
                              !wallet ||
                              !stakeAmount ||
                              parseFloat(stakeAmount) <= 0
                            }
                            className="flex-1"
                          >
                            {staking && (
                              <Loader2 className="size-4 animate-spin" />
                            )}
                            Stake STRK
                          </Button>
                          <Button variant="outline" size="default" asChild>
                            <a
                              href={`https://voyager.online/contract/${pool.poolAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="size-3.5" />
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

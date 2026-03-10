import { usePrivy } from "@privy-io/react-auth";

export function useAuth() {
  const { ready, authenticated, user, login, logout, getAccessToken } =
    usePrivy();

  const walletAddress = user?.wallet?.address ?? null;

  return {
    ready,
    authenticated,
    user,
    walletAddress,
    login,
    logout,
    getAccessToken,
  };
}

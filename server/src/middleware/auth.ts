import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export { privy };

/** Extract Privy user_id from Bearer token, or null if invalid/missing. */
export async function verifyToken(
  authHeader: string | undefined,
): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const claims = await privy.utils().auth().verifyAccessToken(token);
    return claims.user_id;
  } catch {
    return null;
  }
}

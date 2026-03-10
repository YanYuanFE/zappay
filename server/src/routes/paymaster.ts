import { Hono } from "hono";

const paymaster = new Hono();

const AVNU_PAYMASTER_URL =
  process.env.AVNU_PAYMASTER_URL || "https://starknet.paymaster.avnu.fi";

paymaster.post("/paymaster", async (c) => {
  const avnuApiKey = process.env.AVNU_API_KEY;
  const body = await c.req.json();

  console.log(`[Paymaster] ${body?.method || "unknown"}`);

  const response = await fetch(AVNU_PAYMASTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(avnuApiKey && { "x-paymaster-api-key": avnuApiKey }),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return c.json(data, response.status as 200);
});

export default paymaster;

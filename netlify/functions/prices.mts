// Live market prices (in EUR) for the app's core coins.
// Proxies CoinGecko (cached at the CDN so every visitor shares one upstream call)
// and falls back to Coinbase spot + 24h stats when CoinGecko is rate-limited.
// Also returns the USD->EUR rate so the app can convert other USD-quoted prices.
// `markets` mirrors CoinGecko's /coins/markets shape so the client can parse either.

const COINS: Record<string, { id: string; coinbase?: string }> = {
  SOL: { id: "solana", coinbase: "SOL-USD" },
  BTC: { id: "bitcoin", coinbase: "BTC-USD" },
  ETH: { id: "ethereum", coinbase: "ETH-USD" },
  USDC: { id: "usd-coin" },
  JUP: { id: "jupiter-exchange-solana", coinbase: "JUP-USD" },
  BONK: { id: "bonk", coinbase: "BONK-USD" },
  WIF: { id: "dogwifcoin", coinbase: "WIF-USD" },
  PENGU: { id: "pudgy-penguins", coinbase: "PENGU-USD" },
};

type Market = {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  image?: string;
};

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function usdToEur(): Promise<number | null> {
  try {
    const cb = await fetchJson("https://api.coinbase.com/v2/exchange-rates?currency=USD");
    const rate = parseFloat(cb?.data?.rates?.EUR);
    if (rate > 0) return rate;
  } catch {}
  try {
    const fx = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR");
    const rate = parseFloat(fx?.rates?.EUR);
    if (rate > 0) return rate;
  } catch {}
  return null;
}

async function fromCoinGecko(): Promise<Market[]> {
  const ids = Object.values(COINS).map((c) => c.id).join(",");
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${ids}&price_change_percentage=24h`
  );
  if (!Array.isArray(data) || !data.length) throw new Error("empty CoinGecko response");
  return data.map((c: any) => ({
    id: c.id,
    symbol: String(c.symbol || "").toUpperCase(),
    current_price: c.current_price,
    price_change_percentage_24h: c.price_change_percentage_24h || 0,
    image: c.image,
  }));
}

async function fromCoinbase(fx: number): Promise<Market[]> {
  const rows = await Promise.all(
    Object.entries(COINS).map(async ([sym, c]): Promise<Market | null> => {
      if (!c.coinbase) {
        return sym === "USDC"
          ? { id: c.id, symbol: sym, current_price: fx, price_change_percentage_24h: 0 }
          : null;
      }
      try {
        const s = await fetchJson(`https://api.exchange.coinbase.com/products/${c.coinbase}/stats`);
        const last = parseFloat(s.last);
        const open = parseFloat(s.open);
        if (!last) return null;
        return {
          id: c.id,
          symbol: sym,
          current_price: last * fx,
          price_change_percentage_24h: open ? ((last - open) / open) * 100 : 0,
        };
      } catch {
        return null;
      }
    })
  );
  const markets = rows.filter((r): r is Market => r !== null);
  if (!markets.length) throw new Error("empty Coinbase response");
  return markets;
}

export default async () => {
  const fxPromise = usdToEur();
  let markets: Market[] | null = null;
  let source = "coingecko";
  try {
    markets = await fromCoinGecko();
  } catch {
    markets = null;
  }

  let fx = await fxPromise;
  if (!fx && markets) {
    // USDC tracks the dollar, so its EUR price is a close stand-in for the rate
    const usdc = markets.find((m) => m.id === "usd-coin");
    if (usdc && usdc.current_price > 0) fx = usdc.current_price;
  }

  if (!markets && fx) {
    try {
      markets = await fromCoinbase(fx);
      source = "coinbase";
    } catch {
      markets = null;
    }
  }

  if (!markets || !fx) {
    return Response.json(
      { error: "Price sources unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    { currency: "EUR", usdToEur: fx, source, updatedAt: new Date().toISOString(), markets },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, durable, s-maxage=15, stale-while-revalidate=60",
      },
    }
  );
};

export const config = {
  path: "/api/prices",
};

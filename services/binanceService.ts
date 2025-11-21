
import { Kline, OrderBook, FundingRate } from '../types';

const INTERVAL = '1h';
const LIMIT = 100;

// Helper to fetch with proxy fallback to handle CORS/Network issues
const fetchJson = async (url: string) => {
  try {
    // Try direct fetch first
    const response = await fetch(url);
    
    // If response is not OK, try to parse error message
    if (!response.ok) {
        let errorMsg = `Direct fetch failed: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.msg) {
                errorMsg = errorData.msg;
            }
        } catch (e) {
            // Ignore parse error
        }
        throw new Error(errorMsg);
    }
    return await response.json();
  } catch (directError: any) {
    // Don't warn if it's a known restriction, we will handle it in the caller
    if (!directError.message?.includes('restricted location') && !directError.message?.includes('Service unavailable')) {
         console.warn(`Direct fetch failed for ${url}, attempting proxy fallback...`);
    }

    try {
      // Fallback to AllOrigins proxy
      // Add timestamp to prevent caching
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&t=${Date.now()}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (proxyError) {
      // Throw the original error if it was specific (like geo restriction) so we can handle it
      if (directError.message?.includes('restricted location') || directError.message?.includes('Service unavailable')) {
          throw directError;
      }
      throw proxyError; 
    }
  }
};

const mapBinanceData = (data: any[]): Kline[] => {
    return data.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
};

// Binance Futures API (Primary) with Spot Fallback
export const fetchMarketData = async (symbol: string = 'BTCUSDT'): Promise<Kline[]> => {
  const cleanSymbol = symbol.replace('/', '').toUpperCase();
  const params = `symbol=${cleanSymbol}&interval=${INTERVAL}&limit=${LIMIT}`;
  
  // 1. Try Futures API First (fapi)
  const FAPI_URL = `https://fapi.binance.com/fapi/v1/klines?${params}`;
  // 2. Spot API Fallback
  const SPOT_URL = `https://api.binance.com/api/v3/klines?${params}`;
  // 3. US Spot API Fallback
  const US_API_URL = `https://api.binance.us/api/v3/klines?${params}`;

  try {
    let data;
    let source = 'Futures';

    try {
        data = await fetchJson(FAPI_URL);
    } catch (e: any) {
        console.warn(`Futures API failed for ${cleanSymbol}, falling back to Spot. Reason: ${e.message}`);
        // Fallback to Spot
        try {
            data = await fetchJson(SPOT_URL);
            source = 'Spot';
        } catch (spotError: any) {
             if (spotError.message.includes('restricted location') || spotError.message.includes('Service unavailable')) {
                throw new Error('GEO_RESTRICTED');
             }
             throw spotError;
        }
    }
    
    // Validate data is an array before mapping
    if (!Array.isArray(data)) {
        if (data && data.msg) {
            if (data.msg.includes('restricted location') || data.msg.includes('Service unavailable')) {
                throw new Error('GEO_RESTRICTED');
            }
            throw new Error(`Binance API Error (${source}): ${data.msg}`);
        }
        throw new Error(`Invalid response format from Binance (${source})`);
    }
    
    return mapBinanceData(data);

  } catch (error: any) {
    // Handle Geo Restriction for US users (Only supported on Binance.US Spot)
    if (error.message === 'GEO_RESTRICTED' || error.message.includes('restricted location')) {
        console.log(`Geo-restriction detected for ${cleanSymbol}. Attempting Binance.US fallback...`);
        try {
            // Direct fetch to US API (usually doesn't need proxy if in US)
            const response = await fetch(US_API_URL);
            if (!response.ok) throw new Error("Binance.US fetch failed");
            const usData = await response.json();
            
            if (Array.isArray(usData)) {
                return mapBinanceData(usData);
            }
        } catch (usError) {
            console.warn("Binance.US fallback failed:", usError);
        }
    }

    console.error(`Failed to fetch from Binance for ${cleanSymbol}, using mock data. Error:`, error.message);
    return generateMockData(cleanSymbol);
  }
};

// Fetch Order Book (Depth) - Futures First
export const fetchOrderBook = async (symbol: string = 'BTCUSDT'): Promise<OrderBook | null> => {
  const cleanSymbol = symbol.replace('/', '').toUpperCase();
  const params = `symbol=${cleanSymbol}&limit=20`;
  
  const FAPI_URL = `https://fapi.binance.com/fapi/v1/depth?${params}`;
  const SPOT_URL = `https://api.binance.com/api/v3/depth?${params}`;

  try {
    let data;
    try {
        data = await fetchJson(FAPI_URL);
    } catch(e) {
        // Fallback to Spot for OrderBook if Futures fails
        data = await fetchJson(SPOT_URL);
    }

    if (!data || (!data.bids && !data.asks)) {
         if (data && data.msg && data.msg.includes('restricted location')) throw new Error('GEO_RESTRICTED');
         throw new Error("Invalid Order Book data");
    }
    return data;
  } catch (error: any) {
     if (error.message === 'GEO_RESTRICTED') {
        try {
             const US_API_URL = `https://api.binance.us/api/v3/depth?${params}`;
             const response = await fetch(US_API_URL);
             const usData = await response.json();
             if (usData && (usData.bids || usData.asks)) return usData;
        } catch (e) { /* ignore */ }
    }
    console.error("Failed to fetch Order Book:", error);
    return null;
  }
};

// Fetch Funding Rate (Futures API)
export const fetchFundingRate = async (symbol: string = 'BTCUSDT'): Promise<FundingRate | null> => {
  const cleanSymbol = symbol.replace('/', '').toUpperCase();
  const API_URL = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${cleanSymbol}`;

  try {
    const data = await fetchJson(API_URL);
    if (!data || !data.symbol) throw new Error("Invalid Funding Rate data");
    
    return {
      symbol: data.symbol,
      markPrice: data.markPrice,
      lastFundingRate: data.lastFundingRate,
      nextFundingTime: data.nextFundingTime
    };
  } catch (error) {
    // Silent fail for funding rate as it is often blocked and less critical than price
    // console.warn("Failed to fetch Funding Rate (likely CORS), skipping:", error);
    return null;
  }
};

export const subscribeToMarketData = (symbol: string, onUpdate: (kline: Kline) => void) => {
  const cleanSymbol = symbol.replace('/', '').toLowerCase();
  
  // Futures WebSocket URL: wss://fstream.binance.com/ws
  // Spot WebSocket URL: wss://stream.binance.com/ws
  
  // We try Futures stream first.
  const wsUrl = `wss://fstream.binance.com/ws/${cleanSymbol}@kline_${INTERVAL}`;
  
  let ws: WebSocket | null = null;

  try {
    ws = new WebSocket(wsUrl);
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    return () => {};
  }

  ws.onopen = () => {
    console.log(`Connected to Binance Futures WS for ${cleanSymbol}`);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.e === 'kline') {
        const k = msg.k;
        const kline: Kline = {
          time: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v)
        };
        onUpdate(kline);
      }
    } catch (e) {
      console.error("Error parsing WS message", e);
    }
  };

  ws.onerror = (event: Event) => {
     // If Futures WS fails, we could try Spot, but typically if REST works, WS works.
     // console.error(`Binance WS connection error for ${cleanSymbol}.`);
  };

  return () => {
    if (ws) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    }
  };
};

const generateMockData = (symbol: string = 'BTCUSDT'): Kline[] => {
  const klines: Kline[] = [];
  let price = 95000;

  const s = symbol.toUpperCase();

  // Estimate price based on symbol to avoid showing BTC price for ETH
  if (s.includes('ETH')) price = 3300;
  else if (s.includes('SOL')) price = 180;
  else if (s.includes('BNB')) price = 600;
  else if (s.includes('XRP')) price = 2.5;
  else if (s.includes('DOGE')) price = 0.3;
  else if (s.includes('ADA')) price = 0.8;
  else if (s.includes('DOT')) price = 7;
  
  let time = Date.now() - (LIMIT * 60 * 60 * 1000);
  
  for (let i = 0; i < LIMIT; i++) {
    const move = (Math.random() - 0.5) * (price * 0.02); // 2% volatility
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + Math.random() * (price * 0.01);
    const low = Math.min(open, close) - Math.random() * (price * 0.01);
    const volume = Math.random() * 1000 + 100;
    
    klines.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    price = close;
    time += 3600000;
  }
  return klines;
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(val);
};

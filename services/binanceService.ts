import { Kline } from '../types';

const INTERVAL = '1h';
const LIMIT = 50;

// Binance Public API (Spot as fallback for FAPI CORS issues in some browsers)
export const fetchMarketData = async (symbol: string = 'BTCUSDT'): Promise<Kline[]> => {
  // Ensure uppercase and no slash for Binance API
  const cleanSymbol = symbol.replace('/', '').toUpperCase();
  const API_URL = `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${INTERVAL}&limit=${LIMIT}`;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Binance API Error: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Map Binance array format [time, open, high, low, close, volume, ...] to object
    return data.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error("Failed to fetch from Binance, using mock data:", error);
    return generateMockData();
  }
};

const generateMockData = (): Kline[] => {
  const klines: Kline[] = [];
  let price = 95000;
  let time = Date.now() - (LIMIT * 60 * 60 * 1000);
  
  for (let i = 0; i < LIMIT; i++) {
    const move = (Math.random() - 0.5) * 1000;
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    const volume = Math.random() * 1000;
    
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
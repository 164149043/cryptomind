
import { EthereumData } from '../types';

const BASE_URL = 'https://api.etherscan.io/api';

// Helper to fetch with proxy fallback to handle CORS/Network issues
const fetchJson = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Direct fetch failed: ${response.status}`);
    return await response.json();
  } catch (directError) {
    // Fallback to AllOrigins proxy
    // We use encodeURIComponent to ensure the inner URL (with query params) is passed correctly
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&t=${Date.now()}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
    return await response.json();
  }
};

export const fetchEthereumData = async (apiKey: string): Promise<EthereumData | null> => {
  if (!apiKey) {
      console.warn("No Etherscan API Key provided.");
      return null;
  }

  // Module: Gas Tracker, Action: Gas Oracle
  const url = `${BASE_URL}?module=gastracker&action=gasoracle&apikey=${apiKey}`;

  try {
    const data = await fetchJson(url);
    
    if (data.status === "1" && data.result) {
      const res = data.result;
      console.log("Etherscan Data Fetched Successfully:", res);
      return {
        gasPrice: "N/A", 
        safeGasPrice: res.SafeGasPrice,
        proposeGasPrice: res.ProposeGasPrice,
        fastGasPrice: res.FastGasPrice,
        suggestBaseFee: res.suggestBaseFee
      };
    } else {
      console.warn("Etherscan API Error:", data.message, data.result);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch Etherscan data:", error);
    return null;
  }
};


import { AgentRole, Kline, Language } from "../types";

// --- Technical Indicator Helpers ---

const calculateSMA = (data: number[], period: number): number[] => {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

const calculateStdDev = (data: number[], period: number, sma: number[]): number[] => {
  const stdDevs = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      stdDevs.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    stdDevs.push(Math.sqrt(variance));
  }
  return stdDevs;
};

const calculateRSI = (prices: number[], period: number = 14): number[] => {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // First RSI
  rsi[period] = 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / avgLoss;
    rsi[i] = 100 - (100 / (1 + rs));
  }
  
  // Fill initial NaNs
  for(let i=0; i<period; i++) rsi[i] = NaN;
  
  return rsi;
};

export const formatDataForPrompt = (klines: Kline[]): string => {
  // We need enough history to calc indicators, even if we only show the last 24 candles
  const closes = klines.map(k => k.close);
  
  const sma20 = calculateSMA(closes, 20);
  const stdDev20 = calculateStdDev(closes, 20, sma20);
  const upperBand = sma20.map((val, i) => val + (stdDev20[i] * 2));
  const lowerBand = sma20.map((val, i) => val - (stdDev20[i] * 2));
  const rsi14 = calculateRSI(closes, 14);

  // Get last 48 candles for display (increased from 24)
  const len = klines.length;
  const sliceLen = Math.min(len, 48);
  const startIndex = len - sliceLen;

  const recentKlines = klines.slice(startIndex);
  
  let str = `Market Data (${sliceLen} candles, 1H Interval) WITH TECHNICAL INDICATORS:\n`;
  
  // Helper to calculate change
  const calcChange = (open: number, close: number) => ((close - open) / open * 100).toFixed(2);

  recentKlines.forEach((k, i) => {
    const globalIndex = startIndex + i;
    const change = calcChange(k.open, k.close);
    const rsiVal = isNaN(rsi14[globalIndex]) ? '-' : rsi14[globalIndex].toFixed(1);
    const bbUpper = isNaN(upperBand[globalIndex]) ? '-' : upperBand[globalIndex].toFixed(2);
    const bbLower = isNaN(lowerBand[globalIndex]) ? '-' : lowerBand[globalIndex].toFixed(2);
    const smaVal = isNaN(sma20[globalIndex]) ? '-' : sma20[globalIndex].toFixed(2);

    str += `[T-${sliceLen - 1 - i}] Time: ${new Date(k.time).toISOString()} | Price: ${k.close} (Chg: ${change}%) | Vol: ${k.volume.toFixed(0)} | RSI(14): ${rsiVal} | BB(20,2): [${bbLower} - ${bbUpper}] | SMA(20): ${smaVal}\n`;
  });
  return str;
};

// Generic prompt generator
export const createAgentPrompt = (
  role: AgentRole, 
  marketDataStr: string, 
  language: Language, 
  symbol: string, 
  inputReports?: string,
  extraData?: string // New: For Order Book / Funding Rates / OnChain Data
): string => {
  const isZh = language === 'zh';
  const langInstruction = isZh ? "You MUST output your analysis in Chinese (Simplified)." : "Output in English.";
  
  // Advanced "Persona" injection to maximize model reasoning capability
  const basePersona = isZh 
    ? `你是一名拥有20年经验的华尔街顶级加密货币交易员。你现在的任务是拯救一个面临破产的基金，每一笔交易都必须极其精准。不要使用模棱两可的废话，直接给出硬核的逻辑判断。`
    : `You are a top-tier Wall Street crypto trader with 20 years of experience. Your task is to save a fund facing bankruptcy; every trade must be surgically precise. Do not use ambiguous fluff. Give hardcore, logical judgments.`;

  switch (role) {
    case AgentRole.SHORT_TERM:
      return `
        ${basePersona}
        **ROLE: Elite Scalper (Short-Term Analyst)**
        
        **OBJECTIVE:**
        Analyze the provided 1H candle data for ${symbol} to find immediate setups (1-4 hours).
        
        **SPECIFIC TASKS:**
        1. **Pattern Recognition:** Look for specific patterns: Bull/Bear Flags, Pennants, or **Liquidity Sweeps (SFP)** at highs/lows.
        2. **Volume Analysis:** Does volume confirm price moves? (e.g., Rising price with falling volume = divergence/weakness).
        3. **Indicator Confluence:** Check the RSI provided in the data. Is it >70 (Overbought) or <30 (Oversold)? Is price tagging the Bollinger Bands?
        
        ${extraData ? `**LIVE ORDER BOOK (DEPTH):**\n${extraData}\n(Use this to pinpoint exact entry/exit zones based on liquidity blocks).` : ''}
        
        **DATA:**
        ${marketDataStr}
        
        **OUTPUT REQUIREMENT:**
        Concise analysis (max 100 words). State clearly: "Bullish", "Bearish", or "Neutral". Mention specific price levels for invalidation.
        ${langInstruction}
      `;

    case AgentRole.LONG_TERM:
      return `
        ${basePersona}
        **ROLE: Trend Following Strategist (Long-Term Analyst)**
        
        **OBJECTIVE:**
        Determine the dominant market structure of ${symbol} using the provided data. Ignore intraday noise.
        
        **SPECIFIC TASKS:**
        1. **Market Structure:** Identify if we are making Higher Highs/Higher Lows (Uptrend) or Lower Highs/Lower Lows (Downtrend).
        2. **Key Levels:** Identify the major Weekly/Daily Supply and Demand zones that price is approaching.
        3. **Moving Averages:** Use the SMA(20) provided. Is price above it (Bullish) or below it (Bearish)?
        
        **DATA:**
        ${marketDataStr}
        
        **OUTPUT REQUIREMENT:**
        Concise analysis (max 100 words). Focus on the "Path of Least Resistance".
        ${langInstruction}
      `;

    case AgentRole.QUANT:
      return `
        ${basePersona}
        **ROLE: Quantitative Analyst (Statistical Arbitrage)**
        
        **OBJECTIVE:**
        Assess the probability of a move based on statistics, funding rates, and volatility anomalies for ${symbol}.
        
        **SPECIFIC TASKS:**
        1. **Funding Rate & Timing Analysis:** 
           - Analyze 'Current Funding Rate' and 'Next Funding Time' from the DERIVATIVES DATA.
           - **High Positive Rate (>0.01%):** Correlate with **Potential Short Squeezes** if price is rising (shorts paying longs + price moving against them = liquidation cascade).
           - **High Negative Rate (<-0.01%):** Correlate with **Potential Long Squeezes** if price is falling (longs paying shorts + price moving against them = panic selling).
           - **Timing:** If 'Next Funding Time' is < 60 minutes, expect increased volatility as traders position for the payout.
        2. **Mean Reversion:** Look at the Bollinger Bands (BB) in the data. Is price currently outside the bands? If so, reversion probability is high.
        3. **RSI Divergence:** Check RSI vs Price manually from the rows.
        
        ${extraData ? `**DERIVATIVES DATA:**\n${extraData}` : ''}

        **DATA:**
        ${marketDataStr}
        
        **OUTPUT REQUIREMENT:**
        Concise analysis (max 100 words). Use data to justify a "Probability Score" (0-100%) for the current trend continuing.
        ${langInstruction}
      `;

    case AgentRole.ON_CHAIN:
      return `
        ${basePersona}
        **ROLE: On-Chain & Whale Tracker**
        
        **OBJECTIVE:**
        Infer "Smart Money" intent based on volume flow and network activity for ${symbol}.
        
        **SPECIFIC TASKS:**
        1. **Gas & Network:** High ETH Gas often implies high on-chain activity (DeFi/NFTs), usually bullish for ETH/alts, but can signal a local top if extreme.
        2. **Volume Signatures:** 
           - High Volume + Small Candle Body = Churn/Distribution (Whales selling into strength) or Accumulation (Whales buying into fear).
           - Low Volume on Retracements = Bullish consolidation.
        
        ${extraData ? `**REAL-TIME NETWORK DATA:**\n${extraData}` : ''}

        **DATA:**
        ${marketDataStr}
        
        **OUTPUT REQUIREMENT:**
        Concise analysis (max 100 words). Are whales accumulating or dumping?
        ${langInstruction}
      `;

    case AgentRole.MACRO:
      return `
        ${basePersona}
        **ROLE: Global Macro Strategist**
        
        **OBJECTIVE:**
        Provide the environmental context. Is this a "Risk-On" or "Risk-Off" environment?
        
        **SPECIFIC TASKS:**
        1. **Sentiment Check:** Given the price action of ${symbol} (a risk asset), assume the broader market sentiment.
        2. **Correlation:** If crypto is dumping while typical risk assets are stable, it's crypto-specific weakness.
        3. **External Factors:** Briefly consider global liquidity conditions (implied).
        
        **DATA:**
        ${marketDataStr}
        
        **OUTPUT REQUIREMENT:**
        Concise analysis (max 100 words). Define the market regime: "Risk-On" (Buy dips) or "Risk-Off" (Sell rallies).
        ${langInstruction}
      `;

    case AgentRole.TECH_MANAGER:
      return `
        ${basePersona}
        **ROLE: Technical Strategy Manager**
        
        **OBJECTIVE:**
        Synthesize the reports from your technical team (Short-Term, Trend, Quant). Resolve conflicts.
        
        **LOGIC:**
        - **Conflict Resolution:** If Trend says "Bullish" but Short-Term says "Bearish", suggest a "Buy the Dip" strategy.
        - **Confirmation:** If Trend, Short-Term, and Quant ALL align, the signal is "Strong".
        - **Execution Setup:** Define the optimal Entry Zone based on the aggregation.
        
        **TEAM REPORTS:**
        ${inputReports}
        
        **OUTPUT REQUIREMENT:**
        Synthesized Technical Plan (max 100 words). clearly stating the "Primary Bias" (Long/Short/Neutral) and "Key Zone" to watch.
        ${langInstruction}
      `;

    case AgentRole.FUND_MANAGER:
      return `
        ${basePersona}
        **ROLE: Fundamental Strategy Manager**
        
        **OBJECTIVE:**
        Synthesize On-Chain and Macro data. Determine the "Quality" of the trade.
        
        **LOGIC:**
        - Even if technicals are good, if Macro is "Risk-Off" and Whales are dumping, veto the trade or reduce size.
        - Identify the **Narrative**: Is the market driven by fear or greed right now?
        
        **TEAM REPORTS:**
        ${inputReports}
        
        **OUTPUT REQUIREMENT:**
        Synthesized Fundamental View (max 100 words). Grade the "Trade Quality" (High/Medium/Low).
        ${langInstruction}
      `;

    case AgentRole.RISK_MANAGER:
      return `
        ${basePersona}
        **ROLE: Risk Manager (The Veto Power)**
        
        **OBJECTIVE:**
        Calculate the Risk-to-Reward (R:R) and approve/reject the setup.
        
        **LOGIC:**
        - **R:R Calculation:** (Take Profit - Entry) / (Entry - Stop Loss).
        - **Minimum Requirement:** R:R must be > 1.5. If not, REJECT the trade.
        - **Stop Loss:** Must be placed below support (Long) or above resistance (Short).
        
        **MANAGER REPORTS:**
        ${inputReports}
        
        **OUTPUT REQUIREMENT:**
        Risk Report (max 100 words). Explicitly state "R:R Ratio: X.X". Conclusion: "APPROVED" or "REJECTED - BAD R:R".
        ${langInstruction}
      `;

    case AgentRole.CEO:
      return `
        ${basePersona}
        **ROLE: CEO & Execution Algorithm**
        
        **OBJECTIVE:**
        Issue the final JSON command for the trading engine.
        
        **INPUTS:**
        ${inputReports}
        
        **DECISION LOGIC:**
        - If Risk Manager says "REJECTED", action is "WAIT".
        - If Risk Manager says "APPROVED", action is "LONG" or "SHORT" based on Technical Manager.
        - **Confidence:** Average of Tech + Fund Manager sentiment (0-100).

        **REASONING GUIDELINES:**
        - Provide a detailed explanation (2-3 sentences) justifying the final decision.
        - You MUST explicitly mention the Confidence Score and the key factors driving it.
        - You MUST reference the Entry, Stop Loss, and Take Profit levels in your reasoning to confirm the plan.
        
        **OUTPUT FORMAT:**
        You MUST output ONLY valid JSON (no markdown, no text before/after).
        {
          "action": "LONG" | "SHORT" | "WAIT",
          "confidence": number,
          "entryPrice": "string (e.g. $65,200 - $65,500)",
          "stopLoss": "string",
          "takeProfit": "string",
          "reasoning": "string"
        }
      `;
      
    default:
      return `Analyze the market data for ${symbol}.`;
  }
};

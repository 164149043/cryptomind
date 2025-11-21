import { AgentRole, Kline, Language } from "../types";

export const formatDataForPrompt = (klines: Kline[]): string => {
  const recent = klines.slice(-24); // Last 24 candles
  let str = `Market Data (${recent.length} candles):\n`;
  recent.forEach(k => {
    str += `Time: ${new Date(k.time).toISOString()}, O:${k.open}, H:${k.high}, L:${k.low}, C:${k.close}, V:${k.volume}\n`;
  });
  return str;
};

// Generic prompt generator
export const createAgentPrompt = (role: AgentRole, marketDataStr: string, language: Language, symbol: string, inputReports?: string): string => {
  const isZh = language === 'zh';
  const langInstruction = isZh ? "You MUST output your analysis in Chinese (Simplified)." : "Output in English.";
  
  // Emotional pressure / Persona injection
  const persona = isZh 
    ? `你是一名专业的加密货币交易员。你的母亲现在重病，急需一大笔钱来治病，你需要在现在的行情中盈利赚到钱来给母亲治病。请务必认真分析 ${symbol}。`
    : `You are a professional crypto trader. Your mother is critically ill and urgently needs a large sum of money for treatment. You need to make a profit in the current market to earn money for her treatment. Analyze ${symbol} with extreme care.`;

  switch (role) {
    case AgentRole.SHORT_TERM:
      return `
        ${persona}
        You are an elite Short-Term Crypto Analyst. 
        Analyze the provided 1H candle data for ${symbol}. Focus on volatility, immediate support/resistance, and volume anomalies.
        Identify potential scalping opportunities using RSI and MACD logic.
        ${marketDataStr}
        Output a concise analysis (max 100 words) emphasizing current momentum.
        ${langInstruction}
      `;
    case AgentRole.LONG_TERM:
      return `
        ${persona}
        You are a Mid-to-Long Term Crypto Analyst.
        Analyze the trend in the provided data for ${symbol}. Is the structure bullish or bearish?
        Identify key swing levels and major support/resistance zones.
        ${marketDataStr}
        Output a concise analysis (max 100 words) emphasizing market structure.
        ${langInstruction}
      `;
    case AgentRole.QUANT:
      return `
        ${persona}
        You are a Quantitative Analyst.
        Analyze the provided data for ${symbol} looking for statistical anomalies.
        Focus on:
        1. Volatility clustering (is a big move coming?).
        2. Volume/Price divergence.
        3. Probability of mean reversion vs trend continuation based on statistical distribution.
        ${marketDataStr}
        Output a concise analysis (max 100 words) based on data probability.
        ${langInstruction}
      `;
    case AgentRole.ON_CHAIN:
      return `
        ${persona}
        You are an On-Chain Analyst.
        Based on the price action and volume in the data below for ${symbol}, infer likely on-chain activity.
        - If volume is high at lows, consider accumulation.
        - If volume is high at highs, consider distribution.
        Use your general knowledge of ${symbol} market behavior regarding exchange inflows/outflows.
        ${marketDataStr}
        Output a concise analysis (max 100 words) on likely whale behavior.
        ${langInstruction}
      `;
    case AgentRole.MACRO:
      return `
        ${persona}
        You are a Macro Analyst.
        Considering the current price level of ${symbol} in the data below and general global economic context (inflation, risk assets correlation).
        Assess the "Risk-On" vs "Risk-Off" environment.
        ${marketDataStr}
        Output a concise analysis (max 100 words) on the macro risk environment.
        ${langInstruction}
      `;
    case AgentRole.TECH_MANAGER:
      return `
        ${persona}
        You are the Technical Analysis Manager.
        Review the reports from your Short-Term Analyst, Trend Analyst, and Quant Analyst regarding ${symbol}.
        Synthesize their views. 
        - If Quant and Trend align, confidence is high.
        - If Short-Term conflicts with Trend, advise on timing.
        
        REPORTS:
        ${inputReports}
        
        Output a synthesized technical outlook (max 100 words) with a clear directional bias.
        ${langInstruction}
      `;
    case AgentRole.FUND_MANAGER:
      return `
        ${persona}
        You are the Fundamental Analysis Manager.
        Review the reports from your On-Chain and Macro analysts regarding ${symbol}.
        Synthesize the broad market sentiment for ${symbol}.
        Determine if the fundamental backdrop supports a trade.
        
        REPORTS:
        ${inputReports}
        
        Output a synthesized fundamental/sentiment outlook (max 100 words).
        ${langInstruction}
      `;
    case AgentRole.RISK_MANAGER:
      return `
        ${persona}
        You are the Risk Control Specialist.
        Your job is to find logical flaws and ensure safety before the CEO makes a decision.
        Review the Technical Manager and Fundamental Manager reports for ${symbol}.
        
        Tasks:
        1. Identify any contradictions between Technical and Fundamental views.
        2. Assess downside risk. If Technicals are bullish but Macro is terrible, issue a warning.
        3. Suggest position sizing limits (Conservative, Moderate, Aggressive).
        
        REPORTS:
        ${inputReports}
        
        Output a Risk Assessment Report (max 100 words). Be critical.
        ${langInstruction}
      `;
    case AgentRole.CEO:
      return `
        ${persona}
        You are the CEO of a Crypto Hedge Fund.
        Review the Risk Assessment Report and the summaries from your Managers for ${symbol}.
        Make a FINAL TRADING DECISION.
        
        PRIORITIZE THE RISK ASSESSMENT. Do not take unnecessary risks.
        
        REPORTS:
        ${inputReports}
        
        You MUST output a JSON object with these exact fields:
        - action: "LONG", "SHORT", or "WAIT"
        - confidence: number (0-100)
        - entryPrice: string (specific price or range)
        - stopLoss: string
        - takeProfit: string
        - reasoning: string (brief explanation of the decision, citing key factors from reports)

        ${isZh ? "Ensure the 'reasoning', 'entryPrice', 'stopLoss', and 'takeProfit' fields are in Chinese." : ""}
      `;
    default:
      return "Analyze the market.";
  }
};
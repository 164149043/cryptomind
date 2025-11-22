
// Market Data Types
export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: [string, string][]; // [Price, Quantity]
  asks: [string, string][]; // [Price, Quantity]
}

export interface FundingRate {
  symbol: string;
  markPrice: string;
  lastFundingRate: string; // "0.0001"
  nextFundingTime: number;
}

export interface EthereumData {
  gasPrice: string; // Last Block Gas Price
  safeGasPrice: string;
  proposeGasPrice: string;
  fastGasPrice: string;
  suggestBaseFee: string;
}

export type Language = 'en' | 'zh';
export type AIProvider = 'gemini' | 'deepseek';

// Agent Types
export enum AgentRole {
  SHORT_TERM = 'SHORT_TERM_ANALYST',
  LONG_TERM = 'LONG_TERM_ANALYST',
  QUANT = 'QUANT_ANALYST',
  ON_CHAIN = 'ON_CHAIN_ANALYST',
  MACRO = 'MACRO_ANALYST',
  TECH_MANAGER = 'TECHNICAL_MANAGER',
  FUND_MANAGER = 'FUNDAMENTAL_MANAGER',
  RISK_MANAGER = 'RISK_MANAGER',
  CEO = 'CEO'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AgentState {
  id: AgentRole;
  name: string;
  description: string;
  status: AgentStatus;
  output: string | null;
  parentId?: AgentRole; // For hierarchy visualization
}

export interface UserPosition {
  type: 'LONG' | 'SHORT';
  entryPrice: string;
  leverage: string;
  liquidationPrice?: string;
}

export interface TradingDecision {
  action: 'LONG' | 'SHORT' | 'WAIT';
  confidence: number; // 0-100
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  reasoning: string;
}

// For the final output
export interface FinalReport {
  decision: TradingDecision;
  summary: string;
  timestamp: number;
}

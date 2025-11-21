import { AgentRole, AgentState, AgentStatus } from './types';

export const INITIAL_AGENTS: AgentState[] = [
  // Tier 1: Analysts
  {
    id: AgentRole.SHORT_TERM,
    name: 'Short-Term Analyst',
    description: 'Scalping, 15m/1h timeframes, RSI/MACD focus.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.LONG_TERM,
    name: 'Trend Analyst',
    description: 'Swing trading, 4h/1d trends, Support/Resistance.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.QUANT,
    name: 'Quant Analyst',
    description: 'Statistical anomalies, volatility clustering, funding rates.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.ON_CHAIN,
    name: 'On-Chain Analyst',
    description: 'Volume flow, whale activity, exchange inflows.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  {
    id: AgentRole.MACRO,
    name: 'Macro Analyst',
    description: 'Global events, correlation with SPX/DXY.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  // Tier 2: Managers
  {
    id: AgentRole.TECH_MANAGER,
    name: 'Technical Manager',
    description: 'Aggregates technical & quant signals.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  {
    id: AgentRole.FUND_MANAGER,
    name: 'Fundamental Manager',
    description: 'Aggregates sentiment & macro signals.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  // Tier 3: Risk
  {
    id: AgentRole.RISK_MANAGER,
    name: 'Risk Manager',
    description: ' audits analysis, identifies conflicts, sets limits.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.CEO
  },
  // Tier 4: CEO
  {
    id: AgentRole.CEO,
    name: 'General Manager (CEO)',
    description: 'Final execution decision.',
    status: AgentStatus.IDLE,
    output: null
  }
];

export const SIMULATION_DELAY = 800; // Visual delay between steps
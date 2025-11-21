
import { AgentRole, AgentState, AgentStatus } from './types';

export const INITIAL_AGENTS: AgentState[] = [
  // Tier 1: Analysts
  {
    id: AgentRole.SHORT_TERM,
    name: 'Short-Term Analyst',
    description: 'Price Action, Liquidity Sweeps (SFP), Order Book Walls.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.LONG_TERM,
    name: 'Trend Analyst',
    description: 'Market Structure (HH/HL), Weekly/Daily Supply & Demand.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.QUANT,
    name: 'Quant Analyst',
    description: 'Funding Rate Squeezes, Z-Score Mean Reversion, Volatility.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.ON_CHAIN,
    name: 'On-Chain Analyst',
    description: 'Gas Fees correlation, Exchange Flows, Whale Tracking.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  {
    id: AgentRole.MACRO,
    name: 'Macro Analyst',
    description: 'Risk-On/Risk-Off Regime, Global Liquidity Context.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  // Tier 2: Managers
  {
    id: AgentRole.TECH_MANAGER,
    name: 'Technical Manager',
    description: 'Synthesizes Structure, Momentum & Stats into a Setup.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  {
    id: AgentRole.FUND_MANAGER,
    name: 'Fundamental Manager',
    description: 'Validates trade quality via On-Chain & Macro sentiment.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  // Tier 3: Risk
  {
    id: AgentRole.RISK_MANAGER,
    name: 'Risk Manager',
    description: 'Calculates R:R Ratio. Vetoes trades with < 1.5 R:R.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.CEO
  },
  // Tier 4: CEO
  {
    id: AgentRole.CEO,
    name: 'General Manager (CEO)',
    description: 'Executes final signal strictly based on Risk parameters.',
    status: AgentStatus.IDLE,
    output: null
  }
];

export const SIMULATION_DELAY = 800; // Visual delay between steps
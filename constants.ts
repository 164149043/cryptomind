
import { AgentRole, AgentState, AgentStatus } from './types';

export const INITIAL_AGENTS: AgentState[] = [
  // Tier 1: Analysts
  {
    id: AgentRole.SHORT_TERM,
    name: 'Short-Term Analyst',
    description: 'Spot short-term setups via PA, SFP, and order depth.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.LONG_TERM,
    name: 'Trend Analyst',
    description: 'Analyze market structure (HH/HL) and supply/demand.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.QUANT,
    name: 'Quant Analyst',
    description: 'Assess stats via funding rates, Z-scores, and volatility.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.TECH_MANAGER
  },
  {
    id: AgentRole.ON_CHAIN,
    name: 'On-Chain Analyst',
    description: 'Track whale moves, exchange flows, and gas correlation.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  {
    id: AgentRole.MACRO,
    name: 'Macro Analyst',
    description: 'Assess global risk regime and liquidity context.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.FUND_MANAGER
  },
  // Tier 2: Managers
  {
    id: AgentRole.TECH_MANAGER,
    name: 'Technical Manager',
    description: 'Synthesize technicals to define optimal trade setups.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  {
    id: AgentRole.FUND_MANAGER,
    name: 'Fundamental Manager',
    description: 'Validate trade quality via on-chain & macro data.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.RISK_MANAGER
  },
  // Tier 3: Risk
  {
    id: AgentRole.RISK_MANAGER,
    name: 'Risk Manager',
    description: 'Enforce R:R > 1.5 and veto high-risk setups.',
    status: AgentStatus.IDLE,
    output: null,
    parentId: AgentRole.CEO
  },
  // Tier 4: CEO
  {
    id: AgentRole.CEO,
    name: 'General Manager (CEO)',
    description: 'Execute final strategy based on risk and intelligence.',
    status: AgentStatus.IDLE,
    output: null
  }
];

export const SIMULATION_DELAY = 800; // Visual delay between steps


import { useState, useCallback } from 'react';
import { 
  AgentRole, 
  AgentState, 
  AgentStatus, 
  Kline, 
  Language, 
  AIProvider, 
  TradingDecision,
  UserPosition 
} from '../types';
import { INITIAL_AGENTS, SIMULATION_DELAY } from '../constants';
import { translations } from '../locales';
import { fetchOrderBook, fetchFundingRate } from '../services/binanceService';
import { fetchEthereumData } from '../services/etherscanService';
import { runGeminiAgent } from '../services/geminiService';
import { runDeepSeekAgent } from '../services/deepseekService';

interface UseAgentWorkflowProps {
  marketData: Kline[];
  symbol: string;
  language: Language;
  provider: AIProvider;
  deepseekKey: string;
  etherscanKey: string;
  agentTemps: Record<AgentRole, number>;
  userPosition: UserPosition | null;
  setExtraData: (data: any) => void; // Callback to update UI with fetched extra data
}

export const useAgentWorkflow = ({
  marketData,
  symbol,
  language,
  provider,
  deepseekKey,
  etherscanKey,
  agentTemps,
  userPosition,
  setExtraData
}: UseAgentWorkflowProps) => {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalDecision, setFinalDecision] = useState<TradingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const t = translations[language];

  const updateAgentStatus = (id: AgentRole, status: AgentStatus, output: string | null = null) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status, output: output || a.output } : a));
  };

  const executeAgent = async (
    role: AgentRole,
    data: Kline[],
    lang: Language,
    currentSymbol: string,
    reports: Record<string, string> = {},
    extraContext?: string
  ): Promise<string> => {
    const temp = agentTemps[role];
    if (provider === 'gemini') {
      return runGeminiAgent(role, data, lang, currentSymbol, reports, temp, extraContext, userPosition);
    } else {
      return runDeepSeekAgent(role, data, lang, currentSymbol, reports, deepseekKey, temp, extraContext, userPosition);
    }
  };

  const startAnalysis = useCallback(async () => {
    if (marketData.length === 0 || isAnalyzing) return;
    
    if (provider === 'deepseek' && !deepseekKey && !process.env.DEEPSEEK_API_KEY) {
        setError("Please enter a DeepSeek API Key in the header.");
        return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFinalDecision(null);

    // Reset Agents
    setAgents(INITIAL_AGENTS.map(a => ({
      ...a,
      name: translations[language].agentNames[a.id],
      description: translations[language].agentDescs[a.id]
    })));

    try {
      // Step 0: Fetch Extra Live Data
      let depthDataStr = "";
      let fundingDataStr = "";
      let onChainDataStr = "";
      
      try {
          const [orderBook, fundingRate, ethData] = await Promise.all([
              fetchOrderBook(symbol),
              fetchFundingRate(symbol),
              fetchEthereumData(etherscanKey) 
          ]);

          // Update UI State
          setExtraData({
            funding: fundingRate,
            gas: ethData
          });

          if (orderBook) {
             depthDataStr = "Top 10 Bids:\n" + orderBook.bids.slice(0,10).map(b => `Price: ${b[0]}, Vol: ${b[1]}`).join('\n') + 
                            "\nTop 10 Asks:\n" + orderBook.asks.slice(0,10).map(a => `Price: ${a[0]}, Vol: ${a[1]}`).join('\n');
          }

          if (fundingRate) {
             fundingDataStr = `Current Funding Rate: ${fundingRate.lastFundingRate}\nNext Funding Time: ${new Date(fundingRate.nextFundingTime).toLocaleTimeString()}`;
          }

          if (ethData) {
             onChainDataStr = `ETH Gas (Gwei) - Safe: ${ethData.safeGasPrice}, Propose: ${ethData.proposeGasPrice}, Fast: ${ethData.fastGasPrice}`;
          }

      } catch (e) {
          console.warn("Failed to fetch extra market data, proceeding with candles only.", e);
      }

      // Step 1: Tier 1 Analysts
      const tier1Roles = [AgentRole.SHORT_TERM, AgentRole.LONG_TERM, AgentRole.QUANT, AgentRole.ON_CHAIN, AgentRole.MACRO];
      
      tier1Roles.forEach(r => updateAgentStatus(r, AgentStatus.THINKING));
      
      const tier1Results = await Promise.all(tier1Roles.map(async (role) => {
        try {
           let extraContext = undefined;
           if (role === AgentRole.SHORT_TERM) extraContext = depthDataStr;
           if (role === AgentRole.QUANT) extraContext = fundingDataStr;
           if (role === AgentRole.ON_CHAIN) extraContext = onChainDataStr;

           const output = await executeAgent(role, marketData, language, symbol, {}, extraContext);
           updateAgentStatus(role, AgentStatus.COMPLETED, output);
           return { role, output };
        } catch (e) {
           console.error(e);
           updateAgentStatus(role, AgentStatus.ERROR, t.failed);
           return { role, output: "Failed" };
        }
      }));

      await new Promise(r => setTimeout(r, SIMULATION_DELAY));

      // Step 2: Tier 2 Managers
      const managers = [
        { role: AgentRole.TECH_MANAGER, inputs: [AgentRole.SHORT_TERM, AgentRole.LONG_TERM, AgentRole.QUANT] },
        { role: AgentRole.FUND_MANAGER, inputs: [AgentRole.ON_CHAIN, AgentRole.MACRO] }
      ];

      managers.forEach(m => updateAgentStatus(m.role, AgentStatus.THINKING));

      const tier2Results = await Promise.all(managers.map(async (m) => {
         const inputReports: Record<string, string> = {};
         m.inputs.forEach(inputRole => {
             const res = tier1Results.find(r => r.role === inputRole);
             if (res && res.output && res.output !== "Failed") {
                inputReports[inputRole] = res.output;
             } else {
                inputReports[inputRole] = "Analysis unavailable due to error.";
             }
         });

         try {
             const output = await executeAgent(m.role, marketData, language, symbol, inputReports);
             updateAgentStatus(m.role, AgentStatus.COMPLETED, output);
             return { role: m.role, output };
         } catch (e) {
             console.error(e);
             updateAgentStatus(m.role, AgentStatus.ERROR, t.failed);
             return { role: m.role, output: "Failed" };
         }
      }));

      await new Promise(r => setTimeout(r, SIMULATION_DELAY));

      // Step 3: Risk Manager
      updateAgentStatus(AgentRole.RISK_MANAGER, AgentStatus.THINKING);
      
      const riskInputs: Record<string, string> = {};
      tier2Results.forEach(res => {
        if (res.output && res.output !== "Failed") {
            riskInputs[res.role] = res.output;
        } else {
            riskInputs[res.role] = "Manager report unavailable due to error.";
        }
      });

      let riskOutput = "Risk Analysis Failed";
      try {
        riskOutput = await executeAgent(AgentRole.RISK_MANAGER, marketData, language, symbol, riskInputs);
        updateAgentStatus(AgentRole.RISK_MANAGER, AgentStatus.COMPLETED, riskOutput);
      } catch (e) {
        console.error(e);
        updateAgentStatus(AgentRole.RISK_MANAGER, AgentStatus.ERROR, t.failed);
      }

      await new Promise(r => setTimeout(r, SIMULATION_DELAY));

      // Step 4: CEO
      updateAgentStatus(AgentRole.CEO, AgentStatus.THINKING);
      
      const ceoInputs: Record<string, string> = { ...riskInputs };
      ceoInputs[AgentRole.RISK_MANAGER] = riskOutput;

      try {
          const ceoOutputRaw = await executeAgent(AgentRole.CEO, marketData, language, symbol, ceoInputs);
          
          let decision: TradingDecision;
          try {
              const jsonMatch = ceoOutputRaw.match(/\{[\s\S]*\}/);
              const jsonString = jsonMatch ? jsonMatch[0] : ceoOutputRaw;
              decision = JSON.parse(jsonString);
          } catch (e) {
              console.error("JSON Parse error", e);
              decision = {
                  action: "WAIT",
                  confidence: 0,
                  entryPrice: "N/A",
                  stopLoss: "N/A",
                  takeProfit: "N/A",
                  reasoning: "Failed to parse CEO decision format."
              };
          }

          const displayOutput = language === 'zh' 
            ? `决策: ${decision.action}\n置信度: ${decision.confidence}%\n理由: ${decision.reasoning}`
            : `DECISION: ${decision.action}\nCONFIDENCE: ${decision.confidence}%\nREASON: ${decision.reasoning}`;

          updateAgentStatus(AgentRole.CEO, AgentStatus.COMPLETED, displayOutput);
          setFinalDecision(decision);

      } catch (e) {
          console.error(e);
          updateAgentStatus(AgentRole.CEO, AgentStatus.ERROR, t.ceoUnavailable);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    marketData, isAnalyzing, language, t, provider, symbol, 
    deepseekKey, etherscanKey, agentTemps, userPosition, setExtraData
  ]);

  return {
    agents,
    setAgents, // Exported in case we need to update manually (e.g. language switch)
    isAnalyzing,
    finalDecision,
    setFinalDecision,
    error,
    startAnalysis
  };
};

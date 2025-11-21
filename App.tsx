
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { AgentNode } from './components/AgentNode';
import { DecisionModal } from './components/DecisionModal';
import { SettingsModal } from './components/SettingsModal';
import { ConnectionsOverlay } from './components/ConnectionsOverlay';
import { INITIAL_AGENTS, SIMULATION_DELAY } from './constants';
import { AgentRole, AgentState, AgentStatus, Kline, TradingDecision, Language, AIProvider, FundingRate, EthereumData, OrderBook } from './types';
import { fetchMarketData, subscribeToMarketData, fetchOrderBook, fetchFundingRate } from './services/binanceService';
import { fetchEthereumData } from './services/etherscanService';
import { runGeminiAgent } from './services/geminiService';
import { runDeepSeekAgent } from './services/deepseekService';
import { translations } from './locales';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [deepseekKey, setDeepseekKey] = useState<string>('');
  
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [marketData, setMarketData] = useState<Kline[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalDecision, setFinalDecision] = useState<TradingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Live Extra Data State
  const [extraData, setExtraData] = useState<{
    funding: FundingRate | null;
    gas: EthereumData | null;
  }>({ funding: null, gas: null });

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [agentTemps, setAgentTemps] = useState<Record<AgentRole, number>>({
    [AgentRole.SHORT_TERM]: 0.7,
    [AgentRole.LONG_TERM]: 0.7,
    [AgentRole.QUANT]: 0.7,
    [AgentRole.ON_CHAIN]: 0.7,
    [AgentRole.MACRO]: 0.7,
    [AgentRole.TECH_MANAGER]: 0.5,
    [AgentRole.FUND_MANAGER]: 0.5,
    [AgentRole.RISK_MANAGER]: 0.3, 
    [AgentRole.CEO]: 0.2 
  });

  const agentTreeRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Define Topology for Visual Lines
  const connections = [
    { from: AgentRole.SHORT_TERM, to: AgentRole.TECH_MANAGER },
    { from: AgentRole.LONG_TERM, to: AgentRole.TECH_MANAGER },
    { from: AgentRole.QUANT, to: AgentRole.TECH_MANAGER },
    { from: AgentRole.ON_CHAIN, to: AgentRole.FUND_MANAGER },
    { from: AgentRole.MACRO, to: AgentRole.FUND_MANAGER },
    { from: AgentRole.TECH_MANAGER, to: AgentRole.RISK_MANAGER },
    { from: AgentRole.FUND_MANAGER, to: AgentRole.RISK_MANAGER },
    { from: AgentRole.RISK_MANAGER, to: AgentRole.CEO }
  ];

  // Update agents text when language changes
  useEffect(() => {
    setAgents(prevAgents => prevAgents.map(agent => ({
      ...agent,
      name: translations[language].agentNames[agent.id],
      description: translations[language].agentDescs[agent.id]
    })));
  }, [language]);

  // Initialize/Update data when symbol changes
  useEffect(() => {
    let wsUnsubscribe: (() => void) | null = null;
    let active = true; // Flag to avoid race conditions

    const initData = async () => {
      // Clear existing data to show loading state and prevent stale analysis
      setMarketData([]); 
      
      try {
        const data = await fetchMarketData(symbol);
        
        // Only update state if this effect is still active (user hasn't switched symbol again)
        if (active) {
            setMarketData(data);

            wsUnsubscribe = subscribeToMarketData(symbol, (newKline) => {
              if (!active) return;
              setMarketData(prev => {
                if (!prev || prev.length === 0) return [newKline];
                const lastKline = prev[prev.length - 1];
                if (lastKline.time === newKline.time) {
                  const updated = [...prev];
                  updated[updated.length - 1] = newKline;
                  return updated;
                } else if (newKline.time > lastKline.time) {
                  const updated = [...prev.slice(1), newKline];
                  return updated;
                }
                return prev;
              });
            });
        }
      } catch (e) {
        console.error("Failed to initialize market data", e);
      }
    };

    initData();

    return () => {
      active = false;
      if (wsUnsubscribe) {
        wsUnsubscribe();
      }
    };
  }, [symbol]);

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
      return runGeminiAgent(role, data, lang, currentSymbol, reports, temp, extraContext);
    } else {
      return runDeepSeekAgent(role, data, lang, currentSymbol, reports, deepseekKey, temp, extraContext);
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
              fetchEthereumData() 
          ]);

          // Update State for UI
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
              const cleanJson = ceoOutputRaw.replace(/```json/g, '').replace(/```/g, '').trim();
              decision = JSON.parse(cleanJson);
          } catch (e) {
              console.error("JSON Parse error", e);
              decision = {
                  action: "WAIT",
                  confidence: 0,
                  entryPrice: "N/A",
                  stopLoss: "N/A",
                  takeProfit: "N/A",
                  reasoning: "Failed to parse CEO decision format. Raw: " + ceoOutputRaw
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
  }, [marketData, isAnalyzing, agents, language, t, provider, symbol, deepseekKey, agentTemps]);

  const analysts = agents.filter(a => 
    [AgentRole.SHORT_TERM, AgentRole.LONG_TERM, AgentRole.QUANT, AgentRole.ON_CHAIN, AgentRole.MACRO].includes(a.id)
  );
  const managers = agents.filter(a => 
    [AgentRole.TECH_MANAGER, AgentRole.FUND_MANAGER].includes(a.id)
  );
  const riskManager = agents.find(a => a.id === AgentRole.RISK_MANAGER);
  const ceo = agents.find(a => a.id === AgentRole.CEO);

  return (
    <div className="min-h-screen bg-crypto-dark flex flex-col font-sans text-gray-200 selection:bg-crypto-accent selection:text-black">
      <Header 
        language={language} 
        setLanguage={setLanguage} 
        provider={provider} 
        setProvider={setProvider}
        symbol={symbol}
        setSymbol={setSymbol}
        deepseekKey={deepseekKey}
        setDeepseekKey={setDeepseekKey}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 p-6 overflow-hidden flex flex-col lg:flex-row gap-6">
        {/* Left Column: Chart & Controls */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="flex-1 min-h-[300px] bg-crypto-card rounded-lg border border-gray-800 shadow-lg overflow-hidden">
             <Chart data={marketData} language={language} symbol={symbol} />
          </div>

          <div className="bg-crypto-card rounded-lg border border-gray-800 p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4">{t.controlTitle}</h2>
            
            {/* New Market Metrics Panel */}
            {(extraData.funding || extraData.gas) && (
              <div className="mb-4 grid grid-cols-2 gap-3 animate-[fadeIn_0.5s_ease-out]">
                 <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">{t.fundingRate}</div>
                    <div className={`font-mono text-sm font-bold ${parseFloat(extraData.funding?.lastFundingRate || '0') > 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                        {extraData.funding?.lastFundingRate || '--'}
                    </div>
                 </div>
                 <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">{t.gasPrice}</div>
                    <div className="font-mono text-sm font-bold text-blue-400">
                        {extraData.gas?.safeGasPrice || '--'} / {extraData.gas?.fastGasPrice || '--'}
                    </div>
                 </div>
              </div>
            )}

            <p className="text-sm text-gray-400 mb-6">{t.controlDesc}</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-xs">
                Error: {error}
              </div>
            )}

            <button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform active:scale-95 ${
                isAnalyzing 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-crypto-accent to-yellow-500 text-black hover:shadow-[0_0_20px_rgba(252,213,53,0.4)]'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.processing}
                </span>
              ) : (
                t.runButton
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Agent Visualization Tree */}
        <div 
            ref={agentTreeRef}
            className="w-full lg:w-2/3 bg-gray-900/50 rounded-xl border border-gray-800 p-6 relative overflow-y-auto overflow-x-hidden"
        >
          <ConnectionsOverlay 
             connections={connections} 
             containerRef={agentTreeRef} 
             lineColor="#4B5563" 
          />

          <div className="relative z-10 flex flex-col h-full gap-12">
            <div>
              <div className="text-xs font-mono text-gray-500 uppercase mb-4 border-l-2 border-crypto-accent pl-2">
                {t.tier1}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {analysts.slice(0, 3).map(agent => (
                    <AgentNode key={agent.id} agent={agent} language={language} />
                ))}
                <div className="col-span-2 md:col-span-3 flex justify-center gap-4">
                     <div className="w-full md:w-1/3 max-w-[300px]">
                        {analysts[3] && <AgentNode agent={analysts[3]} language={language} />}
                     </div>
                     <div className="w-full md:w-1/3 max-w-[300px]">
                        {analysts[4] && <AgentNode agent={analysts[4]} language={language} />}
                     </div>
                </div>
              </div>
            </div>

            <div>
                <div className="text-xs font-mono text-gray-500 uppercase mb-4 border-l-2 border-blue-500 pl-2">
                    {t.tier2}
                </div>
                <div className="flex justify-center gap-8 md:gap-16">
                    {managers.map(agent => (
                        <div key={agent.id} className="w-full md:w-5/12 max-w-[350px]">
                            <AgentNode agent={agent} language={language} />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="text-xs font-mono text-gray-500 uppercase mb-4 border-l-2 border-red-500 pl-2">
                    {t.tier3}
                </div>
                <div className="flex justify-center">
                     <div className="w-full md:w-1/2 max-w-[400px]">
                        {riskManager && <AgentNode agent={riskManager} language={language} />}
                     </div>
                </div>
            </div>

            <div className="flex-1">
                <div className="text-xs font-mono text-gray-500 uppercase mb-4 border-l-2 border-purple-500 pl-2">
                    {t.tier4}
                </div>
                <div className="flex justify-center h-full">
                    <div className="w-full md:w-2/3 max-w-[500px] h-full">
                        {ceo && <AgentNode agent={ceo} language={language} />}
                    </div>
                </div>
            </div>

          </div>
        </div>
      </main>

      {finalDecision && showSettings === false && (
        <DecisionModal 
          decision={finalDecision} 
          language={language}
          onClose={() => setFinalDecision(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          language={language}
          agentTemps={agentTemps}
          setAgentTemps={setAgentTemps}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default App;

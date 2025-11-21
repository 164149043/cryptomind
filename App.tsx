import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { AgentNode } from './components/AgentNode';
import { DecisionModal } from './components/DecisionModal';
import { SettingsModal } from './components/SettingsModal';
import { INITIAL_AGENTS, SIMULATION_DELAY } from './constants';
import { AgentRole, AgentState, AgentStatus, Kline, TradingDecision, Language, AIProvider } from './types';
import { fetchMarketData } from './services/binanceService';
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
    [AgentRole.RISK_MANAGER]: 0.3, // Low temperature for strict risk control
    [AgentRole.CEO]: 0.2 
  });

  const t = translations[language];

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
    const initData = async () => {
      const data = await fetchMarketData(symbol);
      setMarketData(data);
    };
    initData();
  }, [symbol]);

  const updateAgentStatus = (id: AgentRole, status: AgentStatus, output: string | null = null) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status, output: output || a.output } : a));
  };

  // Wrapper to call correct service
  const executeAgent = async (
    role: AgentRole,
    data: Kline[],
    lang: Language,
    currentSymbol: string,
    reports: Record<string, string> = {}
  ): Promise<string> => {
    const temp = agentTemps[role];
    if (provider === 'gemini') {
      return runGeminiAgent(role, data, lang, currentSymbol, reports, temp);
    } else {
      return runDeepSeekAgent(role, data, lang, currentSymbol, reports, deepseekKey, temp);
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
      // Step 1: Tier 1 Analysts (Parallel)
      const tier1Roles = [AgentRole.SHORT_TERM, AgentRole.LONG_TERM, AgentRole.QUANT, AgentRole.ON_CHAIN, AgentRole.MACRO];
      
      tier1Roles.forEach(r => updateAgentStatus(r, AgentStatus.THINKING));
      
      const tier1Results = await Promise.all(tier1Roles.map(async (role) => {
        try {
           const output = await executeAgent(role, marketData, language, symbol);
           updateAgentStatus(role, AgentStatus.COMPLETED, output);
           return { role, output };
        } catch (e) {
           console.error(e);
           updateAgentStatus(role, AgentStatus.ERROR, t.failed);
           return { role, output: "Failed" };
        }
      }));

      await new Promise(r => setTimeout(r, SIMULATION_DELAY));

      // Step 2: Tier 2 Managers (Parallel)
      const managers = [
        { role: AgentRole.TECH_MANAGER, inputs: [AgentRole.SHORT_TERM, AgentRole.LONG_TERM, AgentRole.QUANT] },
        { role: AgentRole.FUND_MANAGER, inputs: [AgentRole.ON_CHAIN, AgentRole.MACRO] }
      ];

      managers.forEach(m => updateAgentStatus(m.role, AgentStatus.THINKING));

      const tier2Results = await Promise.all(managers.map(async (m) => {
         const inputReports: Record<string, string> = {};
         m.inputs.forEach(inputRole => {
             const res = tier1Results.find(r => r.role === inputRole);
             // Pass the output if it exists and isn't a hard failure, otherwise inform the manager
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
      
      // CEO sees Manager reports AND Risk report
      const ceoInputs: Record<string, string> = { ...riskInputs };
      ceoInputs[AgentRole.RISK_MANAGER] = riskOutput;

      try {
          const ceoOutputRaw = await executeAgent(AgentRole.CEO, marketData, language, symbol, ceoInputs);
          
          // Parse JSON
          let decision: TradingDecision;
          try {
              // Clean up markdown code blocks if the model adds them
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

  // Group agents for UI
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
          <div className="flex-1 min-h-[400px]">
             <Chart data={marketData} language={language} />
          </div>
          
          <div className="bg-crypto-card border border-gray-800 rounded-lg p-6">
             <h3 className="text-lg font-bold text-white mb-4">{t.controlTitle}</h3>
             <p className="text-sm text-gray-500 mb-6">
                {t.controlDesc}
             </p>
             
             {error && (
                 <div className="mb-4 p-3 bg-red-900/30 text-red-400 text-xs rounded border border-red-900">
                     {error}
                 </div>
             )}

             <button
               onClick={startAnalysis}
               disabled={isAnalyzing || marketData.length === 0}
               className={`w-full py-4 rounded font-bold text-black tracking-wider uppercase transition-all
                 ${isAnalyzing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : provider === 'gemini' 
                        ? 'bg-crypto-accent hover:bg-yellow-400 shadow-[0_0_20px_rgba(252,213,53,0.4)]'
                        : 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                 }
               `}
             >
               {isAnalyzing ? (
                   <span className="flex items-center justify-center gap-2">
                       <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       {t.processing}
                   </span>
               ) : `${t.runButton} (${provider === 'gemini' ? 'Gemini' : 'DeepSeek'})`}
             </button>
          </div>
        </div>

        {/* Right Column: Agent Tree */}
        <div className="w-full lg:w-2/3 relative">
            {/* Connecting Lines Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20 hidden lg:block">
               <svg width="100%" height="100%">
                  {/* 5 Analysts to 2 Managers */}
                  {/* Short(1), Trend(2), Quant(3) -> TechManager(1) */}
                  <path d="M 15% 190 L 25% 300" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="1" fill="none" />
                  <path d="M 30% 190 L 25% 300" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="1" fill="none" />
                  <path d="M 50% 190 L 25% 300" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="1" fill="none" />
                  
                  {/* OnChain(4), Macro(5) -> FundManager(2) */}
                  <path d="M 70% 190 L 75% 300" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="1" fill="none" />
                  <path d="M 85% 190 L 75% 300" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="1" fill="none" />

                  {/* Managers to Risk */}
                  <path d="M 25% 500 L 50% 600" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="2" fill="none" />
                  <path d="M 75% 500 L 50% 600" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="2" fill="none" />

                  {/* Risk to CEO */}
                  <path d="M 50% 780 L 50% 840" stroke={provider === 'gemini' ? "#FCD535" : "#9333ea"} strokeWidth="2" fill="none" />
               </svg>
            </div>

            <div className="flex flex-col h-full gap-6">
                {/* Tier 1: Analysts */}
                <div>
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">{t.tier1}</h4>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {analysts.map(agent => (
                            <AgentNode key={agent.id} agent={agent} language={language} />
                        ))}
                    </div>
                </div>

                {/* Tier 2: Managers */}
                <div>
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">{t.tier2}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-0 md:px-12">
                        {managers.map(agent => (
                            <AgentNode key={agent.id} agent={agent} language={language} />
                        ))}
                    </div>
                </div>

                {/* Tier 3: Risk */}
                <div>
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">{t.tier3}</h4>
                    <div className="max-w-xl mx-auto">
                        {riskManager && <AgentNode agent={riskManager} language={language} />}
                    </div>
                </div>

                {/* Tier 4: CEO */}
                <div className="flex-1">
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">{t.tier4}</h4>
                    <div className="max-w-2xl mx-auto h-full pb-4">
                         {ceo && <AgentNode agent={ceo} language={language} />}
                    </div>
                </div>
            </div>
        </div>
      </main>

      {finalDecision && (
        <DecisionModal decision={finalDecision} language={language} onClose={() => setFinalDecision(null)} />
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
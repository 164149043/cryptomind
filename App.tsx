
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { AgentNode } from './components/AgentNode';
import { DecisionModal } from './components/DecisionModal';
import { SettingsModal } from './components/SettingsModal';
import { PositionModal } from './components/PositionModal';
import { ConnectionsOverlay } from './components/ConnectionsOverlay';
import { AgentRole, Kline, Language, AIProvider, FundingRate, EthereumData, UserPosition } from './types';
import { fetchMarketData, subscribeToMarketData } from './services/binanceService';
import { calculateSMA, calculateStdDev } from './services/prompts';
import { translations } from './locales';
import { useAgentWorkflow } from './hooks/useAgentWorkflow';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [deepseekKey, setDeepseekKey] = useState<string>('');
  const [etherscanKey, setEtherscanKey] = useState<string>('BUU1FUTSK35QBMDJJTBB7134IZSP8V1T5H');
  
  // Market Data State
  const [marketData, setMarketData] = useState<Kline[]>([]);
  const [extraData, setExtraData] = useState<{
    funding: FundingRate | null;
    gas: EthereumData | null;
  }>({ funding: null, gas: null });

  // User & UI Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [showPositionModal, setShowPositionModal] = useState(false);
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

  // Use Custom Hook for Workflow
  const {
    agents,
    setAgents,
    isAnalyzing,
    finalDecision,
    setFinalDecision,
    error,
    startAnalysis
  } = useAgentWorkflow({
    marketData,
    symbol,
    language,
    provider,
    deepseekKey,
    etherscanKey,
    agentTemps,
    userPosition,
    setExtraData
  });

  // Topology for Visual Lines
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
  }, [language, setAgents]);

  // Precompute Indicators for the Chart
  const processedMarketData = useMemo(() => {
    if (marketData.length === 0) return [];
    const closes = marketData.map(k => k.close);
    const sma20 = calculateSMA(closes, 20);
    const stdDev20 = calculateStdDev(closes, 20, sma20);
    const upperBand = sma20.map((val, i) => val + (stdDev20[i] * 2));
    const lowerBand = sma20.map((val, i) => val - (stdDev20[i] * 2));

    return marketData.map((k, i) => ({
      ...k,
      sma20: sma20[i],
      upperBand: upperBand[i],
      lowerBand: lowerBand[i]
    }));
  }, [marketData]);

  // Initialize/Update data when symbol changes
  useEffect(() => {
    let wsUnsubscribe: (() => void) | null = null;
    let active = true;

    const initData = async () => {
      setMarketData([]); 
      try {
        const data = await fetchMarketData(symbol);
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
      if (wsUnsubscribe) wsUnsubscribe();
    };
  }, [symbol]);

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
             <Chart data={processedMarketData} language={language} symbol={symbol} />
          </div>

          <div className="bg-crypto-card rounded-lg border border-gray-800 p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4">{t.controlTitle}</h2>
            
            {/* Market Metrics Panel */}
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
            
            {/* User Position Panel */}
            <div className="mb-6 bg-gray-900/50 p-4 rounded border border-dashed border-gray-700">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">{t.currentPosition}</span>
                 {userPosition ? (
                    <button 
                      onClick={() => setShowPositionModal(true)}
                      className="text-[10px] text-crypto-accent hover:underline"
                    >
                      {t.editPosition}
                    </button>
                 ) : (
                    <button 
                      onClick={() => setShowPositionModal(true)}
                      className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-600 transition-colors"
                    >
                      {t.setPosition}
                    </button>
                 )}
               </div>
               
               {userPosition ? (
                  <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                     <div className={`font-bold ${userPosition.type === 'LONG' ? 'text-crypto-green' : 'text-crypto-red'}`}>
                        {userPosition.type}
                     </div>
                     <div className="text-white text-center">
                        ${userPosition.entryPrice}
                     </div>
                     <div className="text-yellow-500 text-right">
                        {userPosition.leverage}x
                     </div>
                     {userPosition.liquidationPrice && (
                        <div className="col-span-3 mt-1 pt-1 border-t border-gray-700/50 text-center flex justify-between px-2">
                           <span className="text-[10px] text-gray-500">{t.liquidationPrice}:</span>
                           <span className="text-red-400 font-bold font-mono">{userPosition.liquidationPrice}</span>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="text-xs text-gray-600 italic text-center py-1">
                    {t.noPosition}
                  </div>
               )}
            </div>

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

      {finalDecision && showSettings === false && showPositionModal === false && (
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
          etherscanKey={etherscanKey}
          setEtherscanKey={setEtherscanKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPositionModal && (
        <PositionModal
          language={language}
          currentPosition={userPosition}
          onSave={setUserPosition}
          onClose={() => setShowPositionModal(false)}
        />
      )}
    </div>
  );
};

export default App;

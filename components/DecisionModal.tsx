import React from 'react';
import { Language, TradingDecision } from '../types';
import { translations } from '../locales';

interface DecisionModalProps {
  decision: TradingDecision;
  language: Language;
  onClose: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({ decision, language, onClose }) => {
  const t = translations[language];
  const isLong = decision.action === 'LONG';
  const isShort = decision.action === 'SHORT';
  
  const colorClass = isLong ? 'text-crypto-green border-crypto-green' : isShort ? 'text-crypto-red border-crypto-red' : 'text-gray-400 border-gray-400';
  const bgClass = isLong ? 'bg-green-900/20' : isShort ? 'bg-red-900/20' : 'bg-gray-800/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-crypto-card border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="bg-gray-900/50 p-6 border-b border-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white font-mono mb-1">{t.executionOrder}</h2>
            <p className="text-gray-500 text-sm">{t.generatedBy}</p>
          </div>
          <div className={`px-4 py-2 rounded border-2 font-bold text-xl tracking-widest ${colorClass} ${bgClass}`}>
            {decision.action}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">{t.confidence}</label>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isLong ? 'bg-crypto-green' : 'bg-crypto-red'}`} 
                    style={{ width: `${decision.confidence}%` }}
                  />
                </div>
                <span className="text-white font-mono font-bold">{decision.confidence}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-900 rounded border border-gray-800">
                <label className="text-[10px] text-gray-500 uppercase block mb-1">{t.entryZone}</label>
                <span className="text-white font-mono font-bold">{decision.entryPrice}</span>
              </div>
              <div className="p-3 bg-gray-900 rounded border border-gray-800">
                 {/* Empty spacer or leverage */}
                 <label className="text-[10px] text-gray-500 uppercase block mb-1">{t.leverage}</label>
                 <span className="text-yellow-500 font-mono font-bold">5x - 10x</span>
              </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-red-900/10 rounded border border-red-900/30">
                <label className="text-[10px] text-red-400 uppercase block mb-1">{t.stopLoss}</label>
                <span className="text-red-200 font-mono font-bold">{decision.stopLoss}</span>
              </div>
              <div className="p-3 bg-green-900/10 rounded border border-green-900/30">
                <label className="text-[10px] text-green-400 uppercase block mb-1">{t.takeProfit}</label>
                <span className="text-green-200 font-mono font-bold">{decision.takeProfit}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/30 p-4 rounded border border-gray-800">
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">{t.reasoning}</label>
            <p className="text-sm text-gray-300 leading-relaxed font-light">
              "{decision.reasoning}"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
          >
            {t.acknowledge}
          </button>
        </div>
      </div>
    </div>
  );
};
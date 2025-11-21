import React from 'react';
import { AgentRole, Language } from '../types';
import { translations } from '../locales';

interface SettingsModalProps {
  language: Language;
  agentTemps: Record<AgentRole, number>;
  setAgentTemps: (temps: Record<AgentRole, number>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  language,
  agentTemps,
  setAgentTemps,
  onClose
}) => {
  const t = translations[language];

  const handleTempChange = (role: AgentRole, val: number) => {
    setAgentTemps({
      ...agentTemps,
      [role]: val
    });
  };

  const renderSlider = (role: AgentRole) => {
    return (
      <div key={role} className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-300 font-medium">{t.agentNames[role]}</label>
          <span className="text-xs font-mono text-crypto-accent bg-gray-800 px-2 py-0.5 rounded">
            {agentTemps[role].toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={agentTemps[role]}
          onChange={(e) => handleTempChange(role, parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-crypto-accent"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md bg-crypto-card border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-white">{t.randomnessSettings}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            {t.randomnessDesc}
          </p>

          {/* Tier 1 */}
          <div className="mb-6">
             <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-1">{t.tier1}</h3>
             {renderSlider(AgentRole.SHORT_TERM)}
             {renderSlider(AgentRole.LONG_TERM)}
             {renderSlider(AgentRole.QUANT)}
             {renderSlider(AgentRole.ON_CHAIN)}
             {renderSlider(AgentRole.MACRO)}
          </div>

          {/* Tier 2 */}
          <div className="mb-6">
             <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-1">{t.tier2}</h3>
             {renderSlider(AgentRole.TECH_MANAGER)}
             {renderSlider(AgentRole.FUND_MANAGER)}
          </div>

          {/* Tier 3 */}
          <div className="mb-6">
             <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-1">{t.tier3}</h3>
             {renderSlider(AgentRole.RISK_MANAGER)}
          </div>

           {/* Tier 4 */}
           <div>
             <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-1">{t.tier4}</h3>
             {renderSlider(AgentRole.CEO)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-end rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 transition-colors text-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
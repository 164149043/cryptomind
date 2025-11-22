
import React, { useState, useEffect } from 'react';
import { Language, AIProvider } from '../types';
import { translations } from '../locales';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  provider: AIProvider;
  setProvider: (p: AIProvider) => void;
  symbol: string;
  setSymbol: (s: string) => void;
  deepseekKey: string;
  setDeepseekKey: (k: string) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  language, 
  setLanguage, 
  provider, 
  setProvider, 
  symbol, 
  setSymbol,
  deepseekKey,
  setDeepseekKey,
  onOpenSettings
}) => {
  const t = translations[language];
  const [tempSymbol, setTempSymbol] = useState(symbol);

  // Sync local state if prop changes
  useEffect(() => {
    setTempSymbol(symbol);
  }, [symbol]);

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempSymbol.trim()) {
        setSymbol(tempSymbol.toUpperCase());
    }
  };

  return (
    <header className="flex flex-col xl:flex-row items-center justify-between px-6 py-4 border-b border-gray-800 bg-crypto-dark gap-4 xl:gap-0">
      <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-start">
        <div className="w-8 h-8 bg-gradient-to-tr from-crypto-accent to-yellow-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(252,213,53,0.3)]">
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono">CryptoMind<span className="text-crypto-accent">.AI</span></h1>
          <p className="text-xs text-gray-500 hidden sm:block">{t.systemDesc}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
        {/* Symbol Input */}
        <form onSubmit={handleSymbolSubmit} className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-xs">Sym:</span>
            </div>
            <input 
                type="text" 
                value={tempSymbol}
                onChange={(e) => setTempSymbol(e.target.value)}
                className="w-full sm:w-40 bg-gray-900 border border-gray-700 text-white text-sm rounded pl-10 pr-3 py-1.5 focus:border-crypto-accent focus:ring-1 focus:ring-crypto-accent outline-none font-mono uppercase transition-all"
                placeholder="BTCUSDT"
            />
        </form>

        {/* DeepSeek Key Input - Only shows when DeepSeek is selected */}
        {provider === 'deepseek' && (
            <div className="w-full sm:w-auto animate-[fadeIn_0.3s_ease-out]">
                <input 
                    type="password" 
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    className="w-full sm:w-32 bg-gray-900 border border-purple-500/50 text-white text-xs rounded px-3 py-2 focus:border-purple-500 outline-none font-mono placeholder-gray-600"
                    placeholder="API Key..."
                    title="Enter your DeepSeek API Key here"
                />
            </div>
        )}

        {/* Provider Toggle */}
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
                onClick={() => setProvider('gemini')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${provider === 'gemini' ? 'bg-crypto-accent text-black shadow' : 'text-gray-400 hover:text-white'}`}
            >
                Gemini
            </button>
            <button 
                onClick={() => setProvider('deepseek')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${provider === 'deepseek' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                DeepSeek
            </button>
        </div>

        <div className="flex items-center gap-2">
             {/* Language Toggle */}
            <button 
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 border border-gray-700 transition-colors"
            >
              <span className="font-mono">{language.toUpperCase()}</span>
            </button>

            {/* Settings Button */}
            <button
                onClick={onOpenSettings}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 border border-gray-700 transition-colors"
                title={t.settings}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>

        <div className="flex items-center gap-2 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-crypto-green animate-pulse"></span>
          <span className="text-xs text-crypto-green font-mono tracking-wider">{t.systemOnline}</span>
        </div>
      </div>
    </header>
  );
};

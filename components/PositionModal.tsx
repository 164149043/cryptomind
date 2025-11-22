
import React, { useState, useEffect } from 'react';
import { Language, UserPosition } from '../types';
import { translations } from '../locales';

interface PositionModalProps {
  language: Language;
  currentPosition: UserPosition | null;
  onSave: (position: UserPosition | null) => void;
  onClose: () => void;
}

export const PositionModal: React.FC<PositionModalProps> = ({
  language,
  currentPosition,
  onSave,
  onClose
}) => {
  const t = translations[language];
  
  const [type, setType] = useState<'LONG' | 'SHORT'>(currentPosition?.type || 'LONG');
  const [entryPrice, setEntryPrice] = useState(currentPosition?.entryPrice || '');
  const [leverage, setLeverage] = useState(currentPosition?.leverage || '');
  const [liquidationPrice, setLiquidationPrice] = useState(currentPosition?.liquidationPrice || '');

  const handleSave = () => {
    if (!entryPrice || !leverage) return;
    onSave({
      type,
      entryPrice,
      leverage,
      liquidationPrice
    });
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-sm bg-crypto-card border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        
        <div className="p-5 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-white">{t.positionSettings}</h2>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Position Type */}
          <div>
             <label className="text-xs text-gray-500 uppercase mb-2 block">{t.positionType}</label>
             <div className="grid grid-cols-2 gap-3">
               <button
                 onClick={() => setType('LONG')}
                 className={`py-2 rounded text-sm font-bold transition-all border ${
                   type === 'LONG' 
                   ? 'bg-green-900/30 text-crypto-green border-crypto-green' 
                   : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                 }`}
               >
                 {t.long}
               </button>
               <button
                 onClick={() => setType('SHORT')}
                 className={`py-2 rounded text-sm font-bold transition-all border ${
                   type === 'SHORT' 
                   ? 'bg-red-900/30 text-crypto-red border-crypto-red' 
                   : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                 }`}
               >
                 {t.short}
               </button>
             </div>
          </div>

          {/* Entry Price */}
          <div>
            <label className="text-xs text-gray-500 uppercase mb-2 block">{t.entryPrice}</label>
            <input 
              type="text"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="e.g. 65000"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:border-crypto-accent outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
              {/* Leverage */}
              <div>
                <label className="text-xs text-gray-500 uppercase mb-2 block">{t.myLeverage}</label>
                <input 
                  type="number"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:border-crypto-accent outline-none font-mono"
                />
              </div>

              {/* Liquidation Price */}
              <div>
                <label className="text-xs text-gray-500 uppercase mb-2 block">{t.liquidationPrice}</label>
                <input 
                  type="text"
                  value={liquidationPrice}
                  onChange={(e) => setLiquidationPrice(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:border-crypto-accent outline-none font-mono"
                />
              </div>
          </div>

        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-between rounded-b-xl">
          <button 
            onClick={handleClear}
            className="px-4 py-2 text-red-400 text-sm font-medium hover:text-red-300"
          >
            {t.clear}
          </button>
          <div className="flex gap-3">
             <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white"
             >
                {t.close}
             </button>
             <button 
                onClick={handleSave}
                className="px-6 py-2 bg-crypto-accent text-black font-bold rounded hover:bg-yellow-500 transition-colors text-sm shadow-lg shadow-yellow-500/20"
             >
                {t.save}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

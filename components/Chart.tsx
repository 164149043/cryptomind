import React, { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Kline, Language } from '../types';
import { translations } from '../locales';

interface ChartProps {
  data: Kline[];
  language: Language;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl font-mono text-xs">
        <p className="text-gray-400 mb-2">{new Date(d.time).toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">O:</span> <span className="text-white">{d.open.toFixed(2)}</span>
          <span className="text-gray-500">H:</span> <span className="text-white">{d.high.toFixed(2)}</span>
          <span className="text-gray-500">L:</span> <span className="text-white">{d.low.toFixed(2)}</span>
          <span className="text-gray-500">C:</span> <span className={`font-bold ${d.close >= d.open ? 'text-crypto-green' : 'text-crypto-red'}`}>{d.close.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const Chart: React.FC<ChartProps> = ({ data, language }) => {
  const t = translations[language];
  
  const processedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      color: d.close >= d.open ? '#0ECB81' : '#F6465D',
      range: [d.low, d.high],
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)]
    }));
  }, [data]);

  const domainMin = useMemo(() => Math.min(...data.map(d => d.low)) * 0.995, [data]);
  const domainMax = useMemo(() => Math.max(...data.map(d => d.high)) * 1.005, [data]);

  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600">{t.loading}</div>;

  return (
    <div className="w-full h-full bg-crypto-card rounded-lg border border-gray-800 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-crypto-accent">BTC/USDT</span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-500">1H</span>
        </h2>
        <div className="text-xs text-gray-500 font-mono">
            {t.last}: <span className="text-white text-sm">{data[data.length-1]?.close.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
             <CartesianGrid stroke="#2B3139" strokeDasharray="3 3" vertical={false} />
             <XAxis 
                dataKey="time" 
                tickFormatter={(tick) => new Date(tick).getHours() + ':00'} 
                stroke="#474D57" 
                tick={{fontSize: 10}}
                minTickGap={30}
             />
             <YAxis 
                domain={[domainMin, domainMax]} 
                orientation="right" 
                stroke="#474D57"
                tick={{fontSize: 10}}
             />
             <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent', stroke: '#474D57', strokeDasharray: '4 4'}} />
             
             {/* High-Low Lines */}
             <Bar dataKey="range" barSize={1} fill="#8884d8">
                {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
             </Bar>
             
             {/* Open-Close Bodies */}
             <Bar dataKey="body" barSize={6} fill="#8884d8">
                {processedData.map((entry, index) => (
                    <Cell key={`body-${index}`} fill={entry.color} />
                ))}
             </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
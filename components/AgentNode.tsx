
import React, { useEffect, useRef, useState } from 'react';
import { AgentState, AgentStatus, AgentRole, Language } from '../types';
import { translations } from '../locales';

interface AgentNodeProps {
  agent: AgentState;
  language: Language;
}

export const AgentNode: React.FC<AgentNodeProps> = ({ agent, language }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[language];
  
  // Typewriter state
  const [displayedText, setDisplayedText] = useState('');

  // Auto-scroll when text updates
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText]);

  // Reset text when thinking or idle
  useEffect(() => {
    if (agent.status === AgentStatus.THINKING || agent.status === AgentStatus.IDLE) {
      setDisplayedText('');
    }
  }, [agent.status]);

  // Typewriter effect logic
  useEffect(() => {
    if (agent.status === AgentStatus.COMPLETED && agent.output) {
        // If we already have text displayed matching output, don't restart
        if (displayedText === agent.output) return;

        setDisplayedText('');
        let index = 0;
        const fullText = agent.output;
        // Speed: 5ms delay, 2 chars per tick = fast but smooth typing
        const speed = 5; 
        const chunk = 2; 

        const interval = setInterval(() => {
            if (index < fullText.length) {
                index += chunk;
                setDisplayedText(fullText.slice(0, index));
            } else {
                setDisplayedText(fullText); // Ensure full text is set
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    } else if (agent.status === AgentStatus.ERROR) {
        setDisplayedText(agent.output || 'Error');
    }
  }, [agent.output, agent.status]);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.THINKING: return 'border-crypto-accent shadow-[0_0_10px_rgba(252,213,53,0.2)] animate-border-flow';
      case AgentStatus.COMPLETED: return 'border-crypto-green shadow-[0_0_5px_rgba(14,203,129,0.2)]';
      case AgentStatus.ERROR: return 'border-crypto-red';
      default: return 'border-gray-800';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return <div className="w-2 h-2 rounded-full bg-gray-600" />;
      case AgentStatus.THINKING: return (
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-crypto-accent animate-bounce"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-crypto-accent animate-bounce delay-75"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-crypto-accent animate-bounce delay-150"></span>
        </div>
      );
      case AgentStatus.COMPLETED: return <div className="w-2 h-2 rounded-full bg-crypto-green" />;
      case AgentStatus.ERROR: return <div className="w-2 h-2 rounded-full bg-crypto-red" />;
    }
  };

  // Special styling for CEO
  const isCEO = agent.id === AgentRole.CEO;

  return (
    <div 
      id={agent.id}
      className={`
      relative flex flex-col bg-crypto-card border rounded-lg p-3 transition-all duration-300 z-10
      ${getStatusColor(agent.status)}
      ${isCEO ? 'h-full min-h-[200px]' : 'h-48'}
    `}>
      <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${isCEO ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
             {isCEO ? (
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             ) : (
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-200">{agent.name}</h3>
            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{agent.description}</p>
          </div>
        </div>
        {getStatusIcon(agent.status)}
      </div>

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto font-mono leading-relaxed custom-scrollbar ${isCEO ? 'text-sm text-white' : 'text-xs text-gray-300'}`}
      >
        {agent.status === AgentStatus.THINKING ? (
            <span className="text-crypto-accent animate-pulse text-xs">{t.analyzing}</span>
        ) : displayedText ? (
             <div className="whitespace-pre-wrap">
                 {displayedText}
             </div>
        ) : (
            <span className="text-gray-700 text-xs">{t.waiting}</span>
        )}
      </div>
    </div>
  );
};

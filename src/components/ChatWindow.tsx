import React, { useRef, useEffect } from 'react';
import { Message, ChatState } from '../types';
import { Bot, User, Zap, Brain, Clock, Timer, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { RichTextRenderer } from './RichTextRenderer';

interface ChatWindowProps {
  title: string;
  mode: 'world' | 'rag';
  state: ChatState;
  onViewArchitecture: () => void;
}

export function ChatWindow({ title, mode, state, onViewArchitecture }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.status, state.isGenerating]);

  const modelMessagesCount = state.messages.filter(m => m.role === 'model').length;
  const isAccuracyMeasured = modelMessagesCount > 0 && !state.isGenerating;
  const accuracyText = isAccuracyMeasured ? (mode === 'world' ? '98%' : '18%') : '0%';
  const dashOffset = isAccuracyMeasured ? (mode === 'world' ? 8.92 : 365.8) : 446.1;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 bg-black/50 shrink-0 min-h-[36px]">
        <div className="flex items-center gap-2">
          {/* Accuracy Circle */}
          <div style={{ width: '22px', height: '22px', position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'scale(0.135802469)',
              transformOrigin: 'top left',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '6.91936px',
              gap: '10.42px',
              isolation: 'isolate',
              width: '162px',
              height: '162px',
              background: 'linear-gradient(177.07deg, #565656 -17.83%, rgba(0, 0, 0, 0.38) 36.4%, #171717 77.3%, #4B4A4A 118.52%)',
              boxShadow: '-5.29578px -5.29578px 10.5916px rgba(0, 0, 0, 0.25), 6.91936px 11.071px 13.8387px rgba(0, 0, 0, 0.56)',
              borderRadius: '13838.7px',
            }}>
              <div style={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '56.2677px',
                gap: '4.34px',
                width: '148.16px',
                height: '148.16px',
                background: 'linear-gradient(182.38deg, #343432 41.94%, #212121 65.39%, #121212 90.51%, #000000 112.28%, #000000 135.73%)',
                boxShadow: 'inset 0px 5.53549px 5.53549px rgba(0, 0, 0, 0.03)',
                borderRadius: '1383.87px',
                flex: 'none',
                order: 0,
                alignSelf: 'stretch',
                flexGrow: 1,
                zIndex: 0,
                position: 'relative'
              }}>
                {mode === 'world' && (
                  <svg 
                    width="148" 
                    height="148" 
                    viewBox="0 0 148 148" 
                    style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0,
                      transform: 'rotate(-90deg)',
                      pointerEvents: 'none',
                      borderRadius: '50%'
                    }}
                  >
                    <defs>
                      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="9.66%" stopColor="#40C764" />
                        <stop offset="87.53%" stopColor="#1F6131" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="74" 
                      cy="74" 
                      r="71" 
                      stroke="rgba(255,255,255,0.04)" 
                      strokeWidth="6" 
                      fill="none" 
                    />
                    <circle 
                      cx="74" 
                      cy="74" 
                      r="71" 
                      stroke="url(#greenGradient)" 
                      strokeWidth="6" 
                      fill="none" 
                      strokeLinecap="round"
                      strokeDasharray="446.1"
                      strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                  </svg>
                )}
                <div style={{
                  width: '81px',
                  height: '45px',
                  fontFamily: 'Figtree, sans-serif',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: '45.0141px',
                  lineHeight: '100%',
                  letterSpacing: '-0.02em',
                  color: mode === 'world' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                  flex: 'none',
                  order: 0,
                  flexGrow: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1
                }}>
                  {accuracyText}
                </div>
                <div style={{
                  width: '48px',
                  height: '12px',
                  fontFamily: 'Figtree, sans-serif',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  fontSize: '11.5714px',
                  lineHeight: '100%',
                  letterSpacing: '-0.02em',
                  color: mode === 'world' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
                  flex: 'none',
                  order: 1,
                  flexGrow: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1
                }}>
                  Accuracy
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-medium text-white leading-tight">{title}</h2>
            <p className="text-[9px] text-neutral-500 font-mono tracking-tight">
              {mode === 'world' ? 'gemini-3.5-flash' : 'gemini-3.5-flash (rag)'}
            </p>
          </div>
        </div>
        
        {/* Latency Stats */}
        <div className="flex items-center gap-2.5">
          {state.timeToFirstTokenMs !== undefined && (
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
              <Clock size={10} />
              <span>TTFT: {(state.timeToFirstTokenMs / 1000).toFixed(2)}s</span>
            </div>
          )}
          {state.latencyMs !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-white bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
              <Timer size={10} />
              <span>{(state.latencyMs / 1000).toFixed(2)}s</span>
            </div>
          )}
          <button 
            onClick={onViewArchitecture}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[10px] font-medium rounded border border-neutral-700 transition-colors"
          >
            {mode === 'world' ? <Brain size={10} /> : <Zap size={10} />}
            Architecture
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {state.messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            {mode === 'world' ? <Brain size={32} /> : <Zap size={32} />}
            <p className="text-sm text-neutral-400 max-w-xs">
              {mode === 'world' 
                ? 'Personal World Model ready. Ask a complex question about your life and data.' 
                : 'Fast RAG pipeline ready. Optimized for low-latency personal data retrieval.'}
            </p>
          </div>
        )}

        {state.messages.map((msg, index) => {
          const isStreaming = state.isGenerating && msg.role === 'model' && index === state.messages.length - 1;
          
          return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Bot size={14} />
              </div>
            )}
            <motion.div 
              animate={isStreaming ? { backgroundColor: ['#000', '#111', '#000'] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className={`max-w-[90%] rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-neutral-100 text-black border border-neutral-200' 
                  : 'bg-black text-[#EDEDED] border border-neutral-800/80 shadow-sm'
              }`}
            >
              <RichTextRenderer content={msg.parts[0].text} />
            </motion.div>
          </motion.div>
          );
        })}

        {state.isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="bg-black border border-neutral-800/80 rounded-xl rounded-tl-sm px-4 py-3 text-[13px] text-neutral-400 flex items-center gap-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
              </span>
              {state.status || 'Thinking...'}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

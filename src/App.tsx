import React, { useState, useRef, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { Mermaid } from './components/Mermaid';
import { Message, ChatState } from './types';
import { ArrowUp, Sparkles, Brain, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [architectureMode, setArchitectureMode] = useState<'world' | 'rag'>('world');
  const [worldState, setWorldState] = useState<ChatState>({ messages: [], isGenerating: false });
  const [ragState, setRagState] = useState<ChatState>({ messages: [], isGenerating: false });
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openArchitecture = (mode: 'world' | 'rag') => {
    setArchitectureMode(mode);
    setIsArchitectureModalOpen(true);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'; // Reset to base height to calculate scrollHeight correctly
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ text: inputValue }],
    };

    const newWorldMessages = [...worldState.messages, userMessage];
    const newRagMessages = [...ragState.messages, userMessage];

    setWorldState(prev => ({ ...prev, messages: newWorldMessages, isGenerating: true, latencyMs: undefined, timeToFirstTokenMs: undefined, status: 'Processing...' }));
    setRagState(prev => ({ ...prev, messages: newRagMessages, isGenerating: true, latencyMs: undefined, timeToFirstTokenMs: undefined, status: 'Processing...' }));
    setInputValue('');

    const startTime = performance.now();

    // Fire both requests concurrently
    Promise.all([
      runChatStream('world', newWorldMessages, startTime, setWorldState),
      runChatStream('rag', newRagMessages, startTime, setRagState)
    ]);
  };

  const runChatStream = async (mode: 'world' | 'rag', messages: Message[], startTime: number, setState: React.Dispatch<React.SetStateAction<ChatState>>) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: messages.map(m => ({ role: m.role, parts: m.parts })) }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      const responseMessageId = crypto.randomUUID();
      let firstTokenReceived = false;
      let streamedText = '';

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, { id: responseMessageId, role: 'model', parts: [{ text: '' }] }]
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.error) {
                streamedText += `\n\n[Error: ${data.error}]`;
                setState(prev => {
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1].parts[0].text = streamedText;
                  return { ...prev, messages: msgs };
                });
                break;
              }

              if (data.status) {
                setState(prev => ({ ...prev, status: data.status }));
              }

              if (data.text) {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  const ttft = performance.now() - startTime;
                  setState(prev => ({ ...prev, timeToFirstTokenMs: ttft, status: undefined }));
                }
                
                streamedText += data.text;
                setState(prev => {
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1].parts[0].text = streamedText;
                  return { ...prev, messages: msgs };
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
          }
        }
      }

      const totalLatency = performance.now() - startTime;
      
      setState(prev => ({ ...prev, isGenerating: false, latencyMs: totalLatency, status: undefined }));

    } catch (error) {
      console.error(`${mode} error:`, error);
      setState(prev => ({ ...prev, isGenerating: false, status: 'Failed' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen bg-black text-[#EDEDED] font-sans flex flex-col selection:bg-neutral-800">
        <div className="flex-1 relative flex flex-col min-h-0">
          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-neutral-800/80">
            <div className="flex-1 flex flex-col min-h-0 h-full">
               <ChatWindow title="Personal World Model" mode="world" state={worldState} onViewArchitecture={() => openArchitecture('world')} />
            </div>
            <div className="flex-1 flex flex-col min-h-0 h-full">
               <ChatWindow title="Personal RAG" mode="rag" state={ragState} onViewArchitecture={() => openArchitecture('rag')} />
            </div>
          </main>

          <footer className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent pointer-events-none z-10 flex flex-col justify-end">
            {worldState.messages.length === 0 && (
              <div className="max-w-4xl w-full mx-auto mb-6 flex flex-wrap gap-2 justify-center pointer-events-auto">
                {[
                  "Two users schedule a movie meetup tomorrow at 8pm. One lives in Tampa, FL and the other in St. Petersburg, FL. How should they coordinate travel given typical traffic and their shared preference for dining before?",
                  "If Alice (who hates loud noises) and Bob (who loves action movies) plan a weekend trip, how might their conflicting preferences affect their itinerary?",
                  "My co-worker in London and I (in San Francisco) need to schedule a recurring sync. Given my morning gym habit and their evening childcare duties, what's the optimal time?"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(suggestion)}
                    className="text-[13px] px-3.5 py-2 bg-black border border-neutral-800 rounded-lg hover:border-neutral-600 transition-colors text-neutral-400 hover:text-neutral-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div 
              className="max-w-4xl w-full mx-auto relative group flex items-center min-h-[56px] pointer-events-auto"
              style={{
                background: 'linear-gradient(220.54deg, #000000 71.65%, #666666 150.21%)',
                boxShadow: '1.95116px 3.12185px 3.90232px rgba(0, 0, 0, 0.56)',
                borderRadius: '3902.32px',
                padding: '5.85px 8px 5.85px 24px',
                gap: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a complex reasoning question..."
                className="flex-1 bg-transparent border-none outline-none resize-none overflow-y-auto w-full text-white placeholder:text-white/50"
                style={{
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 500,
                  fontSize: '14.5px',
                  letterSpacing: '-0.02em',
                  lineHeight: '24px',
                  height: '24px'
                }}
                rows={1}
                disabled={worldState.isGenerating || ragState.isGenerating}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || worldState.isGenerating || ragState.isGenerating}
                className="flex-shrink-0 flex items-center justify-center disabled:opacity-50 transition-opacity"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(177.07deg, #565656 -17.83%, #000000 36.4%, #171717 77.3%, #4B4A4A 118.52%)',
                  boxShadow: '-2px -2px 4px rgba(0, 0, 0, 0.25), 2.61316px 4.18105px 5.22632px rgba(0, 0, 0, 0.56)',
                  borderRadius: '5226.32px',
                  padding: '2.61316px'
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(182.38deg, #343432 41.94%, #212121 65.39%, #121212 90.51%, #000000 112.28%, #000000 135.73%)',
                    boxShadow: 'inset 0px 2.09053px 2.09053px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <ArrowUp size={18} className="text-white" />
                </div>
              </button>
            </div>
          </footer>
        </div>

      <AnimatePresence>
        {isArchitectureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsArchitectureModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border border-neutral-800/80 rounded-2xl shadow-2xl z-10"
            >
              <div className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between z-20">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  {architectureMode === 'world' ? (
                    <><Brain className="text-neutral-400" size={20} /> World Model Architecture</>
                  ) : (
                    <><Zap className="text-neutral-400" size={20} /> General RAG Architecture</>
                  )}
                </h2>
                <button 
                  onClick={() => setIsArchitectureModalOpen(false)}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                {architectureMode === 'world' ? (
                  <div className="space-y-6">
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      A World Model implies the AI has developed a holistic, interconnected understanding of the user's life, context, relationships, and schedule. It does not merely retrieve isolated chunks of text; it maintains a high-dimensional internal representation of how different variables interact over time. 
                      <br /><br />
                      <strong className="text-neutral-200 font-medium">Latency & TTFT Optimization:</strong> To reduce Time To First Token (TTFT), the architecture implements <strong className="text-neutral-200 font-medium">Context Caching</strong> to keep the user's core state warm in memory, avoiding re-computation of large personal graphs. Paired with <strong className="text-neutral-200 font-medium">Speculative Decoding</strong> and aggressive streaming, it begins returning simulated outcomes almost instantly.
                    </p>
                    <div className="bg-black p-6 rounded-lg border border-neutral-800">
                      <Mermaid chart={`
graph TD
    A[Multimodal Streams: Emails, Logs] -->|Continuous Ingestion| B((Internal Graph Representation))
    B -->|Pre-compute & Keep Warm| C{Context Cache layer}
    C -->|Sub-millisecond Access| D{Hypothetical Simulation Engine}
    D -->|Speculative Decoding & Streaming| E[Synthesized, Personalized Answer]
    
    style A fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#d4d4d4
    style B fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff
    style C fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#fff
    style D fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#d4d4d4
    style E fill:#052e16,stroke:#10b981,stroke-width:2px,color:#fff
                      `} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Retrieval-Augmented Generation (RAG) relies on searching an external database (often a vector store) for snippets of text related to a query. It combines these isolated facts with a prompt, but struggles when the answer requires synthesizing variables that were never explicitly written together in a document.
                    </p>
                    <div className="bg-black p-6 rounded-lg border border-neutral-800">
                      <Mermaid chart={`
graph TD
    A[User Query] -->|Embedding| B(Vector Database)
    B -->|Similarity Search| C[Retrieved Text Chunks]
    C -->|Context Injection| D{LLM Prompt}
    D -->|Generates Based Only on Context| E[Answer Limited to Explicit Facts]
    
    style A fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#d4d4d4
    style B fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#fff
    style C fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#d4d4d4
    style D fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#d4d4d4
    style E fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff
                      `} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

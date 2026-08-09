import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, MapPin, Navigation, Info, Table, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

interface RichTextRendererProps {
  content: string;
}

export function RichTextRenderer({ content }: RichTextRendererProps) {
  // We look for blocks like ```json ... ```
  const regex = /```json\n([\s\S]*?)\n```/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }
    
    // Parse the JSON block
    try {
      const data = JSON.parse(match[1]);
      parts.push(<RichElement key={`json-${match.index}`} data={data} />);
    } catch (e) {
      // If parsing fails, just render as code
      parts.push(
        <pre key={`code-${match.index}`} className="p-2 bg-neutral-950 rounded text-xs mt-2 overflow-x-auto text-neutral-400">
          {match[1]}
        </pre>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    );
  }

  // If there's no text (or only one part), we can just return it. 
  // We'll wrap in a div.
  return <div className="space-y-4">{parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>}</div>;
}

function RichElement({ data }: { data: any }) {
  if (!data || !data.ui_type) return <div className="text-red-500 text-xs">Invalid UI Block</div>;

  switch (data.ui_type) {
    case 'chart':
      return (
        <div className="w-full h-48 mt-4 bg-[#0A0A0A] rounded-xl p-4 border border-neutral-800/80 shadow-sm">
          {data.title && <h4 className="text-[13px] font-medium mb-3 text-neutral-200">{data.title}</h4>}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#EDEDED' }}
                cursor={{ fill: '#111' }}
              />
              <Bar dataKey="value" fill="#EDEDED" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
      
    case 'table':
      return (
        <div className="w-full mt-4 bg-[#0A0A0A] rounded-xl border border-neutral-800/80 overflow-hidden shadow-sm">
          <table className="w-full text-[13px] text-left">
            <thead className="bg-black text-neutral-400 border-b border-neutral-800/80">
              <tr>
                {data.headers?.map((h: string, i: number) => (
                  <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
              {data.rows?.map((row: any[], i: number) => (
                <tr key={i} className="hover:bg-neutral-900/50 transition-colors">
                  {row.map((cell: any, j: number) => (
                    <td key={j} className="px-4 py-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      
    case 'calendar':
      return (
        <div className="w-full mt-4 space-y-2">
          {data.events?.map((evt: any, i: number) => (
            <div key={i} className="flex gap-4 bg-[#0A0A0A] p-3.5 rounded-xl border border-neutral-800/80 items-start shadow-sm">
              <div className="flex flex-col items-center justify-center p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg shrink-0 min-w-[50px]">
                <Calendar size={14} className="mb-1" />
                <span className="text-[10px] font-semibold uppercase tracking-tight">{evt.time?.split(' ')[0] || 'TBD'}</span>
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-medium text-white">{evt.title}</h4>
                {evt.time && <p className="text-[13px] text-neutral-500 flex items-center gap-1.5 mt-1 font-mono"><Clock size={12}/> {evt.time}</p>}
                {evt.desc && <p className="text-[13px] text-neutral-400 mt-1.5 leading-relaxed">{evt.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      );
      
    case 'route':
      return (
        <div className="w-full mt-4 bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Navigation size={14} className="text-neutral-400" />
            <span className="text-[11px] font-semibold uppercase tracking-tight">Travel Route</span>
          </div>
          <div className="relative pl-5 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
            <div className="relative">
              <div className="absolute -left-[25px] top-1.5 w-2 h-2 bg-neutral-900 border border-neutral-400 rounded-full z-10" />
              <p className="text-[13px] font-medium text-white">{data.origin}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-0.5">Origin</p>
            </div>
            
            {data.waypoints?.map((wp: string, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-[25px] top-2 w-2 h-2 bg-neutral-900 border border-neutral-600 rounded-full z-10" />
                <p className="text-[13px] text-neutral-400">{wp}</p>
              </div>
            ))}
            
            <div className="relative">
              <div className="absolute -left-[25px] top-1.5 w-2 h-2 bg-white rounded-full z-10" />
              <p className="text-[13px] font-medium text-white">{data.destination}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-0.5">Destination</p>
            </div>
          </div>
          {data.time && (
            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Estimated Travel Time</span>
              <span className="font-semibold text-white">{data.time}</span>
            </div>
          )}
        </div>
      );
      
    case 'map':
      return (
        <div className="w-full mt-4 bg-[#0A0A0A] rounded-xl border border-neutral-800/80 overflow-hidden relative h-48 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] shadow-sm">
          <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay"></div>
          {/* Mock Map View */}
          {data.locations?.map((loc: any, i: number) => (
            <div 
              key={i} 
              className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-full"
              style={{ 
                left: `${50 + (loc.lng || Math.random() * 20 - 10) * 2}%`, 
                top: `${50 - (loc.lat || Math.random() * 20 - 10) * 2}%` 
              }}
            >
              <div className="bg-white text-black p-1.5 rounded-full shadow-md mb-1 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>
                <MapPin size={14} />
              </div>
              <div className="bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-sm border border-neutral-800 whitespace-nowrap">
                {loc.label}
              </div>
            </div>
          ))}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 px-2 py-1.5 rounded border border-neutral-800 text-[10px] text-neutral-400 backdrop-blur-sm shadow-sm">
            <Info size={10} />
            <span>Map View</span>
          </div>
        </div>
      );

    case 'accuracy':
      return (
        <div className="w-full mt-4 bg-[#0A0A0A] rounded-xl p-4 border border-neutral-800/80 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.score >= 85 ? (
                <CheckCircle2 size={14} className="text-neutral-400" />
              ) : (
                <AlertTriangle size={14} className="text-neutral-400" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-tight text-neutral-300">Accuracy Score</span>
            </div>
            <span className="text-sm font-bold text-white">
              {data.score}%
            </span>
          </div>
          
          {(data.ttft_ms || data.cache_hit) && (
            <div className="flex items-center gap-2">
              {data.cache_hit && (
                <span className="bg-neutral-900 text-white border border-neutral-800 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 shadow-sm">
                  <Zap size={10} className="text-neutral-400" /> Context Cache Hit
                </span>
              )}
              {data.ttft_ms && (
                <span className="bg-neutral-900 text-white border border-neutral-800 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 shadow-sm">
                  <Clock size={10} className="text-neutral-400" /> TTFT: {data.ttft_ms}ms
                </span>
              )}
            </div>
          )}

          {data.reasoning && (
            <p className="text-[12px] leading-relaxed text-neutral-400 mt-1 border-t border-neutral-800/80 pt-3">
              {data.reasoning}
            </p>
          )}
        </div>
      );

    default:
      return <div className="text-neutral-500 text-xs italic">Unsupported UI element: {data.ui_type}</div>;
  }
}

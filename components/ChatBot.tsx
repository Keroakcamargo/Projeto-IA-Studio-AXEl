
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bot, User, Loader2, BrainCircuit, CheckCircle2, Target, Instagram, Mic2, Phone, Hash, CalendarDays, CheckSquare, Users, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { getSystemInstruction } from '../services/geminiService';
import { ChatMessage, AgentConfig, ActivityType, SalesGoals, ActivityCardData } from '../types';

interface ChatBotProps {
  agentConfig: AgentConfig;
  onActivityDetected?: (type: ActivityType, count: number, mode: 'add' | 'set', date?: Date) => void;
  onKnowledgeLearned?: (newKnowledge: string) => void;
  onGoalsUpdate?: (goals: SalesGoals) => void;
  todayStats: Record<ActivityType, number>;
  goals: SalesGoals;
}

export interface ChatBotHandle {
  sendMessage: (text: string, files?: { data: string; mimeType: string }[]) => void;
  triggerTool: (tool: 'call' | 'objection') => void;
  addExternalMessage: (text: string) => void;
  updateLiveTranscription: (role: 'user' | 'model', text: string, isFinal: boolean) => void;
}

const ActivityCard: React.FC<{ card: ActivityCardData }> = ({ card }) => {
  const activityIcons: Record<ActivityType, any> = {
    insta_msg: Instagram,
    insta_follow: Users,
    speech: Mic2,
    referidos: UserPlus,
    ligacoes: Phone,
    insta_numbers: Hash,
    meeting_scheduled: CalendarDays,
    meeting_done: CheckSquare
  };
  const Icon = activityIcons[card.type] || Target;
  const progress = card.goal > 0 ? Math.min(100, (card.count / card.goal) * 100) : 0;

  return (
    <div className="mt-8 bg-[#0f172a]/90 border border-cyan-500/40 rounded-[2.5rem] p-8 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 shadow-[0_25px_60px_rgba(6,182,212,0.2)] relative overflow-hidden group border-b-8 border-b-cyan-500/20">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={100} />
      </div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20 shadow-xl">
            <Icon size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Conferência Axel</span>
            <span className="text-sm font-black text-white uppercase tracking-widest">{card.type.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30">
           <ShieldCheck size={20} className="animate-pulse" />
        </div>
      </div>

      <div className="flex items-end justify-between mb-6 relative z-10">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Atualizado</p>
          <div className="flex items-center gap-3">
             <h4 className="text-6xl font-black text-white tracking-tighter">{card.count}</h4>
             <div className="p-1 bg-emerald-500/20 rounded-lg text-emerald-400">
                <ArrowRight size={16} strokeWidth={3} />
             </div>
          </div>
        </div>
        {card.goal > 0 && (
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Meta Diária</p>
             <p className="text-2xl font-black text-cyan-400">{card.goal}</p>
          </div>
        )}
      </div>

      {card.goal > 0 && (
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>Progresso do Dia</span>
             <span className={progress >= 100 ? 'text-emerald-400' : 'text-cyan-400'}>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
            <div className={`h-full transition-all duration-1000 shadow-[0_0_15px_rgba(6,182,212,0.6)] ${progress >= 100 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-center gap-3 text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em] italic relative z-10">
         <CheckCircle2 size={16} /> Registrado e Validado
      </div>
    </div>
  );
};

const HumanizedRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-6">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        const isList = lines.every(line => /^[•\-\*\d\.]/.test(line.trim()));
        if (isList) {
          return (
            <ul key={pIdx} className="space-y-3 pl-2">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[•\-\*\d\.\s]+/, '').trim();
                return (
                  <li key={lIdx} className="flex gap-4 items-start">
                    <span className="text-cyan-500 mt-1.5 shrink-0 text-xs">•</span>
                    <span className="flex-1">{renderLineWithBold(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return <p key={pIdx} className="leading-relaxed text-slate-200">{renderLineWithBold(para)}</p>;
      })}
    </div>
  );
};

const renderLineWithBold = (line: string) => {
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-black text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const ChatBot = forwardRef<ChatBotHandle, ChatBotProps>(({ agentConfig, onActivityDetected, onKnowledgeLearned, todayStats, goals }, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Oi! Sou a ${agentConfig.name}.\n\nPronta para o combate. Me informe suas atividades (ex: "Registra 20 follows") e eu cuidarei do protocolo de registro agora mesmo.` }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const isFirstMessageRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstanceRef = useRef<any>(null);
  
  // Acumulador local para evitar problemas de concorrência com o estado todayStats durante uma mesma resposta
  const localTurnStatsRef = useRef<Record<ActivityType, number>>({ ...todayStats });

  useEffect(() => {
    localTurnStatsRef.current = { ...todayStats };
  }, [todayStats]);

  const activeLiveUserMsgIdx = useRef<number | null>(null);
  const activeLiveModelMsgIdx = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string, files?: { data: string; mimeType: string }[]) => handleSend(text, files),
    triggerTool: (tool: 'call' | 'objection') => {
      const toolPrompts = { 
        call: "Analise meu speech de vendas conforme os manuais.", 
        objection: "Como quebro essa objeção usando o roteiro de 7 passos?" 
      };
      handleSend(toolPrompts[tool]);
    },
    addExternalMessage: (text) => setMessages(prev => [...prev, { role: 'model', text }]),
    updateLiveTranscription: (role, text, isFinal) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const activeIdx = role === 'user' ? activeLiveUserMsgIdx.current : activeLiveModelMsgIdx.current;
        if (activeIdx === null || activeIdx >= newMsgs.length || newMsgs[activeIdx].role !== role) {
          newMsgs.push({ role, text: text || '...', isToolCall: true });
          if (role === 'user') activeLiveUserMsgIdx.current = newMsgs.length - 1;
          else activeLiveModelMsgIdx.current = newMsgs.length - 1;
        } else {
          const currentText = newMsgs[activeIdx].text === '...' ? '' : newMsgs[activeIdx].text;
          newMsgs[activeIdx] = { ...newMsgs[activeIdx], text: currentText + text };
        }
        if (isFinal) {
          if (role === 'user') activeLiveUserMsgIdx.current = null;
          else activeLiveModelMsgIdx.current = null;
        }
        return newMsgs;
      });
    }
  }));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text: string, files?: { data: string; mimeType: string }[]) => {
    if (isStreaming || (!text.trim() && (!files || files.length === 0))) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'model', text: '', activityCards: [] }]);

    try {
      // AI functions removed
      setTimeout(() => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text: "As funções de IA foram desativadas neste aplicativo." };
          return next;
        });
        setIsStreaming(false);
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], text: "Houve um erro. Por favor, tente novamente." };
        return next;
      });
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto overflow-hidden relative">
      {isLearning && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
           <div className="bg-cyan-500/90 backdrop-blur-xl px-6 py-3 rounded-full flex items-center gap-3 border border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
              <BrainCircuit size={18} className="text-white animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Protocolo de Aprendizado Ativo</span>
           </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-24 space-y-20 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-14 h-14 rounded-[1.4rem] bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/20 shadow-2xl self-start mt-2">
                <Bot size={28} />
              </div>
            )}
            <div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative p-8 md:p-12 rounded-[3.5rem] text-xl md:text-2xl leading-relaxed shadow-2xl transition-all ${
                msg.role === 'user' ? 'bg-slate-800/90 text-slate-100 rounded-tr-none border border-slate-700/50' : 'text-slate-200 bg-slate-900/40 border border-slate-800/80 backdrop-blur-3xl'
              }`}>
                {msg.text ? <HumanizedRenderer text={msg.text} /> : (isStreaming && i === messages.length - 1 ? <Loader2 className="animate-spin text-cyan-400" size={28} /> : null)}
                
                {/* Renderização dos Cards de Atividade para Conferência Imediata */}
                {msg.activityCards && msg.activityCards.length > 0 && (
                  <div className="flex flex-col gap-8 mt-10">
                    {msg.activityCards.map((card, cIdx) => (
                      <ActivityCard key={cIdx} card={card} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-14 h-14 rounded-[1.4rem] bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-700/50 self-start mt-2">
                <User size={28} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default ChatBot;

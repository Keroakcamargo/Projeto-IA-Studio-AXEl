import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bot, User, Loader2, Instagram, Mic2, Phone, Hash, CalendarDays, CheckSquare, Users, Mic, Headset, Shield, Sparkles, AlertTriangle } from 'lucide-react';
import { getGeminiPro, getSystemInstruction } from '../services/geminiService';
import { ChatMessage, AgentConfig, ActivityType, SalesGoals, ActivityCardData } from '../types';
import { Type } from "@google/genai";

interface ChatBotProps {
  agentConfig: AgentConfig;
  onActivityDetected?: (type: ActivityType, count: number, mode: 'add' | 'set', date?: Date) => void;
  onGoalsUpdate?: (goals: SalesGoals) => void;
  todayStats: Record<ActivityType, number>;
  goals: SalesGoals;
}

export interface ChatBotHandle {
  sendMessage: (text: string, files?: { data: string; mimeType: string }[]) => void;
  triggerTool: (tool: 'call' | 'objection') => void;
  addExternalMessage: (text: string, activityCards?: ActivityCardData[]) => void;
  updateLiveTranscription: (role: 'user' | 'model', text: string, isFinal: boolean) => void;
}

const activityLabels: Record<ActivityType, { label: string, icon: any, color: string, bgColor: string, hex: string }> = {
  insta_msg: { label: 'MSG Insta', icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10', hex: '#ec4899' },
  insta_follow: { label: 'Follow Insta', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/10', hex: '#a855f7' },
  speech: { label: 'Speeches', icon: Mic2, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', hex: '#06b6d4' },
  ligacoes: { label: 'Ligações', icon: Phone, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', hex: '#eab308' },
  insta_numbers: { label: 'Números Insta', icon: Hash, color: 'text-blue-500', bgColor: 'bg-blue-500/10', hex: '#3b82f6' },
  meeting_scheduled: { label: 'Reuniões Marcadas', icon: CalendarDays, color: 'text-orange-500', bgColor: 'bg-orange-500/10', hex: '#f97316' },
  meeting_done: { label: 'Reuniões Realizadas', icon: CheckSquare, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', hex: '#10b981' }
};

const ChatBot = forwardRef<ChatBotHandle, ChatBotProps>(({ agentConfig, onActivityDetected, onGoalsUpdate, todayStats, goals }, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Oi! Sou a ${agentConfig.name}. Como posso ajudar?` }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstanceRef = useRef<any>(null);
  
  const activeLiveUserMsgIdx = useRef<number | null>(null);
  const activeLiveModelMsgIdx = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string, files?: { data: string; mimeType: string }[]) => handleSend(text, files),
    triggerTool: (tool: 'call' | 'objection') => {
      const toolPrompts = { 
        call: "Quero fazer uma análise de Speech (Call).", 
        objection: "Preciso de ajuda com uma objeção específica." 
      };
      handleSend(toolPrompts[tool]);
    },
    addExternalMessage: (text, activityCards) => {
      setMessages(prev => [...prev, { role: 'model', text, activityCards }]);
    },
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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string, files?: { data: string; mimeType: string }[]) => {
    if (isStreaming || (!text.trim() && (!files || files.length === 0))) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      const ai = getGeminiPro();
      const statsContext = Object.entries(todayStats).map(([k, v]) => `${k}: ${v}`).join(', ');
      const systemPrompt = `${getSystemInstruction(agentConfig)} DASHBOARD ATUAL DO USUÁRIO: ${statsContext}.`;

      if (!chatInstanceRef.current) {
        chatInstanceRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.15, 
            tools: [{
              functionDeclarations: [
                {
                  name: 'manageActivity',
                  description: 'Atualiza o progresso das atividades. Identifique a data (hoje, ontem) no contexto.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['insta_msg', 'insta_follow', 'speech', 'ligacoes', 'insta_numbers', 'meeting_scheduled', 'meeting_done'] },
                      count: { type: Type.NUMBER },
                      mode: { type: Type.STRING, enum: ['add', 'set'] },
                      date: { type: Type.STRING, description: 'Data YYYY-MM-DD conforme o contexto da conversa.' }
                    },
                    required: ['type', 'count', 'mode', 'date']
                  }
                },
                {
                  name: 'showStatusCards',
                  description: 'Exibe cartões visuais das atividades.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      types: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['types']
                  }
                }
              ]
            }]
          }
        });
      }

      let currentInput: any = { message: text };
      if (files && files.length > 0) {
        const parts: any[] = [{ text }];
        files.forEach(f => {
          parts.push({
            inlineData: { data: f.data.split(',')[1] || f.data, mimeType: f.mimeType }
          });
        });
        currentInput = { message: parts };
      }

      const MAX_TURNS = 5;
      let turn = 0;

      while (turn < MAX_TURNS) {
        turn++;
        const streamResponse = await chatInstanceRef.current.sendMessageStream(currentInput);
        let fullText = '';
        let functionCalls: any[] = [];
        let cards: ActivityCardData[] = [];

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullText += chunkText;
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { ...next[next.length - 1], text: fullText.replace(/\*/g, '') };
              return next;
            });
          }
          if (chunk.functionCalls) functionCalls.push(...chunk.functionCalls);
        }

        if (functionCalls.length > 0) {
          const results = functionCalls.map(fc => {
            if (fc.name === 'manageActivity') {
              const { type, count, mode, date } = fc.args as any;
              const targetDate = date ? new Date(date + 'T12:00:00') : new Date();
              onActivityDetected?.(type, count, mode, targetDate);
              const cur = todayStats[type as ActivityType] || 0;
              const newVal = mode === 'add' ? cur + count : count;
              cards.push({ type, count: newVal, goal: goals.targets[type as ActivityType]?.daily || 0 });
              return { functionResponse: { id: fc.id, name: fc.name, response: { result: `SUCESSO. Data: ${date}.` } } };
            }
            if (fc.name === 'showStatusCards') {
              const { types } = fc.args as any;
              types.forEach((t: ActivityType) => cards.push({ type: t, count: todayStats[t] || 0, goal: goals.targets[t]?.daily || 0 }));
              return { functionResponse: { id: fc.id, name: fc.name, response: { result: `SUCESSO.` } } };
            }
            return { functionResponse: { id: fc.id, name: fc.name, response: { result: "OK" } } };
          });
          
          if (cards.length > 0) {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, activityCards: [...(last.activityCards || []), ...cards] };
              return next;
            });
          }
          currentInput = { message: results };
        } else {
          break;
        }
      }
    } catch (e: any) {
      console.error("Erro na API Gemini:", e);
      const isQuotaError = e.message?.includes('429') || e.status === 429;
      setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { 
            ...next[next.length - 1], 
            text: isQuotaError 
              ? "Minha rede neural atingiu o limite de cota temporário. Aguarde um momento para sincronizarmos novamente." 
              : `Axel encontrou um erro na rede neural. (${e.message || 'Erro desconhecido'})` 
          };
          return next;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-12 space-y-12 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/20 shadow-lg">
                <Bot size={20} />
              </div>
            )}
            <div className={`flex flex-col gap-4 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative p-5 md:p-6 rounded-[2rem] text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-slate-100 rounded-tr-none shadow-xl' 
                  : 'text-slate-200 bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm shadow-inner'
              }`}>
                {msg.text || (isStreaming && i === messages.length - 1 && !msg.activityCards ? <Loader2 className="animate-spin text-cyan-400" size={18} /> : msg.text)}
                
                {msg.isToolCall && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <div className="flex gap-0.5 items-center">
                      <div className="w-0.5 h-2 bg-cyan-500 animate-pulse" />
                      <div className="w-0.5 h-3 bg-cyan-500 animate-pulse delay-75" />
                    </div>
                    <span className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em]">Link Neural Persistido</span>
                  </div>
                )}
                
                {msg.text?.includes("limite de cota") && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <AlertTriangle className="text-yellow-500" size={14} />
                    <span className="text-[10px] text-yellow-200/80 font-bold uppercase tracking-widest">Rate Limit Exceeded</span>
                  </div>
                )}
              </div>

              {msg.activityCards && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {msg.activityCards.map((card, idx) => (
                    <div key={idx} className="bg-[#0b1222]/95 border border-slate-800 rounded-3xl p-5 flex flex-col gap-3 shadow-2xl animate-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${activityLabels[card.type].bgColor} ${activityLabels[card.type].color}`}>
                            {React.createElement(activityLabels[card.type].icon, { size: 16 })}
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{activityLabels[card.type].label}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{card.count}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">/ {card.goal}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${activityLabels[card.type].color.replace('text', 'bg')} transition-all duration-1000 shadow-lg`} style={{ width: `${Math.min(100, (card.count / (card.goal || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-700/50 shadow-lg">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default ChatBot;
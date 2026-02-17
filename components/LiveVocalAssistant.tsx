
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Loader2, XCircle, Cpu, Sparkles } from 'lucide-react';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData } from '../services/geminiService';
import { AgentConfig, ActivityType, SalesGoals, ActivityCardData } from '../types';

interface LiveVocalAssistantProps {
  onActivityDetected: (type: ActivityType, count: number, mode: 'add' | 'set', date?: Date) => void;
  onVoiceResponseGenerated?: (text: string, cards?: ActivityCardData[]) => void;
  onTranscriptionUpdate?: (role: 'user' | 'model', text: string, isFinal: boolean) => void;
  agentConfig: AgentConfig;
  todayStats: Record<ActivityType, number>;
  goals: SalesGoals;
  userName: string;
}

const AxelHologram: React.FC<{ 
  userVol: number; 
  sysVol: number; 
  isActive: boolean 
}> = ({ userVol, sysVol, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    let time = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth * dpr;
      const h = window.innerHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      time += 0.012;
      
      const cx = w / 2;
      const cy = h / 2 + (200 * dpr); 
      const volume = Math.max(sysVol * 1.5, userVol * 1.2);
      const intensity = 0.9 + volume * 1.8;
      
      const scale = (Math.min(w, h) / 1200) * dpr;

      const auraGrad = ctx.createRadialGradient(cx, cy - 350 * scale, 0, cx, cy - 350 * scale, 550 * scale * intensity);
      auraGrad.addColorStop(0, `rgba(34, 211, 238, ${0.07 * intensity})`);
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, w, h);

      const drawAxelProfile = (s: number, ox: number, oy: number) => {
        ctx.beginPath();
        ctx.moveTo(cx - 160 * s + ox, cy + 400 * s + oy);
        ctx.bezierCurveTo(cx - 140 * s + ox, cy + 180 * s + oy, cx - 120 * s + ox, cy + 150 * s + oy, cx - 70 * s + ox, cy + 110 * s + oy);
        ctx.bezierCurveTo(cx - 60 * s + ox, cy + 70 * s + oy, cx - 55 * s + ox, cy + 50 * s + oy, cx - 50 * s + ox, cy + 10 * s + oy);
        ctx.bezierCurveTo(cx - 50 * s + ox, cy + 45 * s + oy, cx - 30 * s + ox, cy + 70 * s + oy, cx + ox, cy + 75 * s + oy);
        ctx.bezierCurveTo(cx + 30 * s + ox, cy + 70 * s + oy, cx + 50 * s + ox, cy + 45 * s + oy, cx + 50 * s + ox, cy + 10 * s + oy);
        ctx.moveTo(cx + 45 * s + ox, cy + 5 * s + oy);
        ctx.bezierCurveTo(cx + 100 * s + ox, cy - 10 * s + oy, cx + 105 * s + ox, cy - 160 * s + oy, cx + 10 * s + ox, cy - 240 * s + oy);
        ctx.bezierCurveTo(cx - 90 * s + ox, cy - 180 * s + oy, cx - 100 * s + ox, cy - 10 * s + oy, cx - 45 * s + ox, cy + 5 * s + oy);
        ctx.moveTo(cx + 10 * s + ox, cy - 240 * s + oy);
        ctx.bezierCurveTo(cx + 60 * s + ox, cy - 255 * s + oy, cx + 90 * s + ox, cy - 180 * s + oy, cx + 95 * s + ox, cy - 30 * s + oy);
        ctx.moveTo(cx + 10 * s + ox, cy - 240 * s + oy);
        ctx.bezierCurveTo(cx - 60 * s + ox, cy - 255 * s + oy, cx - 90 * s + ox, cy - 180 * s + oy, cx - 95 * s + ox, cy - 30 * s + oy);
        ctx.moveTo(cx + 50 * s + ox, cy + 10 * s + oy);
        ctx.bezierCurveTo(cx + 55 * s + ox, cy + 50 * s + oy, cx + 60 * s + ox, cy + 70 * s + oy, cx + 70 * s + ox, cy + 110 * s + oy);
        ctx.bezierCurveTo(cx + 120 * s + ox, cy + 150 * s + oy, cx + 140 * s + ox, cy + 180 * s + oy, cx + 160 * s + ox, cy + 400 * s + oy);
      };

      ctx.save();
      const drift = Math.sin(time * 0.5) * 4;
      ctx.translate(drift, 0);
      drawAxelProfile(scale * 1.01, 0, 0);
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.07 * intensity})`;
      ctx.lineWidth = 8 * dpr;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawAxelProfile(scale, 0, 0);
      const grad = ctx.createLinearGradient(cx, cy - 200 * scale, cx, cy + 300 * scale);
      grad.addColorStop(0, `rgba(15, 23, 42, 0.98)`);
      grad.addColorStop(0.5, `rgba(34, 211, 238, ${0.02 * intensity})`);
      grad.addColorStop(1, `rgba(15, 23, 42, 0.9)`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.35 + volume})`;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawAxelProfile(scale, 0, 0);
      ctx.clip();
      ctx.strokeStyle = `rgba(34, 211, 238, 0.08)`;
      ctx.lineWidth = 0.5 * dpr;
      for (let i = -700; i < 700; i += 7) {
        const yPos = cy + (i * scale) + ((time * 50) % (7 * scale));
        ctx.beginPath();
        ctx.moveTo(cx - 350 * scale, yPos);
        ctx.lineTo(cx + 350 * scale, yPos);
        ctx.stroke();
      }
      ctx.restore();

      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [isActive, userVol, sysVol]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100vw', height: '100vh' }} />
    </div>
  );
};

const LiveVocalAssistant: React.FC<LiveVocalAssistantProps> = ({ 
  onActivityDetected, 
  onVoiceResponseGenerated, 
  onTranscriptionUpdate,
  agentConfig, 
  todayStats, 
  goals,
  userName
}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [userVol, setUserVol] = useState(0);
  const [sysVol, setSysVol] = useState(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e) {}
      audioCtxRef.current = null;
    }
    for (const source of sourcesRef.current) try { source.stop(); } catch(e) {}
    sourcesRef.current.clear();
    setIsActive(false);
    setStatus('idle');
    setUserVol(0);
    setSysVol(0);
    nextStartTimeRef.current = 0;
  }, []);

  const initLive = async () => {
    try {
      setStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (outCtx.state === 'suspended') await outCtx.resume();
      audioCtxRef.current = outCtx;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const statsContext = Object.entries(todayStats).map(([k, v]) => `${k}: ${v}`).join(', ');
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `Você é a Axel. Supervisora e Mentora.
            REFERÊNCIA: Hoje é ${dateStr}.
            1. SUPERVISORA: Monitore metas e dê feedbacks precisos.
            2. MENTORA: Ensine estratégias baseadas nos playbooks.
            3. ASSISTENTE: Use 'manageActivity'. EXTRAIA A DATA CORRETA (ex: se o usuário disser ontem, use a data de ontem).
            4. HELPER: Responda apenas via manuais operacionais.
            
            SAUDAÇÃO: "Oi, ${userName}. Axel conectada. O que realizamos?"
            DADOS ATUAIS: ${statsContext}.`,
          tools: [{
            functionDeclarations: [
              {
                name: 'manageActivity',
                description: 'Atualiza o progresso. É obrigatório identificar a data correta no formato YYYY-MM-DD.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['insta_msg', 'insta_follow', 'insta_numbers', 'meeting_scheduled', 'meeting_done', 'speech', 'ligacoes'] },
                    count: { type: Type.NUMBER },
                    mode: { type: Type.STRING, enum: ['add', 'set'] },
                    date: { type: Type.STRING, description: 'Data YYYY-MM-DD. Identifique se é hoje ou ontem pelo contexto.' }
                  },
                  required: ['type', 'count', 'mode', 'date']
                }
              },
              {
                name: 'showStatusCards',
                description: 'Mostra cartões de status no chat.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    types: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['types']
                }
              },
              {
                name: 'closeSession',
                description: 'Desconecta.',
                parameters: { type: Type.OBJECT, properties: {} }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsActive(true);

            const inCtx = new AudioContext({ sampleRate: 16000 });
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const floatData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(floatData.length);
              let sum = 0;
              for (let i = 0; i < floatData.length; i++) {
                pcmData[i] = floatData[i] * 32768;
                sum += Math.abs(floatData[i]);
              }
              setUserVol(sum / floatData.length);
              sessionPromise.then(s => {
                if (s) s.sendRealtimeInput({
                  media: { data: encode(new Uint8Array(pcmData.buffer)), mimeType: 'audio/pcm;rate=16000' }
                });
              }).catch(() => {});
            };
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              onTranscriptionUpdate?.('user', message.serverContent.inputTranscription.text, false);
            }
            if (message.serverContent?.outputTranscription) {
              onTranscriptionUpdate?.('model', message.serverContent.outputTranscription.text, false);
            }
            if (message.serverContent?.turnComplete) {
              onTranscriptionUpdate?.('model', '', true);
            }

            if (message.toolCall) {
              const activityCards: ActivityCardData[] = [];
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'manageActivity') {
                  const { type, count, mode, date } = fc.args as any;
                  const targetDate = date ? new Date(date + 'T12:00:00') : new Date();
                  onActivityDetected(type as ActivityType, count, mode as 'add' | 'set', targetDate);
                  const newVal = mode === 'add' ? (todayStats[type as ActivityType] || 0) + count : count;
                  activityCards.push({ type: type as ActivityType, count: newVal, goal: goals.targets[type as ActivityType]?.daily || 0 });
                  const result = `SUCESSO. Data registrada: ${date}.`;
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                } else if (fc.name === 'showStatusCards') {
                  const { types } = fc.args as any;
                  types.forEach((t: ActivityType) => {
                    activityCards.push({ type: t, count: todayStats[t] || 0, goal: goals.targets[t]?.daily || 0 });
                  });
                  const result = `Exibindo cartões.`;
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                } else if (fc.name === 'closeSession') {
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } }));
                  stopSession();
                }
              }
              if (activityCards.length > 0) {
                onVoiceResponseGenerated?.("Atividades coordenadas no Link Neural.", activityCards);
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioCtxRef.current) {
              const ctx = audioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setSysVol(0);
              };
              sourcesRef.current.add(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              setSysVol(0.6);
            }
          },
          onerror: (e) => stopSession(),
          onclose: () => stopSession()
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopSession(); }
  };

  const VocalInterface = (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-between overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <AxelHologram userVol={userVol} sysVol={sysVol} isActive={isActive} />
      
      <div className="w-full flex justify-between items-start p-10 md:p-16 relative z-50">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl backdrop-blur-3xl shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <Cpu size={32} className="text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black text-white uppercase tracking-[0.6em]">Axel</h3>
            <p className="text-[9px] text-cyan-500 font-mono font-bold mt-1 tracking-widest animate-pulse uppercase">Link Neural Ativo</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-col items-center gap-8 p-12 relative z-50">
        <div className="flex flex-col md:flex-row items-center gap-10 w-full">
          <div className="flex-1 w-full bg-slate-950/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
              <div className="text-left">
                <p className="text-xs text-white font-black uppercase tracking-[0.4em]">Supervisão Ativa</p>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">Conexão direta com Axel</p>
              </div>
            </div>
            
            <div className="flex gap-1.5 h-10 items-center">
              {[...Array(24)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 rounded-full bg-cyan-400 transition-all duration-75" 
                  style={{ 
                    height: `${10 + (sysVol > 0 ? sysVol : userVol) * 100 * (1 - Math.abs(i-11.5)/12)}%`,
                    opacity: 0.2 + (sysVol > 0 ? sysVol : userVol) * 0.8
                  }} 
                />
              ))}
            </div>
          </div>
          
          <button 
            onClick={stopSession} 
            className="group flex items-center gap-6 px-12 py-8 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 rounded-[2rem] transition-all duration-300 shadow-[0_0_40px_rgba(220,38,38,0.1)] active:scale-95 shrink-0"
          >
            <XCircle size={32} className="text-red-500" />
            <div className="text-left">
              <p className="text-sm font-black text-white uppercase tracking-widest">Encerrar</p>
              <p className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest mt-0.5">Link Offline</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={isActive ? stopSession : initLive} 
        className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
          isActive 
            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.5)] rotate-90' 
            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
        }`}
      >
        {status === 'connecting' ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
        {!isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-75 pointer-events-none" />
        )}
      </button>
      {isActive && createPortal(VocalInterface, document.body)}
    </>
  );
};

export default LiveVocalAssistant;

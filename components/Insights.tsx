
import React, { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb, Plus, BookOpen, PencilLine, FileText, 
  Globe, Trash2, Search, Send, Loader2, Sparkles, 
  ChevronRight, ArrowLeft, Layers, MessageSquare, Brain, X, 
  Link as LinkIcon, Mic, MicOff, StopCircle, FileUp, AlertCircle,
  FileWarning, ShieldAlert
} from 'lucide-react';
import { db } from '../services/firebase';
import { 
  collection, query, onSnapshot, addDoc, 
  doc, updateDoc, deleteDoc, Timestamp, orderBy, getDocs 
} from "firebase/firestore";
import { getGeminiPro } from '../services/geminiService';
import { User, Insight, InsightSource, InsightNote } from '../types';

interface InsightsProps {
  currentUser: User;
}

const Insights: React.FC<InsightsProps> = ({ currentUser }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [sources, setSources] = useState<InsightSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newInsightTitle, setNewInsightTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [activeNote, setActiveNote] = useState<InsightNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para Gravação de Nota
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [isTranscribingNote, setIsTranscribingNote] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Carregar Insights
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'users', currentUser.uid, 'notebooks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Insight));
      setInsights(data);
      setLoading(false);
      setPermissionError(null);
    }, (err) => {
      console.error("Erro ao carregar insights:", err);
      if (err.code === 'permission-denied') {
        setPermissionError("O Firebase bloqueou o acesso. Certifique-se de que as Regras de Segurança do Firestore permitem a criação de 'notebooks' para o seu UID.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Carregar Sources do Insight Ativo
  useEffect(() => {
    if (!activeInsight || !currentUser?.uid) {
      setSources([]);
      return;
    }
    const q = query(collection(db, 'users', currentUser.uid, 'notebooks', activeInsight.id, 'sources'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InsightSource));
      setSources(data);
    }, (err) => {
      console.error("Erro ao carregar sources:", err);
    });
    return () => unsubscribe();
  }, [activeInsight, currentUser?.uid]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatHistory]);

  const handleCreateInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsightTitle.trim() || !currentUser?.uid) return;
    
    setIsSaving(true);
    try {
      const newNB = {
        title: newInsightTitle,
        description: "Repositório de inteligência Axel",
        notes: [],
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'users', currentUser.uid, 'notebooks'), newNB);
      setNewInsightTitle('');
      setIsCreating(false);
      setPermissionError(null);
    } catch (err: any) { 
      console.error("Erro ao criar insight:", err);
      if (err.code === 'permission-denied') {
        alert("ERRO DE PERMISSÃO: Sua conta não tem permissão para escrever no Firestore. Verifique as 'Security Rules' no Console do Firebase.");
      } else {
        alert("Erro de conexão. Tente novamente.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLinkSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !activeInsight || !currentUser?.uid) return;
    
    const name = newLinkUrl.replace(/^https?:\/\//, '').split('/')[0];
    const content = `Referência Web: ${newLinkUrl}`;
    
    saveSource(name, content, 'link');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const handleFileClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*'; 
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 1048576) {
        alert("O arquivo excede 1MB. Use links externos para arquivos grandes.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const fullData = ev.target?.result as string;
        const base64 = fullData.split(',')[1];
        saveSource(file.name, base64, 'file', file.type);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveSource = async (name: string, content: string, type: 'file' | 'link', mimeType?: string) => {
    if (!activeInsight || !currentUser?.uid) return;
    
    setIsSaving(true);
    try {
      const newSourceData = {
        name,
        type,
        mimeType: mimeType || (type === 'link' ? 'text/plain' : 'application/octet-stream'),
        content,
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'notebooks', activeInsight.id, 'sources'), newSourceData);
      generateSummary({ id: docRef.id, ...newSourceData } as InsightSource);
    } catch (err: any) {
      console.error("Erro ao salvar fonte:", err);
      if (err.code === 'permission-denied') {
        alert("ERRO DE PERMISSÃO: Não foi possível salvar o arquivo. Verifique as regras de segurança no Firebase.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const generateSummary = async (source: InsightSource) => {
    if (!activeInsight || !currentUser?.uid) return;
    try {
      const ai = getGeminiPro();
      let response;

      if (source.type === 'file' && source.mimeType) {
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { inlineData: { data: source.content, mimeType: source.mimeType } },
            { text: "Resuma este material de forma executiva para um vendedor." }
          ]
        });
      } else {
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Resuma estrategicamente: ${source.content}`,
        });
      }

      const summary = response.text || "Conteúdo processado.";
      await updateDoc(doc(db, 'users', currentUser.uid, 'notebooks', activeInsight.id, 'sources', source.id), { summary });
    } catch (e) { 
      console.error("Erro no resumo Axel:", e);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeInsight || !currentUser?.uid) return;
    const text = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    setIsAILoading(true);

    try {
      const ai = getGeminiPro();
      const context = sources
        .map(s => `FONTE [${s.name}]: ${s.summary || 'Em processamento.'}`)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Você é Axel. Use os resumos como base:\n\n${context}\n\nPERGUNTA: ${text}`,
      });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || "Erro na consulta." }]);
    } catch (e) { console.error(e); } finally {
      setIsAILoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!activeInsight || !currentUser?.uid) return;
    const newNote: InsightNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Nova Nota Tática",
      content: "",
      updatedAt: new Date()
    };
    const updatedNotes = [...(activeInsight.notes || []), newNote];
    await updateDoc(doc(db, 'users', currentUser.uid, 'notebooks', activeInsight.id), {
      notes: updatedNotes
    });
    setActiveInsight(prev => prev ? { ...prev, notes: updatedNotes } : null);
    setActiveNote(newNote);
  };

  const saveNote = async (content: string) => {
    if (!activeInsight || !activeNote || !currentUser?.uid) return;
    const updatedNotes = activeInsight.notes.map(n => n.id === activeNote.id ? { ...n, content, updatedAt: new Date() } : n);
    await updateDoc(doc(db, 'users', currentUser.uid, 'notebooks', activeInsight.id), {
      notes: updatedNotes
    });
    setActiveInsight(prev => prev ? { ...prev, notes: updatedNotes } : null);
  };

  const startRecordingNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeNoteAudio(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecordingNote(true);
    } catch (err) { alert("Microfone não autorizado."); }
  };

  const stopRecordingNote = () => {
    if (mediaRecorderRef.current && isRecordingNote) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecordingNote(false);
    }
  };

  const transcribeNoteAudio = async (blob: Blob) => {
    setIsTranscribingNote(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const ai = getGeminiPro();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: base64, mimeType: 'audio/webm' } },
          { text: "Transcreva este áudio para uma nota profissional." }
        ]
      });
      if (activeNote) {
        const trans = response.text || "";
        const newContent = activeNote.content ? activeNote.content + "\n" + trans : trans;
        setActiveNote({ ...activeNote, content: newContent });
      }
    } catch (err) { console.error(err); } finally { setIsTranscribingNote(false); }
  };

  const closeInsight = () => { setActiveInsight(null); setChatHistory([]); };

  if (loading && insights.length === 0 && !permissionError) return <div className="flex-1 flex items-center justify-center text-blue-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col gap-6">
      {permissionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in fade-in">
          <ShieldAlert className="text-red-500 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-red-400 uppercase tracking-widest">Protocolo de Segurança Ativado</h4>
            <p className="text-xs text-red-200/60 leading-relaxed">{permissionError}</p>
          </div>
        </div>
      )}

      {!activeInsight ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <div className="text-center space-y-4 mb-12 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-400 mx-auto border border-blue-500/20 shadow-2xl group">
              <Brain size={40} className="group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-widest">Axel Insights</h1>
            <p className="text-slate-400 max-w-md mx-auto italic">Processamento neural de playbooks e conhecimento de elite.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => setIsCreating(true)}
              className="p-8 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[2.5rem] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Novo Repositório</span>
            </button>

            {insights.map(nb => (
              <button 
                key={nb.id} onClick={() => setActiveInsight(nb)}
                className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] hover:border-blue-500/30 text-left space-y-4 transition-all group relative overflow-hidden"
              >
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 w-fit"><BookOpen size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-blue-400 truncate">{nb.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{(nb.notes || []).length} notas ativas</p>
                </div>
              </button>
            ))}
          </div>

          {isCreating && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#0b0f1a] border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Ativar Insight</h2>
                  <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleCreateInsight} className="space-y-6">
                  <input autoFocus type="text" required value={newInsightTitle} onChange={e => setNewInsightTitle(e.target.value)} placeholder="Título do Repositório" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50" />
                  <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Sincronizar"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between bg-slate-900/20 p-4 rounded-3xl border border-slate-800/50">
            <button onClick={closeInsight} className="flex items-center gap-2 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest"><ArrowLeft size={16} /> Voltar</button>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">{activeInsight.title}</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => deleteDoc(doc(db, 'users', currentUser.uid, 'notebooks', activeInsight.id)).then(() => closeInsight())} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={18} /></button>
              <button onClick={closeInsight} className="p-2.5 bg-slate-800 rounded-xl"><X size={20} /></button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
            {/* FONTES */}
            <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de Conhecimento</span>
                  <div className="flex gap-2">
                    <button onClick={handleFileClick} disabled={isSaving} className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-600/30">
                      {isSaving ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                    </button>
                    <button onClick={() => setIsAddingLink(true)} className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-600/30"><Globe size={16} /></button>
                  </div>
               </div>
               
               <div className="space-y-3">
                  {sources.length === 0 && (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-slate-600 uppercase">Sem fontes anexadas</p>
                    </div>
                  )}
                  {sources.map(source => (
                    <div key={source.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2 group relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          {source.type === 'file' ? <FileText size={14} className="text-blue-400" /> : <Globe size={14} className="text-emerald-400" />}
                          <span className="text-[10px] font-bold text-slate-200 truncate">{source.name}</span>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'users', currentUser.uid, 'notebooks', activeInsight.id, 'sources', source.id))} className="p-1 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed italic line-clamp-3">
                        {source.summary || (isSaving ? "Processando material..." : "Aguardando análise Axel...")}
                      </p>
                    </div>
                  ))}
               </div>
            </div>

            {/* CHAT */}
            <div className="lg:col-span-6 flex flex-col bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] overflow-hidden">
               <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <Brain size={32} className="text-slate-800" />
                      <p className="text-xs text-slate-500 font-medium italic">Anexe fontes e pergunte à Axel sobre o conteúdo estrategicamente.</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`p-4 rounded-2xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-200 bg-slate-900/50 border border-slate-800/50'}`}>
                          {msg.text}
                       </div>
                    </div>
                  ))}
                  {isAILoading && (
                    <div className="flex justify-start">
                      <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                        <Loader2 size={18} className="animate-spin text-blue-400" />
                      </div>
                    </div>
                  )}
               </div>
               <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex gap-2">
                  <input type="text" placeholder="Consultar inteligência..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50" />
                  <button onClick={handleSendChat} disabled={isAILoading || sources.length === 0} className="p-3 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:grayscale">
                    <Send size={18} />
                  </button>
               </div>
            </div>

            {/* NOTAS */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas Estratégicas</span>
                  <button onClick={handleAddNote} className="p-2 bg-purple-600/20 text-purple-400 rounded-xl hover:bg-purple-600/30"><PencilLine size={16} /></button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {activeInsight.notes?.length === 0 && (
                    <p className="text-[10px] text-slate-600 text-center py-4 italic">Nenhuma nota tática.</p>
                  )}
                  {activeInsight.notes?.map(note => (
                    <button key={note.id} onClick={() => setActiveNote(note)} className={`w-full p-4 text-left rounded-2xl border transition-all ${activeNote?.id === note.id ? 'bg-blue-500/10 border-blue-500/30 shadow-lg' : 'bg-slate-900/40 border-slate-800'}`}>
                       <h4 className="text-xs font-black text-white truncate">{note.title}</h4>
                       <p className="text-[10px] text-slate-500 mt-1 truncate">{note.content || "Clique para escrever..."}</p>
                    </button>
                  ))}
               </div>
            </div>
          </div>

          {activeNote && (
            <div className="fixed inset-0 z-[120] bg-black/95 p-6 md:p-12 flex flex-col gap-6 animate-in fade-in">
              <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
                <input type="text" value={activeNote.title} onChange={e => setActiveNote({...activeNote, title: e.target.value})} className="bg-transparent border-none outline-none text-2xl font-black text-white" />
                <div className="flex gap-4">
                  <button onClick={isRecordingNote ? stopRecordingNote : startRecordingNote} className={`p-4 rounded-xl transition-all ${isRecordingNote ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                    {isRecordingNote ? <StopCircle /> : <Mic />}
                  </button>
                  <button onClick={() => { saveNote(activeNote.content); setActiveNote(null); }} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-slate-700 transition-colors"><X /></button>
                </div>
              </div>
              <textarea autoFocus value={activeNote.content} onChange={e => setActiveNote({...activeNote, content: e.target.value})} className="flex-1 max-w-4xl mx-auto w-full bg-slate-900/50 border border-slate-800 rounded-[3rem] p-10 text-lg text-slate-200 outline-none focus:border-blue-500/20" placeholder="Anotações de elite..." />
              
              {isTranscribingNote && (
                <div className="flex items-center gap-3 text-blue-400 mx-auto animate-pulse">
                  <Sparkles size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Axel Transcrevendo...</span>
                </div>
              )}
              
              <button onClick={() => { saveNote(activeNote.content); setActiveNote(null); }} className="mx-auto px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl transition-all active:scale-95">Salvar</button>
            </div>
          )}
          
          {isAddingLink && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#0b0f1a] border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">Anexar Link</h2>
                  <button onClick={() => setIsAddingLink(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddLinkSource} className="space-y-6">
                  <input autoFocus type="url" required value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500/50" />
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest">Sincronizar Link</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;

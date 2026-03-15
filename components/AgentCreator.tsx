
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, Save, Bot, Database, Plus, Target, Sparkles, FileText, Trash2, Settings, Shield, Video, Headphones, Book, Power, AlertTriangle, Zap, BrainCircuit, Users, Calendar, Trash
} from 'lucide-react';
import { AgentConfig, SalesGoals, ActivityType, DayOfWeek, KnowledgeFile, KnowledgeLink, ActivityGoal, GoalOverride, User } from '../types';
import { defaultGoals, activityNames } from '../constants';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface SettingsModalProps {
  initialConfig: AgentConfig;
  initialGoals: SalesGoals;
  onSave: (config: AgentConfig) => void;
  onSaveGoals: (goals: SalesGoals) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  initialConfig, initialGoals, onSave, onSaveGoals, onClose
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'knowledge' | 'specialties' | 'goals'>('agent');
  const [goalsSubTab, setGoalsSubTab] = useState<'default' | 'team' | 'overrides'>('default');
  const [config, setConfig] = useState<AgentConfig>(initialConfig);
  const [goals, setGoals] = useState<SalesGoals>(initialGoals);
  const [isUploading, setIsUploading] = useState(false);
  
  const [teamUsers, setTeamUsers] = useState<(User & { goals?: SalesGoals })[]>([]);
  const [selectedUserForGoals, setSelectedUserForGoals] = useState<string | null>(null);
  
  const [newOverride, setNewOverride] = useState<Partial<GoalOverride>>({
    type: 'insta_msg',
    date: new Date().toISOString().split('T')[0],
    week: '',
    month: '',
    value: 0
  });

  const [overrideTarget, setOverrideTarget] = useState<'team' | string>('team');
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const users: any[] = [];
      snap.forEach(doc => {
        users.push({ uid: doc.id, ...doc.data() });
      });
      setTeamUsers(users);
    };
    fetchUsers();
  }, []);
  
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const diverseKnowledgeInputRef = useRef<HTMLInputElement>(null);
  const callFileInputRef = useRef<HTMLInputElement>(null);
  const objectionFileInputRef = useRef<HTMLInputElement>(null);

  const toggleDay = (day: DayOfWeek) => {
    const next = goals.activeDays.includes(day) ? goals.activeDays.filter(d => d !== day) : [...goals.activeDays, day].sort();
    setGoals({ ...goals, activeDays: next });
  };

  const updateActivityGoal = (type: ActivityType, field: keyof ActivityGoal, value: any) => {
    setGoals({
      ...goals,
      targets: {
        ...goals.targets,
        [type]: {
          ...goals.targets[type],
          [field]: value
        }
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'call' | 'objection' | 'general' | 'diverse') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newFiles: KnowledgeFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 500000) {
        alert(`O arquivo ${file.name} é muito grande (>500KB). Para evitar que os arquivos sumam, reduza o tamanho ou use o campo de texto.`);
        continue;
      }

      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        name: file.name, 
        type: file.type || 'text/plain', 
        data: fileData 
      });
    }

    if (newFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    setConfig(prev => {
      const next = { ...prev };
      if (target === 'call') {
        next.specialties.callAnalysisFiles = [...(next.specialties.callAnalysisFiles || []), ...newFiles];
      } else if (target === 'objection') {
        next.specialties.objectionHandlingFiles = [...(next.specialties.objectionHandlingFiles || []), ...newFiles];
      } else if (target === 'diverse') {
        next.knowledge.diverseKnowledge = [...(next.knowledge.diverseKnowledge || []), ...newFiles];
      } else {
        next.knowledge.files = [...(next.knowledge.files || []), ...newFiles];
      }
      return next;
    });
    setIsUploading(false);
  };

  const removeFile = (id: string, target: 'call' | 'objection' | 'general' | 'diverse') => {
    setConfig(prev => {
      const next = { ...prev };
      if (target === 'call') next.specialties.callAnalysisFiles = next.specialties.callAnalysisFiles.filter(f => f.id !== id);
      else if (target === 'objection') next.specialties.objectionHandlingFiles = next.specialties.objectionHandlingFiles.filter(f => f.id !== id);
      else if (target === 'diverse') next.knowledge.diverseKnowledge = next.knowledge.diverseKnowledge.filter(f => f.id !== id);
      else next.knowledge.files = next.knowledge.files.filter(f => f.id !== id);
      return next;
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('video')) return <Video className="text-purple-400 shrink-0" size={20} />;
    if (mimeType.includes('audio')) return <Headphones className="text-emerald-400 shrink-0" size={20} />;
    if (mimeType.includes('pdf')) return <Book className="text-red-400 shrink-0" size={20} />;
    return <FileText className="text-blue-400 shrink-0" size={20} />;
  };

  const totalSize = useMemo(() => JSON.stringify(config).length, [config]);
  const capacityPercent = Math.min(100, (totalSize / 1000000) * 100);

  const handleGlobalSave = () => {
    if (totalSize > 1000000) {
      alert("A memória neural excedeu 1MB. Remova alguns arquivos antes de salvar para evitar perda de dados.");
      return;
    }
    onSave(config); 
    onSaveGoals(goals); 
  };

  const handleSaveUserGoals = async (userId: string, userGoals: SalesGoals) => {
    try {
      await setDoc(doc(db, 'users', userId), { goals: userGoals }, { merge: true });
      setTeamUsers(prev => prev.map(u => u.uid === userId ? { ...u, goals: userGoals } : u));
      alert("Metas do usuário atualizadas!");
    } catch (err) {
      console.error(err);
    }
  };

  const addOverride = async () => {
    if (!newOverride.type || (!newOverride.date && !newOverride.week && !newOverride.month) || newOverride.value === undefined) return;
    
    const override: GoalOverride = {
      id: Math.random().toString(36).substr(2, 9),
      type: newOverride.type as ActivityType,
      date: newOverride.date,
      week: newOverride.week,
      month: newOverride.month,
      value: newOverride.value,
      note: newOverride.note
    };

    if (overrideTarget === 'team') {
      // Aplicar para todos os usuários
      for (const user of teamUsers) {
        const userGoals = user.goals || defaultGoals;
        const nextOverrides = [...(userGoals.overrides || []), override];
        await handleSaveUserGoals(user.uid, { ...userGoals, overrides: nextOverrides });
      }
      alert("Ajuste aplicado para todo o time!");
    } else {
      // Aplicar para usuário específico
      const user = teamUsers.find(u => u.uid === overrideTarget);
      if (user) {
        const userGoals = user.goals || defaultGoals;
        const nextOverrides = [...(userGoals.overrides || []), override];
        await handleSaveUserGoals(user.uid, { ...userGoals, overrides: nextOverrides });
      }
    }
  };

  const removeOverride = (id: string) => {
    setGoals({ ...goals, overrides: (goals.overrides || []).filter(o => o.id !== id) });
  };

  const toggleDisabledDate = async (date: string) => {
    if (overrideTarget === 'team') {
      const isCurrentlyDisabled = teamUsers.every(u => u.goals?.disabledDates?.includes(date));
      for (const user of teamUsers) {
        const userGoals = user.goals || defaultGoals;
        const currentDisabled = userGoals.disabledDates || [];
        const nextDisabled = isCurrentlyDisabled 
          ? currentDisabled.filter(d => d !== date) 
          : currentDisabled.includes(date) ? currentDisabled : [...currentDisabled, date];
        await handleSaveUserGoals(user.uid, { ...userGoals, disabledDates: nextDisabled });
      }
      alert(`Dia ${isCurrentlyDisabled ? 'ativado' : 'desativado'} para todo o time!`);
    } else {
      const user = teamUsers.find(u => u.uid === overrideTarget);
      if (user) {
        const userGoals = user.goals || defaultGoals;
        const currentDisabled = userGoals.disabledDates || [];
        const nextDisabled = currentDisabled.includes(date) ? currentDisabled.filter(d => d !== date) : [...currentDisabled, date];
        await handleSaveUserGoals(user.uid, { ...userGoals, disabledDates: nextDisabled });
      }
    }
  };

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/95 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0b0f1a] border border-slate-800 w-full max-w-7xl h-full md:h-[92vh] rounded-none md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-2xl">
              <Settings size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Comando Axel</h2>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-2 flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-500" /> Sincronização em Tempo Real (Cloud Protocol)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><X size={32} /></button>
        </div>

        <div className="flex bg-slate-950/50 px-10 border-b border-slate-800/50 overflow-x-auto no-scrollbar items-center justify-between">
          <div className="flex">
            <button onClick={() => setActiveTab('agent')} className={`px-12 py-8 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex items-center gap-3 ${activeTab === 'agent' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}><Bot size={20} /> Identidade</button>
            <button onClick={() => setActiveTab('knowledge')} className={`px-12 py-8 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex items-center gap-3 ${activeTab === 'knowledge' ? 'text-blue-400 border-blue-400 bg-blue-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}><Database size={20} /> Conhecimento</button>
            <button onClick={() => setActiveTab('specialties')} className={`px-12 py-8 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex items-center gap-3 ${activeTab === 'specialties' ? 'text-purple-400 border-purple-400 bg-purple-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}><Shield size={20} /> Playbooks</button>
            <button onClick={() => setActiveTab('goals')} className={`px-12 py-8 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex items-center gap-3 ${activeTab === 'goals' ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}><Target size={20} /> Metas</button>
          </div>
          
          <div className="pr-10 flex flex-col items-end gap-1.5 min-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Capacidade Neural:</span>
              <span className={`text-[9px] font-black uppercase ${capacityPercent > 80 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>{capacityPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${capacityPercent > 80 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${capacityPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-16 bg-slate-950/20 custom-scrollbar">
          
          {activeTab === 'agent' && (
            <div className="space-y-12 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">Designação Neural (Nome)</label>
                  <input type="text" value={config.name} onChange={(e) => setConfig({...config, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-[1.8rem] px-8 py-6 text-white text-lg font-bold outline-none focus:border-cyan-500/50" />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">Missão Operacional</label>
                  <input type="text" value={config.description} onChange={(e) => setConfig({...config, description: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-[1.8rem] px-8 py-6 text-white text-lg font-bold outline-none focus:border-cyan-500/50" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">Código de Conduta e Personalidade</label>
                <textarea value={config.instructions} onChange={(e) => setConfig({...config, instructions: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-[2.5rem] px-10 py-10 text-slate-200 text-lg leading-relaxed min-h-[350px] resize-none outline-none focus:border-cyan-500/50" />
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-16 max-w-6xl mx-auto">
              <div className="p-10 bg-cyan-500/5 border border-cyan-500/10 rounded-[3rem] space-y-6">
                <div className="flex items-center gap-4">
                  <BrainCircuit size={24} className="text-cyan-400" />
                  <label className="text-xl font-black text-white uppercase tracking-tighter">Memória Evolutiva (O que ela aprendeu no chat)</label>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Este campo é atualizado automaticamente quando você ensina algo à Axel no chat. Você pode editar ou limpar aqui.</p>
                <textarea 
                  value={config.learnedKnowledge} 
                  onChange={(e) => setConfig({...config, learnedKnowledge: e.target.value})} 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-[2.5rem] px-10 py-10 text-slate-200 text-lg leading-relaxed min-h-[300px] resize-none outline-none focus:border-cyan-500/50" 
                  placeholder="Instruções aprendidas aparecerão aqui..." 
                />
              </div>

              <div className="p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] space-y-6">
                <div className="flex items-center gap-4">
                  <Zap size={24} className="text-blue-400" />
                  <label className="text-xl font-black text-white uppercase tracking-tighter">Conhecimento Estratégico Manual</label>
                </div>
                <textarea 
                  value={config.knowledge.text} 
                  onChange={(e) => setConfig({...config, knowledge: {...config.knowledge, text: e.target.value}})} 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-[2.5rem] px-10 py-10 text-slate-200 text-lg leading-relaxed min-h-[350px] resize-none outline-none focus:border-blue-500/50" 
                  placeholder="Ex: Roteiro de 7 Passos: 1. Rapport... D.I. significa Acordo de Decisão Imediata..." 
                />
              </div>

              <div className="space-y-8 pt-16 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Manuais em PDF / Arquivos</h3>
                  </div>
                  <button onClick={() => generalFileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                    <Plus size={18} strokeWidth={3} /> Subir Manual
                  </button>
                  <input type="file" ref={generalFileInputRef} onChange={(e) => handleFileUpload(e, 'general')} className="hidden" multiple />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {config.knowledge.files?.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] group hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-5 truncate">
                        <FileText className="text-blue-400 shrink-0" size={24} />
                        <span className="text-sm font-black text-slate-200 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(file.id, 'general')} className="p-3 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specialties' && (
            <div className="space-y-16 max-w-6xl mx-auto">
              <div className="p-12 bg-purple-500/5 border border-purple-500/10 rounded-[3rem] space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Análise de Calls de Elite</h3>
                  </div>
                  <button onClick={() => callFileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                    <Plus size={18} strokeWidth={3} /> Subir Referência
                  </button>
                  <input type="file" ref={callFileInputRef} onChange={(e) => handleFileUpload(e, 'call')} className="hidden" multiple />
                </div>
                <textarea value={config.specialties.callAnalysis} onChange={e => setConfig({...config, specialties: {...config.specialties, callAnalysis: e.target.value}})} className="w-full bg-slate-900/30 border border-slate-800 rounded-[2rem] px-10 py-8 text-lg text-slate-300 min-h-[180px] outline-none focus:border-purple-500/50" placeholder="Como a Axel deve analisar suas ligações..." />
              </div>

              <div className="p-12 bg-cyan-500/5 border border-cyan-500/10 rounded-[3rem] space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Playbook de Objeções</h3>
                  </div>
                  <button onClick={() => objectionFileInputRef.current?.click()} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all">
                    <Plus size={18} strokeWidth={3} /> Subir Playbook
                  </button>
                  <input type="file" ref={objectionFileInputRef} onChange={(e) => handleFileUpload(e, 'objection')} className="hidden" multiple />
                </div>
                <textarea value={config.specialties.objectionHandling} onChange={e => setConfig({...config, specialties: {...config.specialties, objectionHandling: e.target.value}})} className="w-full bg-slate-900/30 border border-slate-800 rounded-[2rem] px-10 py-8 text-lg text-slate-300 min-h-[180px] outline-none focus:border-cyan-500/50" placeholder="Suas melhores respostas para objeções..." />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-12 max-w-6xl mx-auto">
              <div className="flex items-center gap-4 bg-slate-900/40 p-2 rounded-2xl border border-slate-800 w-fit mx-auto">
                <button 
                  onClick={() => setGoalsSubTab('default')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsSubTab === 'default' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Padrão Global
                </button>
                <button 
                  onClick={() => setGoalsSubTab('team')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsSubTab === 'team' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Metas por Usuário
                </button>
                <button 
                  onClick={() => setGoalsSubTab('overrides')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${goalsSubTab === 'overrides' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Ajustes de Calendário
                </button>
              </div>

              {goalsSubTab === 'default' && (
                <div className="space-y-16 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                    {dayLabels.map((label, idx) => (
                      <button key={label} onClick={() => toggleDay(idx as DayOfWeek)} className={`py-8 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all border-4 ${goals.activeDays.includes(idx as DayOfWeek) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.1)]' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>{label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(Object.entries(goals.targets) as [ActivityType, any][]).map(([type, target]) => (
                      <div key={type} className={`p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-8 transition-all ${!target.enabled ? 'opacity-30' : 'hover:border-emerald-500/30 shadow-xl'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activityNames[type] || type.replace('_', ' ')}</span>
                          <button onClick={() => updateActivityGoal(type, 'enabled', !target.enabled)} className={`w-12 h-7 rounded-full relative transition-all ${target.enabled ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${target.enabled ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                        <div className="space-y-6">
                          {['daily', 'weekly', 'monthly'].map(f => (
                            <div key={f} className="flex items-center justify-between gap-6">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{f}</span>
                              <input type="number" value={target[f]} onChange={e => updateActivityGoal(type, f as any, parseInt(e.target.value) || 0)} className="w-24 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-right text-base font-black text-emerald-400 outline-none" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {goalsSubTab === 'team' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  {teamUsers.map(user => (
                    <div key={user.uid} className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
                      <div className="flex items-center gap-4">
                        <img src={user.photoURL} className="w-12 h-12 rounded-xl object-cover" alt="" />
                        <div>
                          <p className="text-sm font-black text-white">{user.displayName}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{user.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUserForGoals(selectedUserForGoals === user.uid ? null : user.uid)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        {selectedUserForGoals === user.uid ? "Fechar Metas" : "Gerenciar Metas"}
                      </button>

                      {selectedUserForGoals === user.uid && (
                        <div className="pt-6 border-t border-slate-800 space-y-6 animate-in slide-in-from-top-4">
                          {(Object.entries(user.goals?.targets || initialGoals.targets) as [ActivityType, any][]).map(([type, target]) => (
                            <div key={type} className="flex items-center justify-between gap-4">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{type.replace('insta_', '')}</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  defaultValue={target.daily} 
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const currentGoals = user.goals || initialGoals;
                                    const nextGoals = {
                                      ...currentGoals,
                                      targets: {
                                        ...currentGoals.targets,
                                        [type]: { ...currentGoals.targets[type], daily: val }
                                      }
                                    };
                                    handleSaveUserGoals(user.uid, nextGoals);
                                  }}
                                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs font-black text-emerald-400 outline-none" 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {goalsSubTab === 'overrides' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 rounded-xl text-red-400"><Calendar size={20} /></div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Alvo da Configuração</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Defina se os ajustes abaixo valem para o time todo ou um membro específico</p>
                      </div>
                    </div>
                    <select 
                      value={overrideTarget} 
                      onChange={e => setOverrideTarget(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-6 py-3 text-white text-xs font-bold outline-none focus:border-red-500/50 min-w-[200px]"
                    >
                      <option value="team">Todo o Time</option>
                      {teamUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                    </select>
                  </div>

                  {/* Calendário Operacional */}
                  <div className="p-10 bg-slate-900/40 border border-slate-800 rounded-[3rem] space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Calendário Operacional</h3>
                      <input 
                        type="month" 
                        value={calendarMonth} 
                        onChange={e => setCalendarMonth(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Clique nos dias para desativar/ativar a contagem de metas (Feriados, Folgas, etc)</p>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {dayLabels.map(label => (
                        <div key={label} className="text-center py-2 text-[10px] font-black text-slate-600 uppercase">{label}</div>
                      ))}
                      {(() => {
                        const [year, month] = calendarMonth.split('-').map(Number);
                        const firstDay = new Date(year, month - 1, 1).getDay();
                        const daysInMonth = new Date(year, month, 0).getDate();
                        const cells = [];
                        
                        for (let i = 0; i < firstDay; i++) {
                          cells.push(<div key={`empty-${i}`} />);
                        }
                        
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                          
                          let isDisabled = false;
                          if (overrideTarget === 'team') {
                            isDisabled = teamUsers.length > 0 && teamUsers.every(u => u.goals?.disabledDates?.includes(dateStr));
                          } else {
                            const user = teamUsers.find(u => u.uid === overrideTarget);
                            isDisabled = user?.goals?.disabledDates?.includes(dateStr) || false;
                          }

                          cells.push(
                            <button
                              key={dateStr}
                              onClick={() => toggleDisabledDate(dateStr)}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                                isDisabled 
                                  ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                                  : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                              }`}
                            >
                              <span className="text-sm font-black">{day}</span>
                              {isDisabled && <span className="text-[8px] font-black uppercase mt-1">OFF</span>}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>

                  <div className="p-10 bg-red-500/5 border border-red-500/10 rounded-[3rem] space-y-8">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ajustes Manuais de Meta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Atividade</label>
                        <select 
                          value={newOverride.type} 
                          onChange={e => setNewOverride({...newOverride, type: e.target.value as any})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold"
                        >
                          {Object.entries(activityNames).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Data (Dia)</label>
                        <input 
                          type="date" 
                          value={newOverride.date} 
                          onChange={e => setNewOverride({...newOverride, date: e.target.value, week: '', month: ''})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Mês (Opcional)</label>
                        <input 
                          type="month" 
                          value={newOverride.month} 
                          onChange={e => setNewOverride({...newOverride, month: e.target.value, date: '', week: ''})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Nova Meta</label>
                        <input 
                          type="number" 
                          value={newOverride.value} 
                          onChange={e => setNewOverride({...newOverride, value: parseInt(e.target.value) || 0})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold"
                        />
                      </div>
                      <button onClick={addOverride} className="bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Aplicar Ajuste</button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest px-4">Ajustes Ativos (Time)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {goals.overrides?.map(o => (
                        <div key={o.id} className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{o.type.replace('_', ' ')}</p>
                            <p className="text-sm font-black text-white">{o.date || o.month || o.week}</p>
                            <p className="text-xs text-slate-500 font-bold">Meta: <span className="text-white">{o.value}</span></p>
                          </div>
                          <button onClick={() => removeOverride(o.id)} className="p-3 text-slate-600 hover:text-red-500"><Trash size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-10 border-t border-slate-800 flex justify-end items-center gap-8 bg-slate-900/40">
           <button onClick={onClose} className="px-12 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Abortar</button>
           <button onClick={handleGlobalSave} className="flex items-center gap-5 bg-cyan-600 hover:bg-cyan-500 text-white px-16 md:px-24 py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.15em] shadow-[0_15px_40px_rgba(8,145,178,0.3)] transition-all">
             <Save size={24} strokeWidth={3} /> Sincronizar Protocolo
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

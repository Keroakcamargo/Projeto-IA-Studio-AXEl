
import React, { useState, useRef } from 'react';
import { 
  X, Save, Bot, Database, Plus, Calendar, 
  Target, Sparkles, Phone, Instagram, 
  Mic2, Users, Hash, CheckSquare, CalendarDays,
  Headset, Layout, Power, FileUp, FileText, Trash2, Globe, 
  Paperclip, Link as LinkIcon, Settings, Shield, 
  Video, Headphones, Book, FileDigit
} from 'lucide-react';
import { AgentConfig, SalesGoals, ActivityType, DayOfWeek, KnowledgeFile, KnowledgeLink, ActivityGoal } from '../types';

interface SettingsModalProps {
  initialConfig: AgentConfig;
  initialGoals: SalesGoals;
  onSave: (config: AgentConfig) => void;
  onSaveGoals: (goals: SalesGoals) => void;
  onClose: () => void;
  onAiAssist?: (prompt: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  initialConfig, initialGoals, onSave, onSaveGoals, onClose, onAiAssist 
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'knowledge' | 'specialties' | 'goals'>('agent');
  const [config, setConfig] = useState<AgentConfig>(initialConfig);
  const [goals, setGoals] = useState<SalesGoals>(initialGoals);
  const [isUploading, setIsUploading] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const diverseKnowledgeInputRef = useRef<HTMLInputElement>(null);
  const callFileInputRef = useRef<HTMLInputElement>(null);
  const objectionFileInputRef = useRef<HTMLInputElement>(null);

  const toggleDay = (day: DayOfWeek) => {
    const next = goals.activeDays.includes(day) ? goals.activeDays.filter(d => d !== day) : [...goals.activeDays, day].sort();
    setGoals({ ...goals, activeDays: next });
  };

  // Fix: Added missing updateActivityGoal function to update specific activity targets
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

    if (target === 'call') {
      setConfig({ ...config, specialties: { ...config.specialties, callAnalysisFiles: [...config.specialties.callAnalysisFiles, ...newFiles] } });
    } else if (target === 'objection') {
      setConfig({ ...config, specialties: { ...config.specialties, objectionHandlingFiles: [...config.specialties.objectionHandlingFiles, ...newFiles] } });
    } else if (target === 'diverse') {
      setConfig({ ...config, knowledge: { ...config.knowledge, diverseKnowledge: [...(config.knowledge.diverseKnowledge || []), ...newFiles] } });
    } else {
      setConfig({ ...config, knowledge: { ...config.knowledge, files: [...config.knowledge.files, ...newFiles] } });
    }
    setIsUploading(false);
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const newLink: KnowledgeLink = {
      id: Math.random().toString(36).substr(2, 9),
      url: newLinkUrl,
      title: newLinkTitle || newLinkUrl.replace(/^https?:\/\//, '').split('/')[0]
    };
    setConfig({ ...config, knowledge: { ...config.knowledge, links: [...config.knowledge.links, newLink] } });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const removeFile = (id: string, target: 'call' | 'objection' | 'general' | 'diverse') => {
    if (target === 'call') {
      setConfig({ ...config, specialties: { ...config.specialties, callAnalysisFiles: config.specialties.callAnalysisFiles.filter(f => f.id !== id) } });
    } else if (target === 'objection') {
      setConfig({ ...config, specialties: { ...config.specialties, objectionHandlingFiles: config.specialties.objectionHandlingFiles.filter(f => f.id !== id) } });
    } else if (target === 'diverse') {
      setConfig({ ...config, knowledge: { ...config.knowledge, diverseKnowledge: config.knowledge.diverseKnowledge.filter(f => f.id !== id) } });
    } else {
      setConfig({ ...config, knowledge: { ...config.knowledge, files: config.knowledge.files.filter(f => f.id !== id) } });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('video')) return <Video className="text-purple-400 shrink-0" size={20} />;
    if (mimeType.includes('audio')) return <Headphones className="text-emerald-400 shrink-0" size={20} />;
    if (mimeType.includes('pdf')) return <Book className="text-red-400 shrink-0" size={20} />;
    return <FileText className="text-blue-400 shrink-0" size={20} />;
  };

  const handleGlobalSave = () => { onSave(config); onSaveGoals(goals); };

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0b0f1a] border border-slate-800 w-full max-w-7xl h-full md:h-[92vh] rounded-none md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-2xl">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Comando Axel</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-1.5 flex items-center gap-2">
                <Sparkles size={12} className="text-cyan-500" /> Sincronização de IA & Playbooks
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><X size={28} /></button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex bg-slate-950/50 px-8 border-b border-slate-800/50 shrink-0 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('agent')} className={`px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap ${activeTab === 'agent' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            <Bot size={18} /> Identidade
          </button>
          <button onClick={() => setActiveTab('knowledge')} className={`px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap ${activeTab === 'knowledge' ? 'text-blue-400 border-blue-400 bg-blue-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            <Database size={18} /> Base de Conhecimento
          </button>
          <button onClick={() => setActiveTab('specialties')} className={`px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap ${activeTab === 'specialties' ? 'text-purple-400 border-purple-400 bg-purple-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            <Shield size={18} /> Especialidades
          </button>
          <button onClick={() => setActiveTab('goals')} className={`px-10 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 whitespace-nowrap ${activeTab === 'goals' ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            <Target size={18} /> Metas de Elite
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-slate-950/20">
          
          {activeTab === 'agent' && (
            <div className="space-y-10 max-w-5xl mx-auto animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nome Neural</label>
                  <input type="text" value={config.name} onChange={(e) => setConfig({...config, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-cyan-500/50" placeholder="Ex: Axel" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Designação</label>
                  <input type="text" value={config.description} onChange={(e) => setConfig({...config, description: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-cyan-500/50" placeholder="Ex: Supervisora e Mentora" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Diretrizes Principais (Prompt de Personalidade)</label>
                <textarea value={config.instructions} onChange={(e) => setConfig({...config, instructions: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl px-8 py-6 text-slate-200 text-sm outline-none min-h-[250px] resize-none leading-relaxed" placeholder="Como a Axel deve se comportar..." />
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-12 max-w-5xl mx-auto animate-in fade-in duration-500">
              
              {/* Manuais Operacionais */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">Manuais Operacionais</h3>
                    <p className="text-xs text-slate-500 mt-1">Regras da casa, processos internos e diretrizes de gestão.</p>
                  </div>
                  <button onClick={() => generalFileInputRef.current?.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
                    <Plus size={16} /> Subir Manual
                  </button>
                  <input type="file" ref={generalFileInputRef} onChange={(e) => handleFileUpload(e, 'general')} className="hidden" multiple />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.knowledge.files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800 rounded-2xl group">
                      <div className="flex items-center gap-4 truncate">
                        <FileText className="text-blue-400 shrink-0" size={20} />
                        <span className="text-sm font-bold text-slate-200 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(file.id, 'general')} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BIBLIOTECA DE PERFORMANCE (NOVO) */}
              <div className="space-y-6 border-t border-slate-800 pt-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">Biblioteca de Performance</h3>
                    <p className="text-xs text-slate-500 mt-1">Treinamentos, Livros (PDFs), Vídeos e Áudios de estudo.</p>
                  </div>
                  <button onClick={() => diverseKnowledgeInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
                    <Plus size={16} /> Subir Material
                  </button>
                  <input type="file" ref={diverseKnowledgeInputRef} onChange={(e) => handleFileUpload(e, 'diverse')} className="hidden" multiple />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(config.knowledge.diverseKnowledge || []).map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-2xl group">
                      <div className="flex items-center gap-3 truncate">
                        {getFileIcon(file.type)}
                        <span className="text-xs font-bold text-slate-200 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(file.id, 'diverse')} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="space-y-6 border-t border-slate-800 pt-12">
                <h3 className="text-xl font-black text-white">Links e Referências Externas</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <input type="text" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Título (ex: CRM)" className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50" />
                  <div className="flex-[2] flex gap-2">
                    <input type="url" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50" />
                    <button onClick={addLink} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 rounded-2xl transition-all shadow-lg"><Plus size={24} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.knowledge.links.map(link => (
                    <div key={link.id} className="flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-4 truncate">
                        <Globe className="text-emerald-400 shrink-0" size={20} />
                        <div>
                          <p className="text-sm font-bold text-slate-200 truncate">{link.title}</p>
                          <p className="text-[9px] text-slate-500 truncate">{link.url}</p>
                        </div>
                      </div>
                      <button onClick={() => setConfig({...config, knowledge: {...config.knowledge, links: config.knowledge.links.filter(l => l.id !== link.id)}})} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specialties' && (
            <div className="space-y-12 max-w-5xl mx-auto animate-in fade-in duration-500">
              {/* Análise de Calls */}
              <div className="p-10 bg-purple-500/5 border border-purple-500/10 rounded-[2.5rem] space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-2xl"><Headset size={32} /></div>
                    <div>
                      <h3 className="text-xl font-black text-white">Análise de Calls (Speeches)</h3>
                      <p className="text-xs text-slate-500 mt-1">Treine a Axel com suas melhores gravações e playbooks de áudio.</p>
                    </div>
                  </div>
                  <button onClick={() => callFileInputRef.current?.click()} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    <Plus size={16} /> Adicionar Speech
                  </button>
                  <input type="file" ref={callFileInputRef} onChange={(e) => handleFileUpload(e, 'call')} className="hidden" multiple />
                </div>
                <textarea value={config.specialties.callAnalysis} onChange={e => setConfig({...config, specialties: {...config.specialties, callAnalysis: e.target.value}})} className="w-full bg-slate-900/30 border border-slate-800/50 rounded-2xl px-6 py-4 text-sm text-slate-300 outline-none min-h-[120px]" placeholder="Instruções específicas para análise de chamadas..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.specialties.callAnalysisFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-purple-500/10 rounded-xl">
                      <div className="flex items-center gap-3 truncate">
                        <Mic2 size={16} className="text-purple-400" />
                        <span className="text-xs font-bold text-slate-400 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(file.id, 'call')} className="p-1.5 text-slate-700 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objeções */}
              <div className="p-10 bg-cyan-500/5 border border-cyan-500/10 rounded-[2.5rem] space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-2xl"><Shield size={32} /></div>
                    <div>
                      <h3 className="text-xl font-black text-white">Tratamento de Objeções</h3>
                      <p className="text-xs text-slate-500 mt-1">Playbooks para contornar nãos e fechar mais vendas.</p>
                    </div>
                  </div>
                  <button onClick={() => objectionFileInputRef.current?.click()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    <Plus size={16} /> Adicionar Playbook
                  </button>
                  <input type="file" ref={objectionFileInputRef} onChange={(e) => handleFileUpload(e, 'objection')} className="hidden" multiple />
                </div>
                <textarea value={config.specialties.objectionHandling} onChange={e => setConfig({...config, specialties: {...config.specialties, objectionHandling: e.target.value}})} className="w-full bg-slate-900/30 border border-slate-800/50 rounded-2xl px-6 py-4 text-sm text-slate-300 outline-none min-h-[120px]" placeholder="Diretrizes para lidar com objeções difíceis..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.specialties.objectionHandlingFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-cyan-500/10 rounded-xl">
                      <div className="flex items-center gap-3 truncate">
                        <FileCode size={16} className="text-cyan-400" />
                        <span className="text-xs font-bold text-slate-400 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(file.id, 'objection')} className="p-1.5 text-slate-700 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-12 max-w-5xl mx-auto animate-in fade-in duration-500">
               <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
                 <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2rem] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(16,185,129,0.3)]"><Sparkles size={48} /></div>
                 <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest">IA Strategic Planner</h3>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">Deixe que a Axel analise sua performance histórica e sugira as metas ideais para maximizar sua comissão.</p>
                 </div>
                 <button onClick={() => onAiAssist?.("Analise meu histórico e sugira novas metas de elite.")} className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-200 transition-all">Sugerir Metas</button>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                {dayLabels.map((label, idx) => (
                  <button key={label} onClick={() => toggleDay(idx as DayOfWeek)} className={`py-6 rounded-2xl font-black text-xs transition-all border-2 ${goals.activeDays.includes(idx as DayOfWeek) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>{label}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Object.entries(goals.targets) as [ActivityType, any][]).map(([type, target]) => (
                  <div key={type} className={`p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6 ${!target.enabled ? 'opacity-40 grayscale' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{type.replace('_', ' ')}</span>
                      <button onClick={() => updateActivityGoal(type, 'enabled', !target.enabled)} className={`w-10 h-6 rounded-full relative transition-all ${target.enabled ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${target.enabled ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Diário</span>
                        <input type="number" value={target.daily} onChange={e => setGoals({ ...goals, targets: { ...goals.targets, [type]: { ...goals.targets[type], daily: parseInt(e.target.value) || 0 } } })} className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-right text-sm font-black text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Semanal</span>
                        <input type="number" value={target.weekly} onChange={e => setGoals({ ...goals, targets: { ...goals.targets, [type]: { ...goals.targets[type], weekly: parseInt(e.target.value) || 0 } } })} className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-right text-sm font-black text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Mensal</span>
                        <input type="number" value={target.monthly} onChange={e => setGoals({ ...goals, targets: { ...goals.targets, [type]: { ...goals.targets[type], monthly: parseInt(e.target.value) || 0 } } })} className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-right text-sm font-black text-emerald-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-800 flex justify-end items-center gap-6 bg-slate-900/40 shrink-0">
           {isUploading && <div className="flex items-center gap-3 text-cyan-400 animate-pulse"><Power size={18} className="animate-spin" /><span className="text-[10px] font-black uppercase">Sincronizando Dados...</span></div>}
           <button onClick={onClose} className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Descartar Alterações</button>
           <button onClick={handleGlobalSave} className="flex items-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-white px-12 md:px-20 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(8,145,178,0.3)] transition-all transform active:scale-95">
             <Save size={20} /> Sincronizar Protocolo Axel
           </button>
        </div>
      </div>
    </div>
  );
};

// Ícone extra para playbooks
const FileCode: React.FC<{size?: number, className?: string}> = ({size=24, className=""}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>
);

export default SettingsModal;

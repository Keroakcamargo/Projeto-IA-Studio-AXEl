
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, LayoutDashboard, Settings, 
  BarChart2, Sparkles, Send, LogOut, Loader2, Trophy, 
  Lightbulb, User as UserIcon, Headset, Shield, Cpu
} from 'lucide-react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  collection, query, onSnapshot, addDoc, 
  Timestamp, doc, getDoc, setDoc, deleteDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import Dashboard from './components/Dashboard';
import ChatBot, { ChatBotHandle } from './components/ChatBot';
import AgentCreator from './components/AgentCreator';
import ProfileSettings from './components/ProfileSettings';
import LiveVocalAssistant from './components/LiveVocalAssistant';
import Ranking from './components/Ranking';
import Insights from './components/Insights';
import Login from './components/Login';
import { SalesActivity, SalesGoals, AgentConfig, ActivityType, ActivityGoal, User } from './types';

const defaultActivityGoal: ActivityGoal = { daily: 10, weekly: 50, monthly: 200, enabled: true };

const defaultGoals: SalesGoals = {
  targets: {
    insta_msg: { ...defaultActivityGoal, daily: 50, weekly: 250, monthly: 1000 },
    insta_follow: { ...defaultActivityGoal, daily: 15, weekly: 75, monthly: 300 },
    speech: { ...defaultActivityGoal, daily: 2, weekly: 10, monthly: 40 },
    ligacoes: { ...defaultActivityGoal, daily: 20, weekly: 100, monthly: 400 },
    insta_numbers: { ...defaultActivityGoal, daily: 30, weekly: 150, monthly: 600 },
    meeting_scheduled: { ...defaultActivityGoal, daily: 5, weekly: 25, monthly: 100 },
    meeting_done: { ...defaultActivityGoal, daily: 2, weekly: 10, monthly: 40 }
  },
  activeDays: [1, 2, 3, 4, 5]
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'atividades' | 'chat' | 'ranking' | 'insights'>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const chatRef = useRef<ChatBotHandle>(null);

  const [goals, setGoals] = useState<SalesGoals>(defaultGoals);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: 'Axel',
    description: 'Supervisora e Mentora de Alta Performance.',
    instructions: 'Você é Axel, a autoridade máxima em supervisão e mentoria de vendas.',
    knowledge: { 
      text: '', 
      files: [], 
      diverseKnowledge: [], // Inicializado
      links: [] 
    },
    specialties: { 
      callAnalysis: 'Análise estratégica de calls.', 
      callAnalysisFiles: [],
      objectionHandling: 'Playbooks de alta conversão.',
      objectionHandlingFiles: []
    },
    tools: { googleSearch: true, salesLogging: true, searchStrategy: '' },
    voiceSettings: { voiceName: 'Kore' }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Vendedor',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=0D9488&color=fff`
        };
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
        setActivities([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const loadUserData = async () => {
      try {
        const userDoc = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
          const data = snap.data();
          if (data.goals) setGoals(data.goals);
          
          // Garantir que a estrutura nova exista ao carregar do banco
          if (data.agentConfig) {
            const config = data.agentConfig;
            if (!config.knowledge.diverseKnowledge) {
              config.knowledge.diverseKnowledge = [];
            }
            setAgentConfig(config);
          }
          
          setCurrentUser(prev => prev ? { 
            ...prev, 
            displayName: data.displayName || prev.displayName, 
            photoURL: data.photoURL || prev.photoURL 
          } : null);
        } else {
          await setDoc(userDoc, { goals: defaultGoals, createdAt: Timestamp.now() }, { merge: true });
        }
      } catch (err) { console.error(err); }
    };
    loadUserData();
    const activitiesCol = collection(db, 'users', currentUser.uid, 'activities');
    const q = query(activitiesCol, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activitiesData: SalesActivity[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activitiesData.push({
          id: doc.id,
          type: data.type,
          count: data.count,
          timestamp: (data.timestamp as Timestamp).toDate(),
        });
      });
      setActivities(activitiesData);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const stats: Record<string, number> = {
      insta_msg: 0, insta_follow: 0, speech: 0, ligacoes: 0, 
      insta_numbers: 0, meeting_scheduled: 0, meeting_done: 0
    };
    activities.forEach(act => {
      const actDate = new Date(act.timestamp).toISOString().split('T')[0];
      if (actDate === today) stats[act.type] = (stats[act.type] || 0) + act.count;
    });
    return stats as Record<ActivityType, number>;
  }, [activities]);

  const syncActivity = async (type: ActivityType, value: number, date: Date, mode: 'add' | 'set' = 'add') => {
    if (!currentUser) return;
    try {
      const dateKey = date.toISOString().split('T')[0];
      const docId = `${dateKey}_${type}`;
      const activityDoc = doc(db, 'users', currentUser.uid, 'activities', docId);
      if (mode === 'set') {
        await setDoc(activityDoc, { type, count: value, timestamp: Timestamp.fromDate(date), updatedAt: Timestamp.now() });
      } else {
        const snap = await getDoc(activityDoc);
        const currentCount = snap.exists() ? snap.data().count : 0;
        await setDoc(activityDoc, { type, count: currentCount + value, timestamp: Timestamp.fromDate(date), updatedAt: Timestamp.now() });
      }
    } catch (error) { console.error(error); }
  };
  
  const handleLogout = async () => await signOut(auth);

  const handleUpdateGoals = async (newGoals: SalesGoals) => {
    setGoals(newGoals);
    if (currentUser) {
      try { await setDoc(doc(db, 'users', currentUser.uid), { goals: newGoals }, { merge: true }); }
      catch (err) { console.error(err); }
    }
  };

  const handleUpdateAgent = async (newConfig: AgentConfig) => {
    setAgentConfig(newConfig);
    setIsSettingsOpen(false);
    if (currentUser) {
      try { await setDoc(doc(db, 'users', currentUser.uid), { agentConfig: newConfig }, { merge: true }); }
      catch (err) { console.error(err); }
    }
  };

  const handleGlobalSubmit = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    if (activeView !== 'chat') {
      setActiveView('chat');
      setTimeout(() => chatRef.current?.sendMessage(text), 100);
    } else chatRef.current?.sendMessage(text);
  };

  if (authLoading) return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#020617] text-cyan-400">
      <Loader2 size={48} className="animate-spin mb-4" />
      <p className="text-[10px] font-black tracking-[0.3em] uppercase">Sincronizando Link Neural...</p>
    </div>
  );

  if (!currentUser) return <Login />;

  const isAdmin = currentUser.email === 'keroakscamargo@gmail.com';

  return (
    <div className="relative h-screen flex bg-[#020617] overflow-hidden font-sans text-slate-100">
      <aside className="w-16 h-full flex flex-col items-center py-8 gap-6 border-r border-slate-800/30 backdrop-blur-3xl z-40 bg-slate-950/40 shrink-0">
        <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-8 border border-cyan-500/20 shadow-lg overflow-hidden group hover:border-cyan-400/50 transition-all">
          <img src={currentUser.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Profile" />
        </button>
        <nav className="flex-1 flex flex-col gap-8 text-slate-500">
          <button onClick={() => setActiveView('home')} className={`p-2.5 rounded-xl transition-all ${activeView === 'home' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' : 'hover:text-cyan-400'}`} title="Home"><Sparkles size={22} /></button>
          <button onClick={() => setActiveView('atividades')} className={`p-2.5 rounded-xl transition-all ${activeView === 'atividades' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' : 'hover:text-cyan-400'}`} title="Dashboard"><BarChart2 size={22} /></button>
          <button onClick={() => setActiveView('insights')} className={`p-2.5 rounded-xl transition-all ${activeView === 'insights' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' : 'hover:text-cyan-400'}`} title="Insights"><Lightbulb size={22} /></button>
          <button onClick={() => setActiveView('ranking')} className={`p-2.5 rounded-xl transition-all ${activeView === 'ranking' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' : 'hover:text-cyan-400'}`} title="Ranking"><Trophy size={22} /></button>
          <button onClick={() => setActiveView('chat')} className={`p-2.5 rounded-xl transition-all ${activeView === 'chat' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' : 'hover:text-cyan-400'}`} title="Axel Chat"><MessageSquare size={22} /></button>
        </nav>
        {isAdmin && <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-slate-500 hover:text-cyan-400" title="Configurações Axel"><Settings size={22} /></button>}
        <button onClick={handleLogout} className="mt-4 p-2.5 text-slate-600 hover:text-red-400 transition-colors" title="Sair"><LogOut size={22} /></button>
      </aside>

      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeView === 'home' && (
            <div className="min-h-full flex flex-col items-center justify-center max-w-4xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 text-center">
              <div className="relative mb-8">
                 <div className="absolute inset-0 blur-3xl bg-cyan-500/10 rounded-full scale-150"></div>
                 <div className="relative bg-[#0a0f1e] p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl"><Cpu size={56} className="text-cyan-400" /></div>
              </div>
              <h1 className="text-4xl font-bold mb-3 tracking-tight text-white uppercase tracking-widest">Axel Sales Assistant AI</h1>
              <p className="text-slate-400 mb-12 max-w-md mx-auto italic">Bem-vindo ao comando, {currentUser.displayName}. Status neural: Online.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                 <button onClick={() => setActiveView('chat')} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-cyan-500/40 transition-all text-left group">
                    <MessageSquare size={20} className="text-cyan-500 mb-3" /><p className="text-[11px] text-slate-200 font-black uppercase tracking-widest">Link Axel</p>
                    <p className="text-[10px] text-slate-500 mt-1">Mentoria Direta</p>
                 </button>
                 <button onClick={() => setActiveView('insights')} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-blue-500/40 transition-all text-left group">
                    <Lightbulb size={20} className="text-blue-500 mb-3" /><p className="text-[11px] text-slate-200 font-black uppercase tracking-widest">Base Neural</p>
                    <p className="text-[10px] text-slate-500 mt-1">Conhecimento</p>
                 </button>
                 <button onClick={() => setActiveView('ranking')} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-yellow-500/40 transition-all text-left group">
                    <Trophy size={20} className="text-yellow-500 mb-3" /><p className="text-[11px] text-slate-200 font-black uppercase tracking-widest">Status Elite</p>
                    <p className="text-[10px] text-slate-500 mt-1">Comparativo</p>
                 </button>
                 <button onClick={() => { setActiveView('chat'); setTimeout(() => chatRef.current?.triggerTool('call'), 100); }} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-emerald-500/40 transition-all text-left group">
                    <Headset size={20} className="text-emerald-500 mb-3" /><p className="text-[11px] text-slate-200 font-black uppercase tracking-widest">Análise Call</p>
                    <p className="text-[10px] text-slate-500 mt-1">Audit Axel</p>
                 </button>
                 <button onClick={() => { setActiveView('chat'); setTimeout(() => chatRef.current?.triggerTool('objection'), 100); }} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-purple-500/40 transition-all text-left group">
                    <Shield size={20} className="text-purple-500 mb-3" /><p className="text-[11px] text-slate-200 font-black uppercase tracking-widest">Objeções</p>
                    <p className="text-[10px] text-slate-500 mt-1">Contorno Pro</p>
                 </button>
              </div>
            </div>
          )}

          {activeView === 'atividades' && (
            <div className="w-full p-8 md:p-12 animate-in fade-in duration-500">
              <div className="max-w-7xl mx-auto">
                <Dashboard 
                  activities={activities} 
                  goals={goals} 
                  onAddActivity={(type, val, date) => syncActivity(type, val, date || new Date(), 'set')} 
                />
              </div>
            </div>
          )}

          {activeView === 'ranking' && (
            <div className="w-full p-8 md:p-12 animate-in fade-in duration-500">
               <Ranking currentUser={currentUser} />
            </div>
          )}

          {activeView === 'insights' && (
            <div className="w-full h-full p-8 md:p-12 animate-in fade-in duration-500">
               <Insights currentUser={currentUser} />
            </div>
          )}

          {activeView === 'chat' && (
            <div className="w-full h-full flex flex-col pb-32">
              <ChatBot 
                ref={chatRef} 
                agentConfig={agentConfig} 
                goals={goals}
                todayStats={todayStats}
                onActivityDetected={(type, count, mode, date) => syncActivity(type, count, date || new Date(), mode)}
                onGoalsUpdate={handleUpdateGoals}
              />
            </div>
          )}
        </div>

        {(activeView !== 'atividades' && activeView !== 'ranking' && activeView !== 'insights') && (
          <div className="absolute bottom-8 left-0 right-0 px-4 md:px-12 flex justify-center z-30 animate-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-4xl w-full bg-[#0f172a]/95 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-2 flex shadow-2xl items-center gap-2">
              <div className="pl-1">
                <LiveVocalAssistant 
                  agentConfig={agentConfig}
                  todayStats={todayStats}
                  goals={goals}
                  userName={currentUser.displayName}
                  onActivityDetected={(type, count, mode, date) => syncActivity(type, count, date || new Date(), mode)}
                  onVoiceResponseGenerated={(text, cards) => chatRef.current?.addExternalMessage(text, cards)}
                  onTranscriptionUpdate={(role, text, isFinal) => chatRef.current?.updateLiveTranscription(role, text, isFinal)}
                />
              </div>
              <input 
                type="text" placeholder="Protocolo Axel: Comande por texto ou voz..." value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSubmit()}
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-slate-100 placeholder:text-slate-500 text-sm"
              />
              <div className="flex items-center gap-2 pr-2">
                <button onClick={handleGlobalSubmit} disabled={!inputValue.trim()} className={`p-2.5 rounded-xl transition-all px-6 ${inputValue.trim() ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-600'}`}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAdmin && isSettingsOpen && (
        <AgentCreator 
          initialConfig={agentConfig} 
          initialGoals={goals}
          onSave={handleUpdateAgent} 
          onSaveGoals={handleUpdateGoals}
          onClose={() => setIsSettingsOpen(false)} 
          onAiAssist={(p) => { setIsSettingsOpen(false); setInputValue(p); handleGlobalSubmit(); }} 
        />
      )}

      {isProfileOpen && (
        <ProfileSettings 
          currentUser={currentUser}
          onUpdate={(updated) => setCurrentUser(prev => prev ? { ...prev, ...updated } : null)}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default App;

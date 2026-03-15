
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, BarChart2, Sparkles, Send, LogOut, Loader2, Trophy, 
  Lightbulb, Settings, User as UserIcon, Headset, Shield, Cpu
} from 'lucide-react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, query, onSnapshot, Timestamp, doc, getDoc, setDoc, orderBy, collectionGroup
} from "firebase/firestore";

import Dashboard from './components/Dashboard';
import ChatBot, { ChatBotHandle } from './components/ChatBot';
import AgentCreator from './components/AgentCreator';
import ProfileSettings from './components/ProfileSettings';
import Ranking from './components/Ranking';
import Insights from './components/Insights';
import Login from './components/Login';
import { SalesActivity, SalesGoals, AgentConfig, ActivityType, ActivityGoal, User, GoalOverride } from './types';
import { defaultGoals } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'atividades' | 'chat' | 'ranking' | 'insights'>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [globalGoals, setGlobalGoals] = useState<SalesGoals>(defaultGoals);
  const [userGoalsData, setUserGoalsData] = useState<SalesGoals | undefined>(undefined);
  const chatRef = useRef<ChatBotHandle>(null);

  useEffect(() => {
    const unsubGlobalGoals = onSnapshot(doc(db, 'settings', 'global_goals'), (docSnap) => {
      const globalGoalsData = docSnap.exists() ? docSnap.data() as SalesGoals : defaultGoals;
      setGlobalGoals(globalGoalsData);
    });
    return () => unsubGlobalGoals();
  }, []);

  const [goals, setGoals] = useState<SalesGoals>(defaultGoals);

  const isAdmin = useMemo(() => {
    return currentUser?.email === 'keroakscamargo@gmail.com' || currentUser?.email === 'axel@admin.com';
  }, [currentUser]);

  useEffect(() => {
    if (isAdmin) {
      // Se for admin, busca metas de todos os usuários para somar
      const usersCol = collection(db, 'users');
      const unsubAllUsers = onSnapshot(usersCol, async (querySnapshot) => {
        // Busca metas globais para usar como baseline
        const globalGoalsSnap = await getDoc(doc(db, 'settings', 'global_goals'));
        const globalGoalsData = globalGoalsSnap.exists() ? globalGoalsSnap.data() as SalesGoals : defaultGoals;
        setGlobalGoals(globalGoalsData);

        let userCount = 0;
        const allUsersGoals: SalesGoals[] = [];

        querySnapshot.forEach((uDoc) => {
          const uData = uDoc.data();
          userCount++;
          
          // Mescla metas do usuário com as globais para ter o baseline correto
          const userGoals = uData.goals ? {
            ...globalGoalsData,
            ...uData.goals,
            targets: {
              ...globalGoalsData.targets,
              ...uData.goals.targets
            }
          } : globalGoalsData;
          
          allUsersGoals.push(userGoals);
        });

        if (userCount > 0) {
          const aggregatedGoals: SalesGoals = JSON.parse(JSON.stringify(globalGoalsData));
          
          // 1. Sum up base targets
          Object.keys(aggregatedGoals.targets).forEach(key => {
            const k = key as ActivityType;
            aggregatedGoals.targets[k].daily = 0;
            aggregatedGoals.targets[k].weekly = 0;
            aggregatedGoals.targets[k].monthly = 0;
          });

          allUsersGoals.forEach(g => {
            Object.keys(g.targets).forEach(key => {
              const k = key as ActivityType;
              aggregatedGoals.targets[k].daily += g.targets[k].daily;
              aggregatedGoals.targets[k].weekly += g.targets[k].weekly;
              aggregatedGoals.targets[k].monthly += g.targets[k].monthly;
            });
          });
          
          setGoals(aggregatedGoals);
        }
      });
      return () => unsubAllUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    const isUserAdmin = currentUser?.email === 'keroakscamargo@gmail.com' || currentUser?.email === 'axel@admin.com';
    if (isUserAdmin) {
      // Admin logic is handled in the other useEffect
      return;
    }
    
    if (userGoalsData) {
      const mergedGoals: SalesGoals = {
        ...globalGoals,
        ...userGoalsData,
        targets: {
          ...globalGoals.targets,
          ...userGoalsData.targets
        }
      };
      setGoals(mergedGoals);
    } else {
      setGoals(globalGoals);
    }
  }, [isAdmin, globalGoals, userGoalsData]);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: 'Axel',
    description: 'Supervisora e Mentora de Alta Performance.',
    instructions: 'Você é Axel, a autoridade máxima em supervisão e mentoria de vendas.',
    learnedKnowledge: '',
    knowledge: { text: '', files: [], diverseKnowledge: [], links: [] },
    specialties: { 
      callAnalysis: '', 
      callAnalysisFiles: [],
      objectionHandling: '',
      objectionHandlingFiles: []
    },
    tools: { googleSearch: true, salesLogging: true, searchStrategy: '' },
    voiceSettings: { voiceName: 'Kore' }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Vendedor',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=0D9488&color=fff`
        });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const usersCol = collection(db, 'users');
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setUserGoalsData(data.goals);
        
        // Lógica de primeiro acesso do dia
        const today = new Date().toISOString().split('T')[0];
        if (data.lastAccess !== today) {
          await setDoc(userDocRef, { lastAccess: today }, { merge: true });
        }

        if (data.agentConfig) {
          const cfg = { ...data.agentConfig };
          cfg.knowledge = cfg.knowledge || {};
          cfg.knowledge.files = cfg.knowledge.files || [];
          cfg.knowledge.diverseKnowledge = cfg.knowledge.diverseKnowledge || [];
          cfg.knowledge.links = cfg.knowledge.links || [];
          cfg.specialties = cfg.specialties || {};
          cfg.specialties.callAnalysisFiles = cfg.specialties.callAnalysisFiles || [];
          cfg.specialties.objectionHandlingFiles = cfg.specialties.objectionHandlingFiles || [];
          cfg.learnedKnowledge = cfg.learnedKnowledge || '';
          setAgentConfig(cfg as AgentConfig);
        }
      }
    });

    let unsubActivities: () => void;
    let unsubAllUsers: (() => void) | undefined;

    if (isAdmin) {
      // Se for admin, busca metas de todos os usuários para somar
      unsubAllUsers = onSnapshot(usersCol, async (querySnapshot) => {
        // Busca metas globais para usar como baseline
        const globalGoalsSnap = await getDoc(doc(db, 'settings', 'global_goals'));
        const globalGoalsData = globalGoalsSnap.exists() ? globalGoalsSnap.data() as SalesGoals : defaultGoals;
        setGlobalGoals(globalGoalsData);

        let userCount = 0;
        const allUsersGoals: SalesGoals[] = [];

        querySnapshot.forEach((uDoc) => {
          const uData = uDoc.data();
          userCount++;
          
          // Mescla metas do usuário com as globais para ter o baseline correto
          const userGoals = uData.goals ? {
            ...globalGoalsData,
            ...uData.goals,
            targets: {
              ...globalGoalsData.targets,
              ...uData.goals.targets
            }
          } : globalGoalsData;
          
          allUsersGoals.push(userGoals);
        });

        if (userCount > 0) {
          const aggregatedGoals: SalesGoals = JSON.parse(JSON.stringify(globalGoalsData));
          
          // 1. Sum up base targets
          Object.keys(aggregatedGoals.targets).forEach(key => {
            const k = key as ActivityType;
            aggregatedGoals.targets[k].daily = 0;
            aggregatedGoals.targets[k].weekly = 0;
            aggregatedGoals.targets[k].monthly = 0;
            
            allUsersGoals.forEach(ug => {
              const t = ug.targets[k] || globalGoalsData.targets[k];
              aggregatedGoals.targets[k].daily += (t.daily || 0);
              aggregatedGoals.targets[k].weekly += (t.weekly || 0);
              aggregatedGoals.targets[k].monthly += (t.monthly || 0);
            });
          });

          // 2. Calculate aggregated overrides for any date/month that has at least one override
          const allOverrideDates = new Set<string>();
          const allOverrideMonths = new Set<string>();
          const allDisabledDates = new Set<string>();

          allUsersGoals.forEach(ug => {
            ug.overrides?.forEach(o => {
              if (o.date) allOverrideDates.add(o.date);
              if (o.month) allOverrideMonths.add(o.month);
            });
            ug.disabledDates?.forEach(d => allDisabledDates.add(d));
          });

          const aggregatedOverrides: GoalOverride[] = [];
          
          // Aggregate Daily Overrides
          allOverrideDates.forEach(date => {
            (Object.keys(aggregatedGoals.targets) as ActivityType[]).forEach(type => {
              let totalGoalForDate = 0;
              let hasAnyOverride = false;

              allUsersGoals.forEach(ug => {
                // Se o dia estiver desativado para este usuário, a meta dele é 0
                if (ug.disabledDates?.includes(date)) {
                  totalGoalForDate += 0;
                } else {
                  const override = ug.overrides?.find(o => o.type === type && o.date === date);
                  if (override) {
                    totalGoalForDate += override.value;
                    hasAnyOverride = true;
                  } else {
                    totalGoalForDate += (ug.targets[type]?.daily || 0);
                  }
                }
              });

              if (hasAnyOverride) {
                aggregatedOverrides.push({
                  id: `agg_day_${type}_${date}`,
                  type,
                  date,
                  value: totalGoalForDate
                });
              }
            });
          });

          // Aggregate Monthly Overrides
          allOverrideMonths.forEach(month => {
            (Object.keys(aggregatedGoals.targets) as ActivityType[]).forEach(type => {
              let totalGoalForMonth = 0;
              let hasAnyOverride = false;

              allUsersGoals.forEach(ug => {
                const override = ug.overrides?.find(o => o.type === type && o.month === month);
                if (override) {
                  totalGoalForMonth += override.value;
                  hasAnyOverride = true;
                } else {
                  totalGoalForMonth += (ug.targets[type]?.monthly || 0);
                }
              });

              if (hasAnyOverride) {
                aggregatedOverrides.push({
                  id: `agg_month_${type}_${month}`,
                  type,
                  month,
                  value: totalGoalForMonth
                });
              }
            });
          });
          
          aggregatedGoals.overrides = aggregatedOverrides;
          aggregatedGoals.disabledDates = Array.from(allDisabledDates);
          setGoals(aggregatedGoals);
        } else {
          setGoals(defaultGoals);
        }
      });

      // Busca atividades de todos os usuários via Collection Group
      const q = query(collectionGroup(db, 'activities'));
      unsubActivities = onSnapshot(q, (querySnapshot) => {
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
        // Ordenar em memória para evitar necessidade de índice composto no Firestore
        activitiesData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(activitiesData);
      });
    } else {
      // Fluxo normal para usuário comum
      const activitiesCol = collection(db, 'users', currentUser.uid, 'activities');
      const q = query(activitiesCol, orderBy('timestamp', 'desc'));
      unsubActivities = onSnapshot(q, (querySnapshot) => {
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
    }

    return () => {
      unsubUser();
      unsubActivities();
      if (unsubAllUsers) unsubAllUsers();
    };
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
        await setDoc(activityDoc, { type, count: value, timestamp: Timestamp.fromDate(date), updatedAt: Timestamp.now() }, { merge: true });
      } else {
        const snap = await getDoc(activityDoc);
        const currentCount = snap.exists() ? snap.data().count : 0;
        await setDoc(activityDoc, { type, count: currentCount + value, timestamp: Timestamp.fromDate(date), updatedAt: Timestamp.now() }, { merge: true });
      }
    } catch (error) { console.error("Erro ao sincronizar atividade:", error); }
  };

  const handleKnowledgeLearned = async (newInsight: string) => {
    if (!currentUser) return;
    try {
      const currentLearned = agentConfig.learnedKnowledge || '';
      const updatedLearned = currentLearned + `\n[${new Date().toLocaleDateString()}]: ${newInsight}\n`;
      await setDoc(doc(db, 'users', currentUser.uid), { 
        agentConfig: { ...agentConfig, learnedKnowledge: updatedLearned } 
      }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar conhecimento aprendido:", err);
    }
  };
  
  const handleLogout = async () => await signOut(auth);

  const handleUpdateGoals = async (newGoals: SalesGoals) => {
    if (!currentUser) return;
    try { 
      // Se for admin, salva como padrão global também
      if (isAdmin) {
        await setDoc(doc(db, 'settings', 'global_goals'), newGoals, { merge: true });
      }
      await setDoc(doc(db, 'users', currentUser.uid), { goals: newGoals }, { merge: true }); 
    } catch (err) { console.error("Erro ao salvar metas:", err); }
  };

  const handleUpdateAgent = async (newConfig: AgentConfig) => {
    if (!currentUser) return;
    try { 
      const configSize = JSON.stringify(newConfig).length;
      if (configSize > 1000000) {
        alert("A central de conhecimento está muito grande. Remova alguns arquivos antes de salvar.");
        return;
      }
      await setDoc(doc(db, 'users', currentUser.uid), { agentConfig: newConfig }, { merge: true }); 
      setIsSettingsOpen(false);
    } catch (err: any) { 
      console.error("Erro ao salvar Axel Config:", err);
      alert("Erro ao salvar arquivos. O limite do banco de dados pode ter sido atingido.");
    }
  };

  const handleGlobalSubmit = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    if (activeView !== 'chat') {
      setActiveView('chat');
      setTimeout(() => chatRef.current?.sendMessage(text), 150);
    } else chatRef.current?.sendMessage(text);
  };

  if (authLoading) return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#020617] text-cyan-400">
      <Loader2 size={48} className="animate-spin mb-4" />
      <p className="text-[10px] font-black tracking-[0.3em] uppercase">Sincronizando Protocolos Axel...</p>
    </div>
  );

  if (!currentUser) return <Login />;

  return (
    <div className="relative h-screen flex bg-[#020617] overflow-hidden font-sans text-slate-100">
      <aside className="w-16 md:w-20 h-full flex flex-col items-center py-6 md:py-10 gap-4 md:gap-8 border-r border-slate-800/30 backdrop-blur-3xl z-40 bg-slate-950/40 shrink-0">
        <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 md:mb-8 border border-cyan-500/20 shadow-lg overflow-hidden group hover:border-cyan-400/50 transition-all">
          <img src={currentUser.photoURL} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Profile" />
        </button>
        <nav className="flex-1 flex flex-col gap-4 md:gap-10 text-slate-500">
          <button onClick={() => setActiveView('home')} className={`p-2 md:p-3 rounded-xl transition-all ${activeView === 'home' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg scale-110' : 'hover:text-cyan-400 hover:scale-110'}`} title="Home"><Sparkles size={20} className="md:size-6" /></button>
          <button onClick={() => setActiveView('atividades')} className={`p-2 md:p-3 rounded-xl transition-all ${activeView === 'atividades' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg scale-110' : 'hover:text-cyan-400 hover:scale-110'}`} title="Dashboard"><BarChart2 size={20} className="md:size-6" /></button>
          <button onClick={() => setActiveView('insights')} className={`p-2 md:p-3 rounded-xl transition-all ${activeView === 'insights' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg scale-110' : 'hover:text-cyan-400 hover:scale-110'}`} title="Insights"><Lightbulb size={20} className="md:size-6" /></button>
          <button onClick={() => setActiveView('ranking')} className={`p-2 md:p-3 rounded-xl transition-all ${activeView === 'ranking' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg scale-110' : 'hover:text-cyan-400 hover:scale-110'}`} title="Ranking"><Trophy size={20} className="md:size-6" /></button>
          <button onClick={() => setActiveView('chat')} className={`p-2 md:p-3 rounded-xl transition-all ${activeView === 'chat' ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg scale-110' : 'hover:text-cyan-400 hover:scale-110'}`} title="Axel Chat"><MessageSquare size={20} className="md:size-6" /></button>
        </nav>
        {isAdmin && <button onClick={() => setIsSettingsOpen(true)} className="p-2 md:p-3 text-slate-500 hover:text-cyan-400 hover:scale-110 transition-all" title="Configurações Axel"><Settings size={20} className="md:size-6" /></button>}
        <button onClick={handleLogout} className="mt-2 md:mt-4 p-2 md:p-3 text-slate-600 hover:text-red-400 transition-colors" title="Sair"><LogOut size={20} className="md:size-6" /></button>
      </aside>

      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeView === 'home' && (
            <div className="min-h-full flex flex-col items-center justify-center max-w-5xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 text-center">
              <div className="relative mb-8 md:mb-12">
                 <div className="absolute inset-0 blur-[100px] bg-cyan-500/20 rounded-full scale-150"></div>
                 <div className="relative bg-[#0a0f1e] p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-slate-700 shadow-[0_0_50px_rgba(6,182,212,0.1)]"><Cpu size={48} className="md:size-[72px] text-cyan-400" /></div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-2 md:mb-4 tracking-tighter text-white uppercase tracking-widest">Axel AI</h1>
              <p className="text-slate-400 mb-8 md:mb-16 max-w-lg mx-auto text-lg md:text-xl font-medium leading-relaxed italic opacity-80">Conexão neural ativa para {currentUser.displayName}. Elevando seu desempenho ao nível elite.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 w-full px-4 md:px-6">
                 <button onClick={() => setActiveView('chat')} className="group p-4 md:p-8 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2.5rem] hover:border-cyan-500/40 transition-all text-left shadow-xl hover:shadow-cyan-500/5">
                    <MessageSquare size={20} className="md:size-7 text-cyan-500 mb-2 md:mb-4 group-hover:scale-110 transition-transform" /><p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest">Link Axel</p>
                 </button>
                 <button onClick={() => setActiveView('insights')} className="group p-4 md:p-8 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2.5rem] hover:border-blue-500/40 transition-all text-left shadow-xl hover:shadow-blue-500/5">
                    <Lightbulb size={20} className="md:size-7 text-blue-500 mb-2 md:mb-4 group-hover:scale-110 transition-transform" /><p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest">Base Neural</p>
                 </button>
                 <button onClick={() => setActiveView('ranking')} className="group p-4 md:p-8 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2.5rem] hover:border-yellow-500/40 transition-all text-left shadow-xl hover:shadow-yellow-500/5">
                    <Trophy size={20} className="md:size-7 text-yellow-500 mb-2 md:mb-4 group-hover:scale-110 transition-transform" /><p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest">Status Elite</p>
                 </button>
                 <button onClick={() => { setActiveView('chat'); setTimeout(() => chatRef.current?.triggerTool('call'), 150); }} className="group p-4 md:p-8 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2.5rem] hover:border-emerald-500/40 transition-all text-left shadow-xl hover:shadow-emerald-500/5">
                    <Headset size={20} className="md:size-7 text-emerald-500 mb-2 md:mb-4 group-hover:scale-110 transition-transform" /><p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest">Análise Call</p>
                 </button>
                 <button onClick={() => { setActiveView('chat'); setTimeout(() => chatRef.current?.triggerTool('objection'), 150); }} className="group p-4 md:p-8 bg-slate-900/40 border border-slate-800 rounded-2xl md:rounded-[2.5rem] hover:border-purple-500/40 transition-all text-left shadow-xl hover:shadow-purple-500/5">
                    <Shield size={20} className="md:size-7 text-purple-500 mb-2 md:mb-4 group-hover:scale-110 transition-transform" /><p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest">Objeções</p>
                 </button>
              </div>
            </div>
          )}

          {activeView === 'atividades' && (
            <div className="w-full p-8 md:p-16">
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
            <div className="w-full p-8 md:p-16">
               <Ranking currentUser={currentUser} />
            </div>
          )}

          {activeView === 'insights' && (
            <div className="w-full h-full p-8 md:p-16">
               <Insights currentUser={currentUser} />
            </div>
          )}

          {activeView === 'chat' && (
            <div className="w-full h-full flex flex-col pb-36">
              <ChatBot 
                ref={chatRef} 
                agentConfig={agentConfig} 
                goals={goals}
                todayStats={todayStats}
                onActivityDetected={(type, count, mode, date) => syncActivity(type, count, date || new Date(), mode)}
                onKnowledgeLearned={handleKnowledgeLearned}
                onGoalsUpdate={handleUpdateGoals}
              />
            </div>
          )}
        </div>

        {(activeView !== 'atividades' && activeView !== 'ranking' && activeView !== 'insights') && (
          <div className="absolute bottom-12 left-0 right-0 px-6 md:px-20 flex justify-center z-30 animate-in slide-in-from-bottom-10 duration-700">
            <div className="max-w-5xl w-full bg-[#0f172a]/95 border border-slate-700/50 backdrop-blur-3xl rounded-[2.8rem] p-3 flex shadow-2xl items-center gap-4 border-b-4 border-b-cyan-500/20">
              <input 
                type="text" placeholder="Ensine algo novo para a Axel ou envie seu status..." value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSubmit()}
                className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-slate-100 placeholder:text-slate-500 text-lg font-medium"
              />
              <div className="flex items-center gap-3 pr-4">
                <button onClick={handleGlobalSubmit} disabled={!inputValue.trim()} className={`p-4 rounded-[1.2rem] transition-all px-10 flex items-center gap-3 ${inputValue.trim() ? 'bg-cyan-600 text-white shadow-[0_10px_20px_rgba(8,145,178,0.3)] hover:bg-cyan-500 hover:scale-105' : 'text-slate-600'}`}>
                  <span className="hidden md:inline text-xs font-black uppercase tracking-widest">Enviar</span>
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAdmin && isSettingsOpen && (
        <AgentCreator 
          initialConfig={agentConfig} 
          initialGoals={globalGoals}
          onSave={handleUpdateAgent} 
          onSaveGoals={handleUpdateGoals}
          onClose={() => setIsSettingsOpen(false)} 
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

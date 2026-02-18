
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Flame, TrendingUp, TrendingDown, 
  Minus, Crown, Medal, Zap, Star, ArrowUpRight, 
  Loader2, ShieldAlert, RefreshCw, Lock, 
  Instagram, Users, Mic2, Phone, Hash, CalendarDays, CheckSquare,
  Sparkles, BarChart3, AlertCircle, ShieldOff
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs } from "firebase/firestore";
import { RankingUser, ActivityType, User } from '../types';

const ACTIVITY_WEIGHTS: Record<ActivityType, number> = {
  meeting_done: 50,
  meeting_scheduled: 20,
  speech: 15,
  ligacoes: 5,
  insta_follow: 3,
  insta_msg: 1,
  insta_numbers: 1
};

const activityHeaders: { type: ActivityType, label: string, icon: any, color: string }[] = [
  { type: 'insta_msg', label: 'MSG Insta', icon: Instagram, color: 'text-pink-500' },
  { type: 'insta_follow', label: 'Follow Insta', icon: Users, color: 'text-purple-500' },
  { type: 'speech', label: 'Speeches', icon: Mic2, color: 'text-cyan-500' },
  { type: 'ligacoes', label: 'Ligações', icon: Phone, color: 'text-yellow-500' },
  { type: 'insta_numbers', label: 'Números Insta', icon: Hash, color: 'text-blue-500' },
  { type: 'meeting_scheduled', label: 'Reuniões Marcadas', icon: CalendarDays, color: 'text-orange-500' },
  { type: 'meeting_done', label: 'Reuniões Realizadas', icon: CheckSquare, color: 'text-emerald-500' },
];

type Period = 'day' | 'week' | 'month';

interface RankingProps {
  currentUser: User;
}

const Ranking: React.FC<RankingProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const getDateRanges = (p: Period) => {
    const now = new Date();
    const currentStart = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    if (p === 'day') {
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (p === 'week') {
      const day = now.getDay();
      currentStart.setDate(now.getDate() - day);
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(currentStart.getDate() - 7);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(currentStart.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
    } else {
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevStart.setDate(1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(0);
      prevEnd.setHours(23, 59, 59, 999);
    }

    return { currentStart, prevStart, prevEnd };
  };

  const fetchRankingData = async () => {
    setLoading(true);
    setError(null);
    setPermissionError(false);
    const { currentStart, prevStart, prevEnd } = getDateRanges(period);

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const rankingData: RankingUser[] = [];
      let totalPointsInTeam = 0;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        let totalPoints = 0;
        let prevPeriodPoints = 0;
        let activitiesCount = 0;
        const activityDetails: Record<ActivityType, number> = {
          insta_msg: 0, insta_follow: 0, speech: 0, ligacoes: 0,
          insta_numbers: 0, meeting_scheduled: 0, meeting_done: 0
        };

        try {
          const activitiesSnap = await getDocs(collection(db, 'users', userId, 'activities'));
          activitiesSnap.forEach(actDoc => {
            const act = actDoc.data();
            const count = Number(act.count) || 0;
            const type = act.type as ActivityType;
            const weight = ACTIVITY_WEIGHTS[type] || 1;
            const timestamp = act.timestamp?.toDate ? act.timestamp.toDate() : new Date(act.timestamp);

            if (timestamp >= currentStart) {
              totalPoints += count * weight;
              activitiesCount += count;
              activityDetails[type] = (activityDetails[type] || 0) + count;
            } else if (timestamp >= prevStart && timestamp <= prevEnd) {
              prevPeriodPoints += count * weight;
            }
          });
        } catch (e) {
          if (userId !== currentUser.uid) continue;
        }

        rankingData.push({
          uid: userId,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Vendedor',
          photoURL: userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=0D9488&color=fff`,
          totalPoints,
          prevPeriodPoints,
          activitiesCount,
          activityDetails,
          isOnFire: totalPoints > (period === 'day' ? 50 : period === 'week' ? 300 : 1200),
          trend: totalPoints > prevPeriodPoints ? 'up' : totalPoints < prevPeriodPoints ? 'down' : 'stable',
          vsTeamAverage: 'average'
        });
        totalPointsInTeam += totalPoints;
      }

      const teamAverage = rankingData.length > 0 ? totalPointsInTeam / rankingData.length : 0;
      rankingData.forEach(u => {
        if (u.totalPoints > teamAverage * 1.15) u.vsTeamAverage = 'above';
        else if (u.totalPoints < teamAverage * 0.85) u.vsTeamAverage = 'below';
        else u.vsTeamAverage = 'average';
      });

      rankingData.sort((a, b) => b.totalPoints - a.totalPoints);
      setUsers(rankingData);
    } catch (err: any) {
      console.error("Erro ao carregar ranking:", err);
      if (err.code === 'permission-denied') {
        setPermissionError(true);
      } else {
        setError("Falha ao sincronizar performance do time.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingData();
  }, [period]);

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const teamAverage = useMemo(() => {
    if (users.length === 0) return 0;
    return users.reduce((acc, u) => acc + u.totalPoints, 0) / users.length;
  }, [users]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-cyan-400">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest">Axel analisando métricas do time...</p>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 text-center">
         <div className="bg-[#0b1222]/80 border border-slate-800 p-12 rounded-[3rem] shadow-2xl">
            <ShieldOff size={48} className="text-yellow-500 mx-auto mb-6" />
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Acesso Restrito ao Ranking</h2>
            <p className="text-slate-400 mt-4 text-sm leading-relaxed">As regras de segurança do seu Firestore impedem a leitura de dados de outros usuários. Para ativar o Ranking, configure as permissões no Console do Firebase.</p>
            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-[10px] text-yellow-200 font-mono text-left overflow-x-auto">
              allow read: if request.auth != null; // Adicione isso na coleção /users/
            </div>
            <button onClick={fetchRankingData} className="mt-8 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 mx-auto px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <RefreshCw size={18} /> Tentar Sincronizar
            </button>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 text-center">
         <div className="bg-[#0b1222]/80 border border-slate-800 p-12 rounded-[3rem] shadow-2xl">
            <ShieldAlert size={48} className="text-red-400 mx-auto mb-6" />
            <h2 className="text-xl font-black text-white">{error}</h2>
            <button onClick={fetchRankingData} className="mt-8 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 mx-auto px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <RefreshCw size={18} /> Tentar Novamente
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-12 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* Filtros de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            Elite Axel <Trophy className="text-yellow-500" size={32} />
          </h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-400" /> Inteligência comparativa de performance em tempo real.
          </p>
        </div>
        
        <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
           {(['day', 'week', 'month'] as Period[]).map(p => (
             <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p 
                ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
             >
               {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
             </button>
           ))}
        </div>
      </div>

      {/* Pódio Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12 max-w-5xl mx-auto w-full min-h-[500px]">
        {/* 2º Lugar */}
        {topThree[1] && (
          <div className="order-2 md:order-1 flex flex-col items-center animate-in slide-in-from-left-8 duration-700">
             <div className="relative group mb-6">
                <div className="absolute inset-0 bg-slate-400/20 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700"></div>
                <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-slate-400/50 shadow-2xl">
                   <img src={topThree[1].photoURL} className="w-full h-full object-cover" alt={topThree[1].displayName} />
                   <div className="absolute bottom-0 left-0 w-full bg-slate-400 py-1 flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-950 uppercase">Silver</span>
                   </div>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-slate-800 border border-slate-400 rounded-full flex items-center justify-center text-slate-400 shadow-xl">
                   <Medal size={20} />
                </div>
             </div>
             <div className="text-center space-y-1 mb-8">
                <h3 className="text-lg font-black text-white truncate">{topThree[1].displayName}</h3>
                <p className="text-slate-400 text-sm font-bold">{topThree[1].totalPoints.toLocaleString()} pts</p>
             </div>
             <div className="w-full h-32 bg-gradient-to-t from-slate-400/10 to-slate-400/20 rounded-t-[2rem] border-t border-x border-slate-400/30 flex items-center justify-center">
                <span className="text-4xl font-black text-slate-400/50">2</span>
             </div>
          </div>
        )}

        {/* 1º Lugar */}
        {topThree[0] && (
          <div className="order-1 md:order-2 flex flex-col items-center -mt-8 animate-in zoom-in-95 duration-1000">
             <div className="relative group mb-8">
                <div className="absolute inset-0 bg-yellow-500/30 blur-[60px] rounded-full scale-150 group-hover:scale-175 transition-transform duration-700"></div>
                <div className="relative w-36 h-36 rounded-[2.5rem] overflow-hidden border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                   <img src={topThree[0].photoURL} className="w-full h-full object-cover" alt={topThree[0].displayName} />
                   <div className="absolute bottom-0 left-0 w-full bg-yellow-500 py-1.5 flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Champion</span>
                   </div>
                </div>
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center text-slate-950 shadow-2xl animate-bounce">
                   <Crown size={28} />
                </div>
                {topThree[0].isOnFire && (
                  <div className="absolute -bottom-2 -right-2 p-2.5 bg-red-600 rounded-2xl text-white shadow-xl animate-pulse">
                     <Flame size={18} fill="currentColor" />
                  </div>
                )}
             </div>
             <div className="text-center space-y-1 mb-10">
                <h3 className="text-2xl font-black text-white tracking-tight">{topThree[0].displayName}</h3>
                <div className="flex items-center justify-center gap-2">
                   <p className="text-yellow-500 text-2xl font-black">{topThree[0].totalPoints.toLocaleString()} <span className="text-xs uppercase ml-1">PTS</span></p>
                </div>
             </div>
             <div className="w-full h-48 bg-gradient-to-t from-yellow-500/10 to-yellow-500/20 rounded-t-[2.5rem] border-t border-x border-yellow-500/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,#eab308,transparent_70%)]"></div>
                <span className="text-6xl font-black text-yellow-500/50 relative z-10">1</span>
             </div>
          </div>
        )}

        {/* 3º Lugar */}
        {topThree[2] && (
          <div className="order-3 md:order-3 flex flex-col items-center animate-in slide-in-from-right-8 duration-700">
             <div className="relative group mb-6">
                <div className="absolute inset-0 bg-orange-600/20 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-700"></div>
                <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-orange-600/50 shadow-2xl">
                   <img src={topThree[2].photoURL} className="w-full h-full object-cover" alt={topThree[2].displayName} />
                   <div className="absolute bottom-0 left-0 w-full bg-orange-600 py-1 flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-950 uppercase">Bronze</span>
                   </div>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-slate-800 border border-orange-600 rounded-full flex items-center justify-center text-orange-600 shadow-xl">
                   <Medal size={20} />
                </div>
             </div>
             <div className="text-center space-y-1 mb-8">
                <h3 className="text-lg font-black text-white truncate">{topThree[2].displayName}</h3>
                <p className="text-slate-400 text-sm font-bold">{topThree[2].totalPoints.toLocaleString()} pts</p>
             </div>
             <div className="w-full h-24 bg-gradient-to-t from-orange-600/10 to-orange-600/20 rounded-t-[2rem] border-t border-x border-orange-600/30 flex items-center justify-center">
                <span className="text-4xl font-black text-orange-600/50">3</span>
             </div>
          </div>
        )}
      </div>

      {/* Tabela Comparativa Detalhada */}
      <div className="bg-[#0b1222]/80 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-1000">
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between bg-slate-900/40 gap-6">
           <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                 Tabela de Benchmark Axel <Zap className="text-cyan-400" size={18} />
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Comparativo de benchmark e tendência individual</p>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acima da Média</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Abaixo da Média</span>
              </div>
              <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <BarChart3 size={14} className="text-cyan-400" /> Média do Time: {Math.round(teamAverage).toLocaleString()}
              </div>
           </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                <th className="px-8 py-6 sticky left-0 bg-[#0b1222] z-10 w-[240px]">Vendedor</th>
                <th className="px-6 py-6 text-center">Benchmark (Axel)</th>
                <th className="px-6 py-6 text-center">Trend vs Período Ant.</th>
                {activityHeaders.map(header => (
                  <th key={header.type} className="px-6 py-6 min-w-[150px] text-center">
                    <div className="flex flex-col items-center gap-2">
                       <header.icon size={16} className={header.color} />
                       <span className="whitespace-nowrap">{header.label}</span>
                    </div>
                  </th>
                ))}
                <th className="px-8 py-6 text-right">Total Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((user, idx) => (
                <tr key={user.uid} className="group hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5 sticky left-0 bg-[#0b1222] group-hover:bg-slate-800/30 z-10">
                    <div className="flex items-center gap-4">
                      <span className="w-4 text-[11px] font-black text-slate-600">{idx + 1}</span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white text-sm truncate">{user.displayName}</p>
                      </div>
                    </div>
                  </td>
                  
                  {/* Benchmark Axel */}
                  <td className="px-6 py-5 text-center">
                     <div className="flex justify-center">
                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          user.vsTeamAverage === 'above' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          user.vsTeamAverage === 'below' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                           {user.vsTeamAverage === 'above' ? 'Acima da Média' : user.vsTeamAverage === 'below' ? 'Abaixo da Média' : 'Na Média'}
                        </div>
                     </div>
                  </td>

                  {/* Trend vs Anterior */}
                  <td className="px-6 py-5 text-center">
                     <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                           {user.trend === 'up' ? <TrendingUp size={14} className="text-emerald-400" /> : 
                            user.trend === 'down' ? <TrendingDown size={14} className="text-red-400" /> : 
                            <Minus size={14} className="text-slate-600" />}
                           <span className={`text-[11px] font-black ${
                             user.trend === 'up' ? 'text-emerald-400' : 
                             user.trend === 'down' ? 'text-red-400' : 'text-slate-600'
                           }`}>
                             {user.prevPeriodPoints > 0 ? (
                               Math.abs(((user.totalPoints - user.prevPeriodPoints) / user.prevPeriodPoints) * 100).toFixed(0) + '%'
                             ) : user.totalPoints > 0 ? 'NEW' : '0%'}
                           </span>
                        </div>
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">vs período ant.</span>
                     </div>
                  </td>

                  {activityHeaders.map(header => (
                    <td key={header.type} className="px-6 py-5 text-center font-bold text-slate-300 text-sm">
                      {user.activityDetails[header.type] > 0 ? (
                        <span className={`${user.activityDetails[header.type] >= 50 ? 'text-white' : ''}`}>
                          {user.activityDetails[header.type]}
                        </span>
                      ) : (
                        <span className="text-slate-800">-</span>
                      )}
                    </td>
                  ))}
                  
                  <td className="px-8 py-5 text-right">
                    <span className="font-black text-white text-base">{user.totalPoints.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-slate-900/30 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
         <div className="flex items-center gap-4">
            <AlertCircle size={20} className="text-cyan-400" />
            <p className="text-xs text-slate-400 max-w-2xl font-medium leading-relaxed">
               A Axel analisa a performance individual comparando o período atual (<span className="text-white font-bold">{period === 'day' ? 'hoje' : period === 'week' ? 'esta semana' : 'este mês'}</span>) com o equivalente anterior. O benchmark "Elite" indica vendedores performando 15% acima da média do time.
            </p>
         </div>
         <button onClick={fetchRankingData} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <RefreshCw size={14} /> Atualizar Agora
         </button>
      </div>
    </div>
  );
};

export default Ranking;

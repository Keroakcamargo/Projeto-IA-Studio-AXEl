
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Instagram, CalendarDays, 
  CheckSquare, Mic2, Users, TrendingUp, Hash, Target, X, 
  ArrowLeft, Calendar, Sparkles, Phone, TrendingDown, 
  Zap, BrainCircuit, AlertCircle, BarChart3, Layers, UserPlus
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { SalesActivity, SalesGoals, ActivityType, ActivityGoal } from '../types';

interface DashboardProps {
  activities: SalesActivity[];
  goals: SalesGoals;
  onAddActivity: (type: ActivityType, count: number, date?: Date) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activities, goals, onAddActivity }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'select' | 'input'>('select');
  const [tempActivity, setTempActivity] = useState<ActivityType | null>(null);
  const [tempCount, setTempCount] = useState<number>(0);
  const [tempDate, setTempDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [evolutionFilter, setEvolutionFilter] = useState<ActivityType | 'total'>('total');

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const activityLabels: Record<ActivityType, { label: string, icon: any, color: string, bgColor: string, emoji: string, subtitle: string, hex: string }> = {
    insta_msg: { label: 'MSG Insta', icon: Instagram, color: 'text-pink-500', hex: '#ec4899', bgColor: 'bg-pink-500/10', emoji: '💬', subtitle: 'Mensagens enviadas' },
    insta_follow: { label: 'Follow Insta', icon: Users, color: 'text-purple-500', hex: '#a855f7', bgColor: 'bg-purple-500/10', emoji: '👥', subtitle: 'Follow-ups realizados' },
    speech: { label: 'Speeches', icon: Mic2, color: 'text-cyan-500', hex: '#06b6d4', bgColor: 'bg-cyan-500/10', emoji: '🎤', subtitle: 'Apresentações/Pitches' },
    ligacoes: { label: 'Ligações', icon: Phone, color: 'text-yellow-500', hex: '#eab308', bgColor: 'bg-yellow-500/10', emoji: '📞', subtitle: 'Chamadas efetuadas' },
    insta_numbers: { label: 'Números Insta', icon: Hash, color: 'text-blue-500', hex: '#3b82f6', bgColor: 'bg-blue-500/10', emoji: '📊', subtitle: 'Métricas gerais' },
    referidos: { label: 'Referidos', icon: UserPlus, color: 'text-indigo-500', hex: '#6366f1', bgColor: 'bg-indigo-500/10', emoji: '🤝', subtitle: 'Indicações recebidas' },
    meeting_scheduled: { label: 'Reuniões Marcadas', icon: CalendarDays, color: 'text-orange-500', hex: '#f97316', bgColor: 'bg-orange-500/10', emoji: '📅', subtitle: 'Agendamentos' },
    meeting_done: { label: 'Reuniões Realizadas', icon: CheckSquare, color: 'text-emerald-500', hex: '#10b981', bgColor: 'bg-emerald-500/10', emoji: '✅', subtitle: 'Meetings concluídas' }
  };

  const activitiesByDate = useMemo(() => {
    return activities.reduce((acc, act) => {
      const key = formatDateKey(new Date(act.timestamp));
      if (!acc[key]) acc[key] = {};
      acc[key][act.type] = (acc[key][act.type] || 0) + act.count;
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }, [activities]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const getMonthTotal = (month: number, year: number, filterType: ActivityType | 'total') => {
      return activities.reduce((acc: number, act: SalesActivity) => {
        const d = new Date(act.timestamp);
        if (d.getMonth() === month && d.getFullYear() === year) {
          if (filterType === 'total' || act.type === filterType) {
            acc += Number(act.count);
          }
        }
        return acc;
      }, 0);
    };

    const getDayTotal = (key: string) => {
      const dayData = activitiesByDate[key] || {};
      return (Object.values(dayData) as number[]).reduce((a: number, b: number) => a + Number(b), 0);
    };

    const getGoalForDate = (type: ActivityType, date: Date, period: 'daily' | 'weekly' | 'monthly') => {
      const dateKey = date.toISOString().split('T')[0];
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Check if date is disabled (OFF)
      if (goals.disabledDates?.includes(dateKey)) {
        return 0;
      }

      if (period === 'daily') {
        const override = goals.overrides?.find(o => o.type === type && o.date === dateKey);
        if (override) return override.value;
      } else if (period === 'monthly') {
        const override = goals.overrides?.find(o => o.type === type && o.month === monthKey);
        if (override) return override.value;
      }
      
      return Number(goals.targets[type][period] || 0);
    };

    const curMonthTotal = getMonthTotal(currentMonth, currentYear, 'total');
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthTotal = getMonthTotal(prevMonthDate.getMonth(), prevMonthDate.getFullYear(), 'total');

    const selectedDayTotal = getDayTotal(formatDateKey(selectedDate));
    const previousDayOfSelected = new Date(selectedDate);
    previousDayOfSelected.setDate(selectedDate.getDate() - 1);
    const prevSelectedDayTotal = getDayTotal(formatDateKey(previousDayOfSelected));

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      chartData.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        total: getMonthTotal(d.getMonth(), d.getFullYear(), evolutionFilter)
      });
    }

    const dayOfMonth = Math.max(1, now.getDate());
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAverage = curMonthTotal / dayOfMonth;
    const projectedTotal = dailyAverage * daysInMonth;

    const totalMonthlyGoal = (Object.keys(goals.targets) as ActivityType[]).reduce((acc: number, type: ActivityType) => {
      const g = goals.targets[type];
      return acc + (g.enabled ? getGoalForDate(type, now, 'monthly') : 0);
    }, 0);
    const goalStatus = totalMonthlyGoal > 0 ? (projectedTotal / totalMonthlyGoal) * 100 : 0;
    const totalDailyGoal = (Object.keys(goals.targets) as ActivityType[]).reduce((acc: number, type: ActivityType) => {
      const g = goals.targets[type];
      return acc + (g.enabled ? getGoalForDate(type, selectedDate, 'daily') : 0);
    }, 0);

    return {
      curMonthTotal,
      prevMonthTotal,
      selectedDayTotal,
      prevSelectedDayTotal,
      chartData,
      projectedTotal,
      goalStatus,
      totalMonthlyGoal,
      totalDailyGoal,
      isBatingGoal: projectedTotal >= totalMonthlyGoal,
      dayOfMonth,
      daysInMonth
    };
  }, [activities, activitiesByDate, selectedDate, goals, evolutionFilter]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const openRegister = (type?: ActivityType) => {
    const dKey = formatDateKey(selectedDate);
    if (type) {
      setTempActivity(type);
      setModalStep('input');
      setTempCount(activitiesByDate[dKey]?.[type] || 0);
    } else {
      setModalStep('select');
      setTempCount(0);
    }
    setTempDate(dKey);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (tempActivity) {
      const targetDate = new Date(tempDate + 'T12:00:00');
      onAddActivity(tempActivity, tempCount, targetDate);
      setIsModalOpen(false);
      setModalStep('select');
    }
  };

  const getDayProgressColor = (achieved: number, target: number, isSelected: boolean, isActive: boolean, dateObj: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentViewDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    
    if (isSelected) return 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500/20';
    if (!isActive) return 'bg-slate-950/20 border-transparent opacity-40 grayscale';

    const isPastOrToday = currentViewDate <= today;
    const isSameMonth = dateObj.getMonth() === viewDate.getMonth();

    if (isPastOrToday && isSameMonth && achieved === 0) {
        return 'bg-red-500/5 border-red-500/40 text-slate-400 hover:border-red-500/70 shadow-inner transition-colors duration-500';
    }

    if (achieved === 0 || target === 0) return 'bg-[#0f172a]/40 border-slate-800/50 hover:border-slate-600';

    const percent = (achieved / target) * 100;

    if (percent < 20) return 'bg-red-500/10 border-red-500/40 text-red-400';
    if (percent < 40) return 'bg-orange-500/10 border-orange-500/40 text-orange-400';
    if (percent < 60) return 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400';
    if (percent < 80) return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
    return 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
  };

  const currentChartColor = evolutionFilter === 'total' || !activityLabels[evolutionFilter as ActivityType] ? '#22d3ee' : activityLabels[evolutionFilter as ActivityType].hex;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 space-y-8 pb-32">
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {(Object.entries(activityLabels) as [ActivityType, any][]).map(([type, info]) => {
          const total = activities.reduce((acc: number, act: SalesActivity) => {
            const d = new Date(act.timestamp);
            if (d.getMonth() === new Date().getMonth()) acc += (act.type === type ? Number(act.count) : 0);
            return acc;
          }, 0);
          const target = goals.targets[type] as ActivityGoal | undefined;
          
          const dateKey = selectedDate.toISOString().split('T')[0];
          const override = goals.overrides?.find(o => o.type === type && o.date === dateKey);
          const dailyGoal = override ? override.value : Number(target?.daily || 0);
          
          const monthlyGoal = Number(target?.monthly || 0);
          const isEnabled = target?.enabled;
          const progress = isEnabled && monthlyGoal > 0 ? Math.min(100, (total / monthlyGoal) * 100) : 0;
          
          return (
            <div key={type} className={`bg-[#0b1222]/80 border ${isEnabled ? 'border-slate-800' : 'border-slate-800/30'} p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden transition-all group`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info.bgColor} ${isEnabled ? info.color : 'text-slate-600'} transition-transform group-hover:scale-110`}>
                <info.icon size={20} />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{info.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-xl font-black mt-0.5 ${isEnabled ? 'text-white' : 'text-slate-400'}`}>{total}</p>
                  {isEnabled && monthlyGoal > 0 && (
                    <span className="text-[9px] font-bold text-slate-500 italic">/ {monthlyGoal}</span>
                  )}
                </div>
              </div>
              {isEnabled && monthlyGoal > 0 && (
                <div className="absolute bottom-0 left-0 h-1.5 bg-slate-800/50 w-full">
                  <div className={`h-full transition-all duration-1000 ${info.color.replace('text', 'bg')}`} style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h2 className="text-2xl font-black text-white tracking-tight">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h2>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ritmo de Vendas</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2.5 bg-slate-800/40 rounded-xl text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
               <button onClick={() => setViewDate(new Date())} className="px-5 py-2.5 bg-slate-800/40 text-[10px] font-black text-white rounded-xl uppercase hover:bg-slate-700 transition-colors">Hoje</button>
               <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2.5 bg-slate-800/40 rounded-xl text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-6">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${goals.activeDays.includes(i as any) ? 'text-slate-500' : 'text-slate-800'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3 flex-1">
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const key = formatDateKey(dateObj);
              const isSelected = key === formatDateKey(selectedDate);
              const isToday = key === formatDateKey(new Date());
              const isActive = goals.activeDays.includes(dateObj.getDay() as any);
              const dayData = activitiesByDate[key] || {};
              const dayAchievedTotal = (Object.values(dayData) as number[]).reduce((a: number, b: number) => a + Number(b), 0);
              
              const dayClass = getDayProgressColor(dayAchievedTotal, analyticsData.totalDailyGoal, isSelected, isActive, dateObj);

              return (
                <button
                  key={day} onClick={() => setSelectedDate(dateObj)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${dayClass}`}
                >
                  <span className={`text-sm font-black ${isToday && !isSelected ? 'text-cyan-400' : isSelected ? 'text-white' : ''}`}>{day}</span>
                  {dayAchievedTotal > 0 && (
                    <div className="absolute bottom-2 flex gap-0.5">
                      {Object.keys(dayData).slice(0, 4).map(t => {
                        const activityStyle = activityLabels[t as ActivityType];
                        if (!activityStyle) return null;
                        return <div key={t} className={`w-1 h-1 rounded-full ${activityStyle.color.replace('text', 'bg')}`} />;
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Produtividade:</span>
            <div className="flex gap-2 items-center">
              <div className="w-3 h-3 rounded-md bg-red-500/10 border border-red-500/40"></div>
              <div className="w-3 h-3 rounded-md bg-orange-500/10 border border-orange-500/40"></div>
              <div className="w-3 h-3 rounded-md bg-yellow-500/10 border border-yellow-500/40"></div>
              <div className="w-3 h-3 rounded-md bg-emerald-500/10 border border-emerald-500/40"></div>
              <div className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.3)]"></div>
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Atividade</span>
          </div>
        </div>

        <div className="w-full lg:w-[420px] bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col shadow-2xl">
          <h3 className="text-white text-xl font-black mb-1">Resumo Diário</h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
            {(Object.entries(activityLabels) as [ActivityType, any][]).map(([type, info]) => {
              const val = activitiesByDate[formatDateKey(selectedDate)]?.[type] || 0;
              const target = goals.targets[type] as ActivityGoal | undefined;
              
              const dateKey = selectedDate.toISOString().split('T')[0];
              const override = goals.overrides?.find(o => o.type === type && o.date === dateKey);
              const dailyGoal = override ? override.value : Number(target?.daily || 0);
              
              const isEnabled = target?.enabled;
              const isCompleted = isEnabled && val >= dailyGoal && dailyGoal > 0;
              const dailyProgress = isEnabled && dailyGoal > 0 ? Math.min(100, (val / dailyGoal) * 100) : 0;
              
              return (
                <button 
                  key={type} 
                  onClick={() => openRegister(type)} 
                  className={`w-full bg-[#0f172a]/40 border ${isCompleted ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : isEnabled ? 'border-slate-800/50' : 'border-slate-800/20'} p-4 rounded-3xl flex items-center justify-between hover:bg-slate-800/40 transition-all relative overflow-hidden group`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-2.5 rounded-xl bg-slate-900/50 ${isEnabled ? info.color : 'text-slate-700'}`}><info.icon size={18} /></div>
                    <div className="text-left">
                      <p className={`text-[11px] font-black uppercase tracking-tight ${isEnabled ? 'text-slate-200' : 'text-slate-500'}`}>{info.label}</p>
                      {isEnabled && dailyGoal > 0 && (
                        <p className="text-[9px] text-slate-500 font-bold">
                          META: {dailyGoal} {override && <span className="text-orange-400 ml-1">(Ajustada)</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end relative z-10">
                    <span className={`text-base font-black ${isCompleted ? 'text-emerald-400' : isEnabled ? 'text-white' : 'text-slate-600'}`}>{val}</span>
                    {isCompleted && <Sparkles size={12} className="text-emerald-400 animate-pulse mt-0.5" />}
                  </div>

                  {isEnabled && dailyGoal > 0 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-slate-800/30 w-full">
                      <div 
                        className={`h-full transition-all duration-1000 ${info.color.replace('text', 'bg')} ${isCompleted ? 'opacity-90' : 'opacity-40'}`} 
                        style={{ width: `${dailyProgress}%` }} 
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => openRegister()} className="mt-8 w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-[#020617] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all transform active:scale-95">
            <Plus size={20} strokeWidth={3} /> Nova Atividade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 flex flex-col shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20"><TrendingUp size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-white">Performance MoM</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Comparativo de Crescimento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl space-y-3 relative group">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acumulado do Mês</span>
                <div className="flex items-center justify-between">
                   <h4 className="text-3xl font-black text-white">{analyticsData.curMonthTotal}</h4>
                   <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black ${analyticsData.curMonthTotal >= analyticsData.prevMonthTotal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {analyticsData.curMonthTotal >= analyticsData.prevMonthTotal ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {analyticsData.prevMonthTotal > 0 ? `${((analyticsData.curMonthTotal - analyticsData.prevMonthTotal) / analyticsData.prevMonthTotal * 100).toFixed(1)}%` : '0%'}
                   </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">vs. {analyticsData.prevMonthTotal} no mês anterior</p>
             </div>

             <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl space-y-3 relative group">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visão do Dia</span>
                <div className="flex items-center justify-between">
                   <h4 className="text-3xl font-black text-white">{analyticsData.selectedDayTotal}</h4>
                   <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black ${analyticsData.selectedDayTotal >= analyticsData.prevSelectedDayTotal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {analyticsData.selectedDayTotal >= analyticsData.prevSelectedDayTotal ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {analyticsData.prevSelectedDayTotal > 0 ? `${((analyticsData.selectedDayTotal - analyticsData.prevSelectedDayTotal) / analyticsData.prevSelectedDayTotal * 100).toFixed(1)}%` : '0%'}
                   </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">vs. dia anterior ({analyticsData.prevSelectedDayTotal})</p>
             </div>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col shadow-2xl xl:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-all" style={{ color: currentChartColor }}>
            <BarChart3 size={120} />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 relative z-10 gap-6">
            <div>
              <h3 className="text-xl font-black text-white">Evolução Semestral</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Tendência Histórica</p>
            </div>
            
            <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto no-scrollbar py-1">
              <button 
                onClick={() => setEvolutionFilter('total')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  evolutionFilter === 'total' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <Layers size={14} /> Tudo
              </button>
              {(Object.entries(activityLabels) as [ActivityType, any][]).map(([type, info]) => (
                <button 
                  key={type}
                  onClick={() => setEvolutionFilter(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    evolutionFilter === type 
                      ? `${info.bgColor} ${info.color.replace('text', 'border')} ${info.color} shadow-lg` 
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                  style={evolutionFilter === type ? { borderColor: info.hex, backgroundColor: `${info.hex}15`, color: info.hex } : {}}
                >
                  <info.icon size={14} /> {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* FIX: Garantindo altura mínima e largura zero para forçar o Recharts a recalcular corretamente */}
          <div className="w-full h-[400px] relative z-10 overflow-hidden" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
              <AreaChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentChartColor} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={currentChartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                  dy={15}
                />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: currentChartColor }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke={currentChartColor} 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorEvolution)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0b1222]/80 border border-slate-800 rounded-[2.5rem] p-8 xl:col-span-3 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-12 group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative shrink-0">
             <div className="w-32 h-32 bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] flex items-center justify-center relative shadow-inner overflow-hidden">
                <BrainCircuit size={48} className="text-cyan-500 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full bg-cyan-500/20 flex items-center justify-center py-1">
                   <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">AI Prediction</span>
                </div>
             </div>
             <div className="absolute -top-2 -right-2 w-10 h-10 bg-cyan-500 text-[#020617] rounded-2xl flex items-center justify-center shadow-xl transform rotate-12"><Zap size={20} fill="currentColor" /></div>
          </div>

          <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
             <div>
                <h3 className="text-2xl font-black text-white">Análise Preditiva de Fechamento</h3>
                <p className="text-slate-400 mt-2 max-w-2xl">Com base na sua velocidade atual ({ (analyticsData.curMonthTotal / analyticsData.dayOfMonth).toFixed(1) }/dia), projetamos seu desempenho até o fim de {monthNames[new Date().getMonth()]}.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Projeção Estimada</span>
                   <h5 className="text-2xl font-black text-white">{Math.round(analyticsData.projectedTotal)} <span className="text-xs text-slate-500">atividades</span></h5>
                </div>
                <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Status da Meta</span>
                   <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${analyticsData.isBatingGoal ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
                      <h5 className={`text-xl font-black ${analyticsData.isBatingGoal ? 'text-emerald-400' : 'text-orange-400'}`}>
                         {analyticsData.isBatingGoal ? 'ACIMA DO RITMO' : 'ABAIXO DO RITMO'}
                      </h5>
                   </div>
                </div>
                <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Eficiência do Período</span>
                   <h5 className="text-2xl font-black text-white">{analyticsData.goalStatus.toFixed(1)}% <span className="text-xs text-slate-500">do objetivo</span></h5>
                </div>
             </div>

             {!analyticsData.isBatingGoal && analyticsData.totalMonthlyGoal > 0 && (
               <div className="flex items-center gap-4 p-5 bg-orange-500/10 border border-orange-500/20 rounded-[2rem]">
                  <AlertCircle className="text-orange-500 shrink-0" size={24} />
                  <p className="text-sm text-orange-200/80 font-medium">
                     <span className="font-black text-orange-400">DICA DE IA:</span> Para atingir sua meta de {analyticsData.totalMonthlyGoal}, você precisa aumentar sua produtividade para <span className="font-black text-orange-400">{ ((analyticsData.totalMonthlyGoal - analyticsData.curMonthTotal) / Math.max(1, (analyticsData.daysInMonth - analyticsData.dayOfMonth))).toFixed(1) }</span> atividades por dia nos dias restantes.
                  </p>
               </div>
             )}

             {analyticsData.isBatingGoal && analyticsData.totalMonthlyGoal > 0 && (
               <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem]">
                  <Sparkles className="text-emerald-500 shrink-0" size={24} />
                  <p className="text-sm text-emerald-200/80 font-medium">
                     <span className="font-black text-emerald-400">METAS BATENDO!</span> Você está projetando um excedente de <span className="font-black text-emerald-400">{ Math.round(analyticsData.projectedTotal - analyticsData.totalMonthlyGoal) }</span> atividades. Mantenha o ritmo para fechar o mês com recorde!
                  </p>
               </div>
             )}
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b1222] border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 pb-6 border-b border-slate-800 flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-[#020617] shadow-lg"><Target size={24} /></div>
                <div><h2 className="text-2xl font-black text-white tracking-tight">{modalStep === 'select' ? 'Nova Atividade' : 'Corrigir Valor'}</h2><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{tempDate}</p></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8">
              {modalStep === 'select' ? (
                <div className="space-y-6">
                  <button onClick={() => { setTempActivity('insta_msg'); setModalStep('input'); }} className="w-full flex items-center justify-between p-6 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/20 rounded-2xl group transition-all">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-[#020617]"><Plus size={20} strokeWidth={3} /></div><div className="text-left"><p className="text-sm font-black text-white">Criar personalizada</p><p className="text-[10px] text-slate-500 font-bold uppercase">Configure do zero</p></div></div>
                    <ChevronRight size={20} className="text-slate-600" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                    {(Object.entries(activityLabels) as [ActivityType, any][]).map(([type, info]) => (
                      <button key={type} onClick={() => openRegister(type)} className="bg-[#0f172a] border border-slate-800 hover:border-slate-600 p-5 rounded-2xl flex flex-col gap-3 text-left transition-all group">
                        <span className="text-3xl">{info.emoji}</span><div><p className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">{info.label}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{info.subtitle}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                tempActivity && <div className="space-y-8 animate-in slide-in-from-right-4">
                  <button onClick={() => setModalStep('select')} className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors uppercase text-[10px] font-black"><ArrowLeft size={16} /> Voltar</button>
                  <div className="flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800 rounded-3xl"><span className="text-4xl">{activityLabels[tempActivity].emoji}</span><div><h4 className="text-lg font-black text-white">{activityLabels[tempActivity].label}</h4><p className="text-xs text-slate-500 font-bold uppercase">Corrija a quantidade final do dia</p></div></div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantidade</label>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setTempCount(Math.max(0, tempCount - 1))} className="w-14 h-14 rounded-2xl bg-slate-800 text-white font-black text-2xl active:scale-90 transition-transform">-</button>
                        <input type="number" value={tempCount} onChange={(e) => setTempCount(parseInt(e.target.value) || 0)} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center text-2xl font-black text-white outline-none focus:border-cyan-500/50" />
                        <button onClick={() => setTempCount(tempCount + 1)} className="w-14 h-14 rounded-2xl bg-cyan-600 text-[#020617] font-black text-2xl active:scale-90 transition-transform">+</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</label>
                      <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white font-bold [color-scheme:dark]" />
                    </div>
                  </div>
                  <button onClick={handleSave} className="w-full py-5 bg-white text-[#020617] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all transform active:scale-95 shadow-xl">Salvar Registro</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

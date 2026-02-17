
import React, { useState } from 'react';
import { Mail, Lock, LogIn, Chrome, Loader2, Sparkles, UserPlus, AlertCircle, Cpu } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado. O pop-up foi fechado.');
      } else {
        setError(err.message || 'Falha ao entrar com Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg.includes('auth/invalid-credential')) msg = 'E-mail ou senha incorretos.';
      else if (msg.includes('auth/email-already-in-use')) msg = 'Este e-mail já está em uso.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[160px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 mb-6 shadow-lg">
              <Cpu size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight text-center uppercase tracking-widest">Axel</h1>
            <p className="text-slate-400 text-[10px] mt-2 text-center uppercase tracking-[0.3em] font-bold">Comando de Alta Performance</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Acesso Neural</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="seu@comando.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Chave de Criptografia</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-xs font-bold px-3 py-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p className="break-words">{error}</p>
              </div>
            )}

            <button 
              disabled={loading} type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (isRegister ? <><UserPlus size={18}/> Iniciar Protocolo</> : <><LogIn size={18}/> Conectar</>)}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase"><span className="bg-[#0b1222] px-4 text-slate-500 tracking-widest">Protocolo Externo</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin} disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-4 border border-slate-700 shadow-md active:scale-95 uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            <Chrome size={18} className="text-cyan-400" /> Google Auth
          </button>

          <p className="text-center mt-8 text-xs font-bold text-slate-500">
            {isRegister ? 'Possui credenciais?' : 'Novo no comando?'} 
            <button onClick={() => setIsRegister(!isRegister)} className="text-cyan-400 ml-2 hover:underline font-black uppercase tracking-widest">
              {isRegister ? 'Login' : 'Registrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

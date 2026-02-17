
import React, { useState, useRef } from 'react';
import { 
  X, Save, Camera, User as UserIcon, Lock, 
  Key, Mail, Loader2, CheckCircle, AlertCircle, Sparkles
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { User } from '../types';

interface ProfileSettingsProps {
  currentUser: User;
  onUpdate: (data: Partial<User>) => void;
  onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdate, onClose }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Otimização básica: converter para base64 pequeno
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Reduzindo um pouco mais a qualidade para segurança
        setPhotoURL(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      // 1. Atualizar Perfil Auth (APENAS displayName)
      // O Firebase Auth tem um limite curto (aprox 2048 chars) para photoURL.
      // Vamos salvar a foto apenas no Firestore para evitar o erro de 'Photo URL too long'.
      await updateProfile(user, { displayName });

      // 2. Atualizar Firestore (Source of Truth para a foto grande em base64)
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        photoURL,
        updatedAt: new Date()
      }, { merge: true });

      // 3. Atualizar Senha se preenchida
      if (newPassword) {
        if (newPassword !== confirmPassword) throw new Error("As senhas não conferem.");
        if (newPassword.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        await updatePassword(user, newPassword);
      }

      onUpdate({ displayName, photoURL });
      setStatus({ type: 'success', msg: "Perfil atualizado com sucesso!" });
      setTimeout(onClose, 1500);
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/requires-recent-login') {
        msg = "Para alterar a senha, você precisa ter feito login recentemente. Saia e entre novamente.";
      }
      setStatus({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0b0f1a] border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20">
              <UserIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Meu Perfil</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Identidade do Vendedor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
               <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-slate-800 shadow-2xl">
                  <img src={photoURL} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
                  >
                    <Camera size={24} />
                    <span className="text-[8px] font-black uppercase mt-1">Alterar</span>
                  </button>
               </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <div className="text-center">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentUser.email}</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Como a Axel deve te chamar?</label>
              <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500" size={16} />
                <input 
                  type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="Seu nome ou apelido"
                />
              </div>
            </div>

            {/* Password Change */}
            <div className="pt-4 border-t border-slate-800/50 space-y-4">
               <div className="flex items-center gap-2 text-slate-400">
                  <Lock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Segurança</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <input 
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50"
                      placeholder="Nova senha"
                    />
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50"
                      placeholder="Confirmar"
                    />
                  </div>
               </div>
               <p className="text-[9px] text-slate-600 italic">Deixe em branco para manter a senha atual.</p>
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <p className="text-xs font-bold">{status.msg}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              type="button" onClick={onClose}
              className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Salvar Perfil</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;

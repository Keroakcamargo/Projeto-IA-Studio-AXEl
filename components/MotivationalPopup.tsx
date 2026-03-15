
import React, { useEffect, useState } from 'react';
import { Shield, X, Zap, Target, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MotivationalPopupProps {
  message: string;
  onClose: () => void;
}

const MotivationalPopup: React.FC<MotivationalPopupProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative max-w-lg w-full bg-[#0b1222] border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden"
          >
            {/* Background Accents */}
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <Shield size={200} className="text-cyan-400" />
            </div>
            <div className="absolute -bottom-10 -left-10 p-12 opacity-5">
              <Target size={150} className="text-red-500" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/20 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <Crosshair size={40} className="text-cyan-400" />
              </div>

              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mb-4">
                Briefing de Operações Axel
              </h2>

              <div className="relative">
                <span className="absolute -top-6 -left-4 text-6xl text-slate-800 font-serif opacity-50">"</span>
                <p className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight italic">
                  {message}
                </p>
                <span className="absolute -bottom-10 -right-4 text-6xl text-slate-800 font-serif opacity-50">"</span>
              </div>

              <div className="mt-12 w-full">
                <button 
                  onClick={onClose}
                  className="w-full group relative flex items-center justify-center gap-3 bg-white text-slate-950 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap size={18} className="group-hover:animate-pulse" />
                  Iniciar Missão
                </button>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-4">
                  A hesitação é o inimigo. O fechamento é o objetivo.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MotivationalPopup;

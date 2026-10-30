import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onLogin: (user: User) => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, defaultRole = 'user' }) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);

  useEffect(() => {
    // If URL hash is #admin, suggest admin role and name
    if (window.location.hash === '#admin') {
      setRole('admin');
      if (!username) setUsername('مدير النظام');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || (role === 'admin' ? 'مدير النظام' : 'مستخدم OMI');
    onLogin({
      username: finalName,
      role,
      points: role === 'admin' ? 99999 : 100,
    });
  };

  const handleQuickLogin = (selectedRole: UserRole, defaultName: string) => {
    onLogin({
      username: defaultName,
      role: selectedRole,
      points: selectedRole === 'admin' ? 99999 : 100,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[2px] shadow-xl shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-2xl tracking-tight text-white">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">OMI</span>
              </div>
            </div>
            <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>

          <h2 className="text-2xl font-black text-white">
            تسجيل الدخول إلى Chat <span className="text-blue-400">OMI</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>المساعد خليل في خدمتك</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              اسم المستخدم أو البريد
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="مثال: أحمد، سارة، خليل..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              نوع الحساب
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
            >
              <option value="user">مستخدم عادي (رصيد 100 نقطة)</option>
              <option value="admin">مدير النظام (Admin - لوحة تحكم كاملة)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/30 active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            <span>دخول / إنشاء حساب</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </form>

        {/* Quick Demo Shortcuts */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-500 text-center mb-2.5 font-medium">
            أو اختر تسجيل الدخول التجريبي بنقرة واحدة:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('user', 'مستخدم OMI')}
              className="bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-300 hover:text-white p-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>مستخدم (100 نقطة)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#admin';
                handleQuickLogin('admin', 'مدير النظام');
              }}
              className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white p-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>مدير (Admin)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

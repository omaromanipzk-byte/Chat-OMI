import React, { useState } from 'react';
import { UserAccount, UserRole, validateUsername } from '../types';
import {
  getAllAccounts,
  loginOrCreateAccount,
  INITIAL_ACCOUNT_POINTS,
} from '../services/accountService';
import {
  ShieldCheck,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
} from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (account: UserAccount) => void;
  onGoToAdmin: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onGoToAdmin,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [errorMessage, setErrorMessage] = useState('');

  const savedAccounts = Object.values(getAllAccounts()).sort(
    (a, b) => (b.lastActive || 0) - (a.lastActive || 0)
  );

  const clean = usernameInput.trim().toLowerCase();
  const letterCount = (clean.match(/[a-z]/g) || []).length;
  const isLengthFive = clean.length === 5;
  const isEnglishOnly = clean.length > 0 && /^[a-z0-9]+$/.test(clean);
  const hasFourLetters = letterCount >= 4;
  const isValidSoFar = isLengthFive && isEnglishOnly && hasFourLetters;

  // Check if account already exists
  const existingAccount = clean && isValidSoFar ? savedAccounts.find(a => a.username === clean) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = loginOrCreateAccount(usernameInput, role);
    if (!res.success || !res.account) {
      setErrorMessage(res.error || 'اسم المستخدم غير متوافق مع الشروط.');
      return;
    }

    onLoginSuccess(res.account);
  };

  const handleSelectExisting = (acc: UserAccount) => {
    const res = loginOrCreateAccount(acc.username, acc.role);
    if (res.success && res.account) {
      onLoginSuccess(res.account);
    }
  };

  const handleQuickPreset = (presetName: string) => {
    setUsernameInput(presetName);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden my-auto chat-container">
        {/* Glow Header */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

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
          <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>المساعد OMI في خدمتك • تطوير عمر الذهلي</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-300 font-semibold">
                اسم المستخدم بالإنجليزية (5 خانات):
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {clean.length} / 5 خانات
              </span>
            </div>

            <input
              type="text"
              autoFocus
              maxLength={5}
              value={usernameInput}
              onChange={e => {
                setUsernameInput(e.target.value.toLowerCase().replace(/\s/g, ''));
                setErrorMessage('');
              }}
              placeholder="مثال: omar1 أو alexa"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-base font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition text-center"
            />

            {/* شروط اسم المستخدم بالإنجليزية */}
            <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className={isLengthFive ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  • يتكون من 5 خانات بالضبط
                </span>
                {isLengthFive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-slate-600">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className={isEnglishOnly ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  • حروف وأرقام إنجليزية فقط (a-z, 0-9)
                </span>
                {isEnglishOnly ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-slate-600">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className={hasFourLetters ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  • يحتوي على 4 أحرف إنجليزية على الأقل ({letterCount}/4)
                </span>
                {hasFourLetters ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-slate-600">○</span>}
              </div>
            </div>
          </div>

          {/* حالة الحساب: هل هو موجود أم جديد */}
          {isValidSoFar && (
            <div className="p-3 rounded-xl border text-xs animate-fadeIn bg-slate-800/80 border-blue-500/30 text-slate-300">
              {existingAccount ? (
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 font-medium flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                    حساب موجود مسبقاً (@{existingAccount.username})
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    🪙 {existingAccount.points} نقطة
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    حساب جديد مستقل خاص بك!
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    🪙 {INITIAL_ACCOUNT_POINTS} نقطة ترحيبية
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValidSoFar}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/30 active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            <span>{existingAccount ? 'دخول إلى حسابي' : 'إنشاء الحساب وبدء المحادثة'}</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </form>

        {/* أسماء مقترحة سريعة صالحة */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-2 font-medium flex items-center justify-between">
            <span>نماذج أسامي إنجليزية متوافقة (5 خانات):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['omar1', 'alexa', 'user8', 'nadia', 'samir', 'cloud'].map(name => (
              <button
                key={name}
                type="button"
                onClick={() => handleQuickPreset(name)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-mono border border-slate-700 transition"
              >
                @{name}
              </button>
            ))}
          </div>
        </div>

        {/* الحسابات المسجلة على هذا الجهاز */}
        {savedAccounts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-2 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>الحسابات السابقة على هذا الجهاز (كل حساب مستقل برصيده):</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto chat-container pr-1">
              {savedAccounts.slice(0, 4).map(acc => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleSelectExisting(acc)}
                  className="w-full bg-slate-800/60 hover:bg-slate-750 border border-slate-700/60 p-2 rounded-xl text-xs flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center font-mono font-bold text-[11px]">
                      {acc.username.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-mono text-white group-hover:text-blue-300">
                      @{acc.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono font-bold">
                      {acc.points} نقطة
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white">
                      دخول ←
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* زر سفلي: بوابة المدير */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-center">
          <button
            type="button"
            onClick={onGoToAdmin}
            className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center justify-center gap-1.5 py-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>بوابة مدير النظام (#admin)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

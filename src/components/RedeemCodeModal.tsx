import React, { useState } from 'react';
import { PromoCode } from '../types';
import { Gift, Sparkles, CheckCircle2, AlertCircle, X, Users, User } from 'lucide-react';

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoCodes: PromoCode[];
  currentUserUsername: string;
  onRedeem: (code: string) => { success: boolean; points?: number; message: string };
}

export const RedeemCodeModal: React.FC<RedeemCodeModalProps> = ({
  isOpen,
  onClose,
  promoCodes,
  currentUserUsername,
  onRedeem,
}) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; points?: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const result = onRedeem(code.trim());
    if (result.success) {
      setStatus({
        type: 'success',
        message: result.message,
        points: result.points,
      });
      setCode('');
    } else {
      setStatus({
        type: 'error',
        message: result.message,
      });
    }
  };

  // Codes available for this specific user
  const availableCodes = promoCodes.filter(c => {
    if (c.type === 'single_use') {
      return !c.isRedeemed && (c.redeemedByUsers?.length || 0) === 0;
    }
    // multi_use
    return !(c.redeemedByUsers || []).includes(currentUserUsername);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
        <button
          onClick={() => {
            setStatus(null);
            onClose();
          }}
          className="absolute left-4 top-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
            <Gift className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">شحن رصيد النقاط</h2>
          <p className="text-xs text-slate-400 mt-1">
            أدخل كود النقاط الترويجي للحصول على رصيد إضافي في حسابك
          </p>
        </div>

        {status && (
          <div
            className={`p-4 rounded-2xl mb-5 border flex items-start gap-3 ${
              status.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/30 border-red-500/40 text-red-300'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-bold">{status.message}</div>
              {status.points && (
                <div className="text-amber-400 font-extrabold text-sm mt-1">
                  +{status.points} نقطة أُضيفت إلى رصيدك! 🪙
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              رمز الكود الترويجي
            </label>
            <input
              type="text"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                if (status) setStatus(null);
              }}
              placeholder="مثال: OMI-ABC123-50"
              required
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 uppercase tracking-wider text-center"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold py-3 rounded-xl transition shadow-lg shadow-amber-500/20 active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>شحن الرصيد الآن ⚡</span>
          </button>
        </form>

        {/* عرض الأكواد النشطة المتاحة لهذا المستخدم */}
        {availableCodes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs">
            <div className="text-slate-400 mb-2 font-medium flex items-center justify-between">
              <span>أكواد تجريبية متاحة لك:</span>
              <span className="text-[10px] text-amber-400">انقر لتعبئة الكود</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {availableCodes.slice(0, 4).map(ac => (
                <button
                  key={ac.id}
                  onClick={() => {
                    setCode(ac.code);
                    if (status) setStatus(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 font-mono text-[11px] flex items-center gap-1.5 transition"
                >
                  {ac.type === 'multi_use' ? (
                    <Users className="w-3 h-3 text-blue-400" />
                  ) : (
                    <User className="w-3 h-3 text-purple-400" />
                  )}
                  <span>{ac.code}</span>
                  <span className="text-amber-400 font-bold">+{ac.points}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

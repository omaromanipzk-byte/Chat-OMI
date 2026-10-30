import React, { useState } from 'react';
import { PromoCode, PromoCodeType, User } from '../types';
import {
  ShieldAlert,
  Sparkles,
  Ticket,
  Copy,
  Check,
  Trash2,
  Users,
  User as UserIcon,
  Coins,
  Search,
  Award,
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  promoCodes: PromoCode[];
  setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
  onClose: () => void;
  onGrantPoints: (amount: number, reason: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  promoCodes,
  setPromoCodes,
  onClose,
  onGrantPoints,
}) => {
  const [codePoints, setCodePoints] = useState<number>(50);
  const [codeType, setCodeType] = useState<PromoCodeType>('multi_use');
  const [customPrefix, setCustomPrefix] = useState<string>('OMI');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'redeemed'>('all');

  const generateCode = (ptsOverride?: number) => {
    const pts = ptsOverride || Number(codePoints) || 50;
    const prefix = (customPrefix.trim().toUpperCase() || 'OMI').replace(/[^A-Z0-9]/g, '');
    const typeTag = codeType === 'multi_use' ? 'ALL' : 'FIRST';
    const randomSegment = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCodeStr = `${prefix}-${typeTag}-${randomSegment}-${pts}`;

    const newCodeObj: PromoCode = {
      id: `code-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      code: newCodeStr,
      points: pts,
      type: codeType,
      createdAt: Date.now(),
      isRedeemed: false,
      redeemedByUsers: [],
      createdBy: currentUser.username || 'عمر الذهلي',
    };

    setPromoCodes(prev => [newCodeObj, ...prev]);
    setLastGenerated(newCodeStr);
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const deleteCode = (id: string) => {
    setPromoCodes(prev => prev.filter(c => c.id !== id));
  };

  const filteredCodes = promoCodes.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchFilter.toLowerCase());
    const isConsumed = c.type === 'single_use' ? (c.isRedeemed || c.redeemedByUsers.length > 0) : false;
    if (filterTab === 'active') return matchesSearch && !isConsumed;
    if (filterTab === 'redeemed') return matchesSearch && (isConsumed || (c.redeemedByUsers && c.redeemedByUsers.length > 0));
    return matchesSearch;
  });

  const totalPointsCreated = promoCodes.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 backdrop-blur-md">
      {/* Admin Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                لوحة تحكم المدير الأساسية
              </h2>
              <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                Admin Area
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة الأكواد (صالح للجميع / لأول شخص)، رصيد الحسابات، وصلاحيات النظام • تطوير عمر الذهلي
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs transition"
        >
          ✕ إغلاق
        </button>
      </div>

      {/* Core Functions Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Code Generator (5 cols) */}
        <div className="lg:col-span-5 bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-700/60 space-y-4">
          <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-purple-400" />
            <span>🎟️ مولّد أكواد النقاط الترويجية</span>
          </h3>

          <div className="space-y-3">
            {/* نوع الكود */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">نوع صلاحية الكود:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCodeType('multi_use')}
                  className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    codeType === 'multi_use'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>صالح للجميع 👥</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeType('single_use')}
                  className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    codeType === 'single_use'
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>لأول شخص فقط 👤</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">قيمة الكود (عدد النقاط)</label>
              <input
                type="number"
                value={codePoints}
                onChange={e => setCodePoints(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={() => generateCode()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>إنشاء كود جديد ⚡</span>
            </button>

            {lastGenerated && (
              <div className="p-3 bg-slate-900 border border-purple-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="font-mono text-sm text-emerald-400 font-bold select-all">
                    {lastGenerated}
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastGenerated)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    {copiedCode === lastGenerated ? '✓' : 'نسخ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Codes List (7 cols) */}
        <div className="lg:col-span-7 bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-700/60 flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">📋 سجل الأكواد المسجلة</h3>
            <span className="text-xs text-purple-400 font-mono">{promoCodes.length} كود</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
            {filteredCodes.map(c => {
              const isMulti = c.type === 'multi_use';
              const usedCount = c.redeemedByUsers?.length || 0;
              const isConsumed = !isMulti && (c.isRedeemed || usedCount > 0);

              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border flex justify-between items-center text-xs font-mono ${
                    isConsumed
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{isConsumed ? '🔒' : '🔑'}</span>
                      <span className="font-bold text-slate-200">{c.code}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          isMulti
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        }`}
                      >
                        {isMulti ? 'صالح للجميع 👥' : 'لأول شخص 👤'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {isMulti
                        ? `تم الاستخدام من قبل ${usedCount} مستخدمين`
                        : isConsumed
                        ? `مستخدم بواسطة: ${c.redeemedByUsers?.[0] || 'شخص'}`
                        : 'جاهز ونشط'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">+{c.points} نقطة</span>
                    {!isConsumed && (
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        {copiedCode === c.code ? '✓' : 'نسخ'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteCode(c.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

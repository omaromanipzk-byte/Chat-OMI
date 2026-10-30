/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, PromoCode, PromoCodeType } from './types';
import { RedeemCodeModal } from './components/RedeemCodeModal';
import { InstallModal } from './components/InstallModal';
import { ImageModal } from './components/ImageModal';
import { VideoModal } from './components/VideoModal';
import { BrowserModal } from './components/BrowserModal';
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ExternalLink,
  Users,
  User as UserIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Globe,
  Ticket,
  Download,
  Clock,
  Send,
  Zap,
} from 'lucide-react';

const ADMIN_PASSWORD_CORRECT = 'Om90X.op';
const APP_LOGO = '/assets/aistudio/image_4dfbd469.jpg';

const INITIAL_CODES: PromoCode[] = [
  {
    id: 'code-1',
    code: 'OMI-ALL-100',
    points: 100,
    createdAt: Date.now() - 3600000,
    type: 'multi_use',
    isRedeemed: false,
    redeemedByUsers: [],
    createdBy: 'عمر الذهلي',
  },
  {
    id: 'code-2',
    code: 'OMI-FIRST-50',
    points: 50,
    createdAt: Date.now() - 1800000,
    type: 'single_use',
    isRedeemed: false,
    redeemedByUsers: [],
    createdBy: 'عمر الذهلي',
  },
];

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'user' | 'admin'>(() => {
    const isHashAdmin = window.location.hash.toLowerCase() === '#admin';
    const isPathAdmin = window.location.pathname.toLowerCase().includes('admin');
    return isHashAdmin || isPathAdmin ? 'admin' : 'user';
  });

  useEffect(() => {
    const onRouteCheck = () => {
      const isHashAdmin = window.location.hash.toLowerCase() === '#admin';
      const isPathAdmin = window.location.pathname.toLowerCase().includes('admin');
      setCurrentRoute(isHashAdmin || isPathAdmin ? 'admin' : 'user');
    };

    window.addEventListener('hashchange', onRouteCheck);
    window.addEventListener('popstate', onRouteCheck);
    return () => {
      window.removeEventListener('hashchange', onRouteCheck);
      window.removeEventListener('popstate', onRouteCheck);
    };
  }, []);

  // ==========================================
  // 1. STATE FOR USER PORTAL (حساب المستخدم)
  // ==========================================
  const [userAccount, setUserAccount] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('chat_omi_user_portal');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [userLoginName, setUserLoginName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chat_omi_user_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg_welcome',
        role: 'assistant',
        text: 'أهلاً بك! أنا **المساعد خليل** من **Chat OMI**، من تطوير **عمر الذهلي**.\n\nالمحادثات معي فائقة السرعة (< 3 ثوانٍ) ومجانية تماماً! يمكنك أيضاً:\n• 🎨 **إنشاء صورة** بنانو بنانو\n• 🎬 **إنشاء فيديو** بالذكاء الاصطناعي\n• 🌐 **تصفح الويب** بالمتصفح الذكي\n• 🎟️ **أدخل كود** لشحن رصيد نقاطك',
        timestamp: Date.now(),
      },
    ];
  });
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Modals for the user's requested features
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================
  // 2. STATE FOR ADMIN PORTAL (حساب المدير #admin)
  // ==========================================
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chat_omi_admin_logged') === 'true';
    } catch {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminPointsVal, setAdminPointsVal] = useState<number>(50);
  const [adminCodeType, setAdminCodeType] = useState<PromoCodeType>('multi_use');
  const [generatedCodeResult, setGeneratedCodeResult] = useState('');
  const [copiedCodeStr, setCopiedCodeStr] = useState<string | null>(null);

  // Shared Promo Codes in LocalStorage
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
    try {
      const saved = localStorage.getItem('chat_omi_codes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_CODES;
    } catch {
      return INITIAL_CODES;
    }
  });

  // Sync state to localStorage
  useEffect(() => {
    if (userAccount) {
      localStorage.setItem('chat_omi_user_portal', JSON.stringify(userAccount));
    } else {
      localStorage.removeItem('chat_omi_user_portal');
    }
  }, [userAccount]);

  useEffect(() => {
    localStorage.setItem('chat_omi_user_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chat_omi_codes', JSON.stringify(promoCodes));
  }, [promoCodes]);

  useEffect(() => {
    localStorage.setItem('chat_omi_admin_logged', adminAuthenticated ? 'true' : 'false');
  }, [adminAuthenticated]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // ==========================================
  // USER HANDLERS
  // ==========================================
  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = userLoginName.trim();
    if (!name) return;
    setUserAccount({
      username: name,
      role: 'user',
      points: 100,
    });
  };

  const handleUserLogout = () => {
    setUserAccount(null);
  };

  // Ultra-fast streaming message to Gemini (Under 3 seconds latency)
  const sendUserMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const text = (directText || userInput).trim();
    if (!text || isStreaming) return;

    // Detect if user typed a command for video, image or browser
    if (text.startsWith('فيديو') || text.startsWith('إنشاء فيديو')) {
      setIsVideoModalOpen(true);
      return;
    }
    if (text.startsWith('صورة') || text.startsWith('ارسم') || text.startsWith('إنشاء صورة')) {
      setIsImageModalOpen(true);
      return;
    }
    if (text.startsWith('بحث') || text.startsWith('متصفح') || text.startsWith('تصفح')) {
      setIsBrowserModalOpen(true);
      return;
    }
    if (text.startsWith('كود') || text.startsWith('أدخل كود') || text.startsWith('شحن')) {
      setIsRedeemModalOpen(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const botMsgId = `bot_${Date.now()}`;
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, initialBotMsg]);
    setUserInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4).map(m => ({ role: m.role, text: m.text })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';
      let responseLatency: number | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.latency) {
              responseLatency = parseFloat(parsed.latency);
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev =>
                prev.map(m =>
                  m.id === botMsgId
                    ? { ...m, text: accumulated, responseTime: responseLatency }
                    : m
                )
              );
            }
          } catch {}
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId
            ? {
                ...m,
                isStreaming: false,
                text: accumulated || 'تم الرد بنجاح.',
                responseTime: responseLatency,
              }
            : m
        )
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  error: true,
                  text: 'حدث خطأ في الاتصال بالذكاء الاصطناعي، يرجى إعادة المحاولة.',
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Promo Code Redemption Handler supporting:
  // 1. كود صالح للجميع (multi_use): لكل مستخدم مرة واحدة
  // 2. كود لأول شخص (single_use): لمرة واحدة فقط لأول شخص يسبق
  const handleRedeemCode = (inputCode: string) => {
    const formatted = inputCode.trim().toUpperCase();
    const index = promoCodes.findIndex(c => c.code.toUpperCase() === formatted);

    if (index === -1) {
      return { success: false, message: 'الكود غير موجود أو غير صالح.' };
    }

    const codeObj = promoCodes[index];
    const username = userAccount?.username || 'مستخدم';
    const redeemedList = codeObj.redeemedByUsers || [];

    if (codeObj.type === 'single_use') {
      if (codeObj.isRedeemed || redeemedList.length > 0) {
        return {
          success: false,
          message: 'عذراً، هذا الكود مخصص لأول شخص فقط وقد تم استخدامه مسبقاً!',
        };
      }

      const updated = [...promoCodes];
      updated[index] = {
        ...codeObj,
        isRedeemed: true,
        redeemedByUsers: [username],
      };
      setPromoCodes(updated);

      if (userAccount) {
        setUserAccount(prev => (prev ? { ...prev, points: prev.points + codeObj.points } : null));
      }

      return {
        success: true,
        points: codeObj.points,
        message: `تهانينا! لقد حصلت على الكود الحصري كأول شخص (+${codeObj.points} نقطة)!`,
      };
    }

    // multi_use
    if (redeemedList.includes(username)) {
      return {
        success: false,
        message: 'لقد قمت بشحن هذا الكود الترويجي مسبقاً في حسابك (مسموح مرة واحدة لكل مستخدم).',
      };
    }

    const updated = [...promoCodes];
    updated[index] = {
      ...codeObj,
      isRedeemed: false,
      redeemedByUsers: [...redeemedList, username],
    };
    setPromoCodes(updated);

    if (userAccount) {
      setUserAccount(prev => (prev ? { ...prev, points: prev.points + codeObj.points } : null));
    }

    return {
      success: true,
      points: codeObj.points,
      message: `تم شحن الكود بنجاح (+${codeObj.points} نقطة)! الكود متاح لباقي المستخدمين أيضاً.`,
    };
  };

  // ==========================================
  // ADMIN HANDLERS
  // ==========================================
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD_CORRECT) {
      setAdminAuthenticated(true);
      setAdminAuthError('');
      setAdminPasswordInput('');
    } else {
      setAdminAuthError('كلمة مرور المدير غير صحيحة! يرجى إدخال كلمة المرور الصحيحة.');
    }
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
  };

  const handleGenerateCode = () => {
    const pts = Number(adminPointsVal) || 50;
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const typePrefix = adminCodeType === 'multi_use' ? 'ALL' : 'FIRST';
    const code = `OMI-${typePrefix}-${randomSuffix}-${pts}`;

    const newCodeObj: PromoCode = {
      id: `code_${Date.now()}`,
      code,
      points: pts,
      createdAt: Date.now(),
      type: adminCodeType,
      isRedeemed: false,
      redeemedByUsers: [],
      createdBy: 'مدير النظام (عمر الذهلي)',
    };

    setPromoCodes(prev => [newCodeObj, ...prev]);
    const typeLabel = adminCodeType === 'multi_use' ? 'صالح للجميع 👥' : 'لأول شخص فقط 👤';
    setGeneratedCodeResult(`تم الإنشاء بنجاح [${typeLabel}]: ${code}`);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeStr(code);
      setTimeout(() => setCopiedCodeStr(null), 2000);
    } catch {}
  };

  const deleteCode = (id: string) => {
    setPromoCodes(prev => prev.filter(c => c.id !== id));
  };

  const goToAdminPortal = () => {
    window.location.hash = '#admin';
  };

  const goToUserPortal = () => {
    window.location.hash = '';
  };

  // ==========================================
  // RENDER 1: ADMIN PORTAL (حساب المدير #admin)
  // ==========================================
  if (currentRoute === 'admin') {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100" dir="rtl">
        <header className="bg-slate-900 border-b border-purple-500/30 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg border border-purple-500/50 flex items-center justify-center bg-black">
              <img
                src={APP_LOGO}
                alt="Chat OMI"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-lg">بوابة مدير النظام (Admin Portal)</h1>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  #admin
                </span>
              </div>
              <p className="text-xs text-slate-400">إدارة الأكواد والرصيد والصلاحيات • Chat OMI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToUserPortal}
              className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg border border-slate-700 transition text-slate-300 flex items-center gap-1.5"
            >
              <span>الانتقال لحساب المستخدم</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {adminAuthenticated && (
              <button
                onClick={handleAdminLogout}
                className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg text-xs transition"
              >
                قفل / خروج
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col justify-center">
          {!adminAuthenticated ? (
            /* شاشة الدخول المخصصة للمدير مع كلمة المرور السرية بدون كتابتها */
            <div className="max-w-md w-full mx-auto bg-slate-900 border border-purple-500/30 p-8 rounded-2xl shadow-2xl space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-black border border-purple-500/40 flex items-center justify-center mx-auto shadow-lg overflow-hidden p-1">
                  <img src={APP_LOGO} alt="Chat OMI" className="w-full h-full object-cover rounded-xl" />
                </div>
                <h2 className="text-2xl font-bold text-white">تسجيل دخول المدير</h2>
                <p className="text-xs text-slate-400">
                  لوحة التحكم الإدارية مؤمنة. يرجى إدخال كلمة المرور المعتمدة.
                </p>
              </div>

              {adminAuthError && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs">
                  ⚠️ {adminAuthError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-purple-300 mb-1 font-semibold">
                    كلمة مرور المدير:
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={adminPasswordInput}
                    onChange={e => {
                      setAdminPasswordInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder="أدخل كلمة مرور المدير..."
                    className="w-full bg-slate-800 border border-purple-500/40 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-600/30 text-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>تأكيد ودخول لوحة التحكم</span>
                </button>
              </form>

              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  onClick={goToUserPortal}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  ← العودة إلى واجهة المستخدم العادية
                </button>
              </div>
            </div>
          ) : (
            /* لوحة تحكم المدير الأصلية الكاملة */
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-6 my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                    <span>لوحة تحكم المدير الأساسية</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    إدارة الأكواد (صالح للجميع / لأول شخص)، رصيد النقاط، والصلاحيات
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    مفعل (Admin Mode)
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* مولّد أكواد النقاط */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 space-y-4">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>🎟️ مولّد أكواد النقاط الترويجية</span>
                  </h3>

                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                      نوع صلاحية الكود:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminCodeType('multi_use')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          adminCodeType === 'multi_use'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>صالح للجميع 👥</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminCodeType('single_use')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          adminCodeType === 'single_use'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>لأول شخص فقط 👤</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">قيمة الكود (عدد النقاط):</label>
                    <input
                      type="number"
                      value={adminPointsVal}
                      onChange={e => setAdminPointsVal(Number(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mt-1 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex gap-2 mt-2">
                      {[25, 50, 100, 250, 500].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAdminPointsVal(val)}
                          className={`text-xs px-2 py-1 rounded border transition ${adminPointsVal === val ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateCode}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg text-sm transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>إنشاء كود جديد ⚡</span>
                  </button>

                  {generatedCodeResult && (
                    <div className="text-xs text-emerald-400 mt-2 font-mono flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                      <span>{generatedCodeResult}</span>
                      <button
                        onClick={() => copyCode(generatedCodeResult.split(': ').pop() || '')}
                        className="text-[11px] bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-700"
                      >
                        {copiedCodeStr ? 'تم النسخ ✓' : 'نسخ'}
                      </button>
                    </div>
                  )}
                </div>

                {/* الأكواد المسجلة */}
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 space-y-4 flex flex-col">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white">📋 الأكواد المسجلة في النظام</h3>
                    <span className="text-xs text-purple-400 font-mono">
                      {promoCodes.length} كود
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs font-mono chat-container flex-1 pr-1">
                    {promoCodes.map(c => {
                      const isMulti = c.type === 'multi_use';
                      const usedCount = c.redeemedByUsers?.length || 0;
                      const isConsumed = !isMulti && (c.isRedeemed || usedCount > 0);

                      return (
                        <div
                          key={c.id}
                          className={`p-2.5 rounded-lg flex justify-between items-center border ${
                            isConsumed
                              ? 'bg-slate-900/40 border-slate-800 opacity-60'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
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
                                ? `تم الشحن من ${usedCount} مستخدمين`
                                : isConsumed
                                ? `مستخدم بواسطة: ${c.redeemedByUsers[0] || 'شخص'}`
                                : 'نشط وجاهز لأول شخص'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">+{c.points} نقطة</span>
                            {!isConsumed && (
                              <button
                                onClick={() => copyCode(c.code)}
                                className="text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                              >
                                {copiedCodeStr === c.code ? '✓' : 'نسخ'}
                              </button>
                            )}
                            <button
                              onClick={() => deleteCode(c.id)}
                              className="text-slate-500 hover:text-red-400 px-1"
                              title="حذف"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-purple-500/20 bg-slate-900/40 p-3 text-center text-xs text-slate-500">
          Chat OMI Admin Portal • تطوير عمر الذهلي
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: USER PORTAL (حساب المستخدم /)
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100" dir="rtl">
      {/* شاشة تسجيل الدخول */}
      {!userAccount && (
        <div id="authScreen" className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-3 border border-blue-500/40 overflow-hidden shadow-2xl bg-black">
                <img
                  src={APP_LOGO}
                  alt="Chat OMI"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-white">تسجيل الدخول إلى Chat OMI</h2>
              <p className="text-slate-400 text-sm mt-1">المساعد خليل في خدمتك • تطوير عمر الذهلي</p>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم المستخدم أو البريد</label>
                <input
                  type="text"
                  required
                  value={userLoginName}
                  onChange={e => setUserLoginName(e.target.value)}
                  placeholder="أدخل اسمك..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">نوع الحساب</label>
                <input
                  type="text"
                  readOnly
                  value="مستخدم عادي (رصيد 100 نقطة مجانية)"
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-300 text-sm cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/30"
              >
                دخول / بدء المحادثة
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <button
                onClick={goToAdminPortal}
                className="text-xs text-purple-400 hover:text-purple-300 transition"
              >
                هل أنت مدير النظام؟ اضغط هنا للدخول إلى بوابة المدير (#admin) 🔐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* التطبيق الرئيسي مع جميع الخواص المطلوبة */}
      {userAccount && (
        <div id="appScreen" className="flex flex-col min-h-screen">
          {/* شريط العنوان */}
          <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-blue-500/40 flex items-center justify-center bg-black">
                <img
                  src={APP_LOGO}
                  alt="Chat OMI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-white text-base sm:text-lg">Chat OMI</h1>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    تطوير عمر الذهلي
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  المساعد خليل • <span id="userRoleBadge" className="text-blue-400">مستخدم عادي ({userAccount.username})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* رصيد النقاط */}
              <button
                onClick={() => setIsRedeemModalOpen(true)}
                title="اضغط لشحن كود نقاط"
                id="pointsDisplay"
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
              >
                <span>🪙 النقاط:</span>{' '}
                <span id="pointsVal" className="text-amber-400 font-bold">
                  {userAccount.points}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  + شحن
                </span>
              </button>

              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              >
                تثبيت 📲
              </button>

              <button
                onClick={handleUserLogout}
                className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg text-xs transition"
              >
                خروج
              </button>
            </div>
          </header>

          {/* شريط الأدوات والخواص الأساسية السريع (إنشاء فيديو، إنشاء صورة، متصفح، أدخل كود) */}
          <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">الخدمات السريعة:</span>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial overflow-x-auto no-scrollbar">
                {/* 1. إنشاء صورة بنانو بنانو */}
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 font-medium"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>🎨 إنشاء صورة (نانو بنانو)</span>
                </button>

                {/* 2. إنشاء فيديو */}
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 font-medium"
                >
                  <VideoIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>🎬 إنشاء فيديو</span>
                </button>

                {/* 3. المتصفح الذكي */}
                <button
                  onClick={() => setIsBrowserModalOpen(true)}
                  className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 font-medium"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>🌐 متصفح ويب</span>
                </button>

                {/* 4. أدخل كود */}
                <button
                  onClick={() => setIsRedeemModalOpen(true)}
                  className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 font-medium"
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎟️ أدخل كود</span>
                </button>
              </div>
            </div>
          </div>

          {/* محتوى المحادثة الأصلي للمستخدم */}
          <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-4">
            <div
              id="chatSection"
              className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[70vh] shadow-xl overflow-hidden"
            >
              {/* شريط رأس المحادثة */}
              <div className="bg-slate-800/50 p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200">
                    💬 محادثة فورية مع المساعد خليل (مجانية بالكامل)
                  </span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    سرعة فائقة (&lt; 3 ثوانٍ)
                  </span>
                </div>
              </div>

              {/* الرسائل */}
              <div
                id="chatMessages"
                ref={chatMessagesRef}
                className="flex-1 p-4 overflow-y-auto chat-container space-y-4"
              >
                {messages.map(msg => {
                  const isUser = msg.role === 'user';
                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex gap-3 justify-end">
                        <div className="bg-blue-600 p-3.5 rounded-2xl max-w-[80%] text-sm text-white shadow whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                          أنت
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-blue-500/40 flex items-center justify-center shrink-0 select-none">
                        <img src={APP_LOGO} alt="خليل" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-slate-800 p-3.5 rounded-2xl max-w-[85%] text-sm text-slate-200 border border-slate-700/50 leading-relaxed space-y-2">
                        <div className="whitespace-pre-wrap">
                          {msg.text || (
                            <span className="text-slate-400 animate-pulse">...</span>
                          )}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-blue-400 mr-1 animate-cursor align-middle" />
                          )}
                        </div>

                        {msg.responseTime && (
                          <div className="text-[10px] text-emerald-400/80 flex items-center gap-1 pt-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>استجابة فورية خلال {msg.responseTime} ثانية</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* اقتراحات سريعة */}
              <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <span className="text-slate-400 whitespace-nowrap text-[11px]">اقتراحات:</span>
                <button
                  onClick={() => sendUserMessage(undefined, 'من الذي أنشأك؟')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition whitespace-nowrap"
                >
                  👤 من الذي أنشأك؟
                </button>
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 px-2.5 py-1 rounded-lg border border-blue-500/30 transition whitespace-nowrap"
                >
                  🎨 إنشاء صورة نانو بنانو
                </button>
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 px-2.5 py-1 rounded-lg border border-purple-500/30 transition whitespace-nowrap"
                >
                  🎬 إنشاء فيديو
                </button>
                <button
                  onClick={() => setIsBrowserModalOpen(true)}
                  className="bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition whitespace-nowrap"
                >
                  🌐 تصفح الإنترنت
                </button>
              </div>

              {/* نموذج إرسال الرسالة */}
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                <form onSubmit={e => sendUserMessage(e)} className="flex gap-2">
                  <input
                    type="text"
                    id="userInput"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="اكتب رسالتك إلى المساعد خليل..."
                    disabled={isStreaming}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !userInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-blue-600/20 text-white shrink-0 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4 rotate-180" />
                    <span>{isStreaming ? 'جاري الرد...' : 'إرسال'}</span>
                  </button>
                </form>
              </div>
            </div>
          </main>

          {/* تذييل الصفحة */}
          <footer className="border-t border-slate-800/80 bg-slate-950/60 p-3 text-center text-xs text-slate-500 flex justify-between items-center max-w-5xl mx-auto w-full">
            <span>Chat OMI • المساعد خليل | تطوير عمر الذهلي</span>
            <button
              onClick={goToAdminPortal}
              className="text-purple-400 hover:text-purple-300 transition text-[11px] flex items-center gap-1"
            >
              <span>بوابة المدير (#admin)</span>
              <Lock className="w-3 h-3" />
            </button>
          </footer>
        </div>
      )}

      {/* نوافذ الخواص التفاعلية المطلوبة */}
      <RedeemCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        promoCodes={promoCodes}
        currentUserUsername={userAccount?.username || ''}
        onRedeem={handleRedeemCode}
      />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      <BrowserModal
        isOpen={isBrowserModalOpen}
        onClose={() => setIsBrowserModalOpen(false)}
      />

      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}

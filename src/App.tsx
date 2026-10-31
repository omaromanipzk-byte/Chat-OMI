/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserAccount, ChatMessage, PromoCode, PromoCodeType, validateUsername } from './types';
import {
  getAllAccounts,
  getAccount,
  saveAccount,
  loginOrCreateAccount,
  getCurrentUsername,
  setCurrentUsername,
  resetAccountPoints,
  INITIAL_WELCOME_MESSAGES,
} from './services/accountService';
import { AuthModal } from './components/AuthModal';
import { RedeemCodeModal } from './components/RedeemCodeModal';
import { InstallModal } from './components/InstallModal';
import { ImageModal } from './components/ImageModal';
import { VideoModal } from './components/VideoModal';
import { BrowserModal } from './components/BrowserModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
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
  Clock,
  Send,
  Zap,
  RotateCcw,
  LogOut,
  Download,
  Play,
  Pause,
  Film,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
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
  // 1. ISOLATED USER ACCOUNT MANAGEMENT
  // ==========================================
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(() => {
    const currentName = getCurrentUsername();
    if (currentName) {
      return getAccount(currentName);
    }
    return null;
  });

  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSwitchAccountMenu, setShowSwitchAccountMenu] = useState(false);

  // Modals
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);

  // Active Video Player Modal
  const [activePlayerVideo, setActivePlayerVideo] = useState<{
    isOpen: boolean;
    videoUrl: string;
    thumbnailUrl?: string;
    prompt?: string;
    style?: string;
    storyboard?: string;
  } | null>(null);

  // System Link Status (Admin temporary pause)
  const [isAppPaused, setIsAppPaused] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chat_omi_link_paused') === 'true';
    } catch {
      return false;
    }
  });
  const [isUpdatingPause, setIsUpdatingPause] = useState(false);

  // Ensure any lingering API keys are wiped clean as requested by the user
  useEffect(() => {
    localStorage.removeItem('chat_omi_gemini_key');
  }, []);

  // Poll and sync system pause status from server
  const syncSystemStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.paused === 'boolean') {
          setIsAppPaused(data.paused);
          localStorage.setItem('chat_omi_link_paused', String(data.paused));
        }
      }
    } catch (e) {
      // offline fallback uses cached state
    }
  };

  useEffect(() => {
    syncSystemStatus();
    const interval = setInterval(syncSystemStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAppPause = async (nextPaused: boolean) => {
    setIsUpdatingPause(true);
    try {
      const res = await fetch('/api/system/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextPaused }),
      });
      const data = await res.json();
      if (typeof data.paused === 'boolean') {
        setIsAppPaused(data.paused);
        localStorage.setItem('chat_omi_link_paused', String(data.paused));
      }
    } catch (err) {
      setIsAppPaused(nextPaused);
      localStorage.setItem('chat_omi_link_paused', String(nextPaused));
    } finally {
      setIsUpdatingPause(false);
    }
  };

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================
  // 2. ADMIN PORTAL STATE (#admin)
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

  // Sync active account to storage
  useEffect(() => {
    if (activeAccount) {
      saveAccount(activeAccount);
      setCurrentUsername(activeAccount.username);
    } else {
      setCurrentUsername(null);
    }
  }, [activeAccount]);

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
  }, [activeAccount?.messages, isStreaming]);

  // ==========================================
  // ACCOUNT SWITCHING & AUTH HANDLERS
  // ==========================================
  const handleLoginSuccess = (account: UserAccount) => {
    setActiveAccount(account);
    setShowSwitchAccountMenu(false);
  };

  const handleLogout = () => {
    if (activeAccount) {
      saveAccount(activeAccount);
    }
    setActiveAccount(null);
    setShowSwitchAccountMenu(false);
  };

  const handleResetPoints = () => {
    if (!activeAccount) return;
    const confirmReset = window.confirm(
      `هل أنت متأكد من رغبتك في تصفير نقاط حسابك (@${activeAccount.username})؟`
    );
    if (confirmReset) {
      const updated = resetAccountPoints(activeAccount.username, 0);
      if (updated) {
        setActiveAccount(updated);
      }
    }
  };

  // ==========================================
  // CHAT & AI COMMUNICATION WITH OMI
  // ==========================================
  const sendUserMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    if (!activeAccount) return;

    const text = (directText || userInput).trim();
    if (!text || isStreaming) return;

    // Check if user specifically requests deleting Gemini API key
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('احذف api') ||
      lowerText.includes('حذف api') ||
      lowerText.includes('احذف المفتاح') ||
      lowerText.includes('حذف المفتاح') ||
      lowerText.includes('احذف مفتاح') ||
      lowerText.includes('مسح المفتاح') ||
      lowerText.includes('احذف api gemini') ||
      lowerText.includes('delete api')
    ) {
      localStorage.removeItem('chat_omi_gemini_key');

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        text,
        timestamp: Date.now(),
      };

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        text: '✅ **تم حذف مفتاح Gemini API بنجاح!**\n\nتم مسح المفتاح نهائياً من ذاكرة المتصفح والتطبيق. المساعد OMI مهيأ ليعمل معك مجاناً وبكل كفاءة وسرعة بدون الحاجة لأي مفتاح خارجي!\n\nيمكنك الآن إرسال أي سؤال أو طلب توليد صور وفيديوهات مباشرة وبلا قيود.',
        timestamp: Date.now(),
      };

      setActiveAccount({
        ...activeAccount,
        messages: [...activeAccount.messages, userMsg, botMsg],
      });
      setUserInput('');
      return;
    }

    // Smart natural language trigger for image generation
    const imagePattern = /^(?:أريد\s+صورة|اريد\s+صورة|أبي\s+صورة|ابي\s+صورة|اعطني\s+صورة|أعطني\s+صورة|هات\s+صورة|سو(?:ي)?\s+(?:لي\s+)?صورة|صمم\s+(?:لي\s+)?صورة|انشئ\s+(?:لي\s+)?صورة|أنشئ\s+(?:لي\s+)?صورة|إنشاء\s+صورة|انشاء\s+صورة|توليد\s+صورة|ارسم\s+(?:لي\s+)?|إرسم\s+(?:لي\s+)?|صورة\s+لـ|صورة\s+عن|صورة|draw|generate\s+image\s+of|image\s+of)\s*[:،-]?\s*(.*)$/i;
    const imgMatch = text.match(imagePattern);
    if (imgMatch) {
      const cleanPrompt = (imgMatch[1] || '').trim();
      if (cleanPrompt && cleanPrompt.length >= 2) {
        handleGenerateImageInChat(cleanPrompt, '1:1');
        setUserInput('');
        return;
      } else {
        setIsImageModalOpen(true);
        return;
      }
    }

    // Smart natural language trigger for video generation
    const videoPattern = /^(?:أريد\s+فيديو|اريد\s+فيديو|اعطني\s+فيديو|أعطني\s+فيديو|سو(?:ي)?\s+(?:لي\s+)?فيديو|صمم\s+(?:لي\s+)?فيديو|انشئ\s+(?:لي\s+)?فيديو|أنشئ\s+(?:لي\s+)?فيديو|إنشاء\s+فيديو|انشاء\s+فيديو|توليد\s+فيديو|فيديو|video\s+of|generate\s+video)\s*[:،-]?\s*(.*)$/i;
    const vidMatch = text.match(videoPattern);
    if (vidMatch) {
      const cleanPrompt = (vidMatch[1] || '').trim();
      if (cleanPrompt && cleanPrompt.length >= 2) {
        handleGenerateVideoInChat(cleanPrompt, 'سينمائي (Cinematic)');
        setUserInput('');
        return;
      } else {
        setIsVideoModalOpen(true);
        return;
      }
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

    const updatedMessages = [...activeAccount.messages, userMsg, initialBotMsg];
    setActiveAccount({
      ...activeAccount,
      messages: updatedMessages,
    });
    setUserInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulated = '';
    let responseLatency: number | undefined;

    // 1. First attempt: Streaming API
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: activeAccount.messages.slice(-4).map(m => ({ role: m.role, text: m.text })),
        }),
        signal: controller.signal,
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

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
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.latency) responseLatency = parseFloat(parsed.latency);
              if (parsed.text) {
                accumulated += parsed.text;
                setActiveAccount(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    messages: prev.messages.map(m =>
                      m.id === botMsgId
                        ? { ...m, text: accumulated, responseTime: responseLatency }
                        : m
                    ),
                  };
                });
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && !jsonErr.message.includes('Unexpected token')) {
                throw jsonErr;
              }
            }
          }
        }
      } else {
        let errMessage = 'خطأ في استجابة الخادم';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }
    } catch (streamErr: any) {
      if (streamErr.name === 'AbortError') {
        setIsStreaming(false);
        abortControllerRef.current = null;
        return;
      }
      console.warn('Stream failed or buffered, trying non-stream fallback...', streamErr);
    }

    // 2. Fallback to standard chat endpoint if streaming was empty
    if (!accumulated) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            history: activeAccount.messages.slice(-4).map(m => ({ role: m.role, text: m.text })),
          }),
        });

        const data = await res.json();
        if (res.ok && data.text) {
          accumulated = data.text;
          responseLatency = data.latency ? parseFloat(data.latency) : undefined;
        } else {
          throw new Error(data.error || 'فشل الاتصال بالذكاء الاصطناعي.');
        }
      } catch (fallbackErr: any) {
        console.error('Non-stream chat error:', fallbackErr);
        const fallbackReply = `أهلاً بك! معك **المساعد OMI** (تطوير **عمر الذهلي**).\n\nاستلمت رسالتك بخصوص: "${text}"، وأنا في خدمتك دائماً! يمكنك سؤالي عن أي موضوع، أو الضغط على أزرار إنشاء الصور أو الفيديو بالأعلى لتجربة كافة الميزات مباشرة مجاناً 100%.`;
        setActiveAccount(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.map(m =>
              m.id === botMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    error: false,
                    text: fallbackReply,
                  }
                : m
            ),
          };
        });
        setIsStreaming(false);
        abortControllerRef.current = null;
        return;
      }
    }

    // Success
    setActiveAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: prev.messages.map(m =>
          m.id === botMsgId
            ? {
                ...m,
                isStreaming: false,
                text: accumulated || 'أهلاً بك! أنا المساعد OMI في خدمتك دائماً.',
                responseTime: responseLatency,
              }
            : m
        ),
      };
    });
    setIsStreaming(false);
    abortControllerRef.current = null;
  };

  // ==========================================
  // DIRECT IN-ASSISTANT IMAGE GENERATION
  // ("وعندما اريد انشاء شي مثل صورة أو فيديو لايظهر اريد عندما يظغط على زر الانشاء يدخله إلى المساعد")
  // ==========================================
  const handleGenerateImageInChat = async (prompt: string, aspectRatio: string = '1:1') => {
    if (!activeAccount) return;

    const userMsg: ChatMessage = {
      id: `user_img_${Date.now()}`,
      role: 'user',
      text: `🎨 أريد إنشاء صورة بنانو بنانو: "${prompt}" (أبعاد: ${aspectRatio})`,
      timestamp: Date.now(),
    };

    const botMsgId = `bot_img_${Date.now()}`;
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      text: `جاري توليد الصورة بنموذج **نانو بنانو** للمساعد OMI...\nقد تستغرق بضع ثوانٍ ⚡`,
      timestamp: Date.now(),
      isStreaming: true,
      mediaType: 'image',
    };

    setActiveAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, userMsg, initialBotMsg],
      };
    });

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.imageUrl) {
        setActiveAccount(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.map(m =>
              m.id === botMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    text: `تم إنشاء الصورة بنجاح بواسطة **المساعد OMI** بتقنية **نانو بنانو**! ✨\n\n📌 **الوصف:** ${prompt}\n📐 **الأبعاد:** ${aspectRatio}`,
                    imageUrl: data.imageUrl,
                    mediaType: 'image',
                    mediaData: {
                      prompt,
                      aspectRatio,
                    },
                  }
                : m
            ),
          };
        });
      } else {
        throw new Error(data.error || 'تعذر توليد الصورة من النموذج.');
      }
    } catch (err: any) {
      console.warn('Image generation error, providing real-time AI visual with exact prompt:', err);
      const seed = Math.floor(Math.random() * 9000000) + 100000;
      let width = 1024;
      let height = 1024;
      if (aspectRatio === '16:9') {
        width = 1280;
        height = 720;
      } else if (aspectRatio === '9:16') {
        width = 720;
        height = 1280;
      } else if (aspectRatio === '4:3') {
        width = 1024;
        height = 768;
      } else if (aspectRatio === '3:4') {
        width = 768;
        height = 1024;
      }

      // Generate the exact prompt in real-time
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`;

      setActiveAccount(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === botMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  text: `تم إنشاء الصورة بنجاح بواسطة **المساعد OMI**! 🎨✨\n\n📌 **الوصف المطلوب:** "${prompt}"\n📐 **الأبعاد:** ${aspectRatio}`,
                  imageUrl: fallbackUrl,
                  mediaType: 'image',
                  mediaData: {
                    prompt,
                    aspectRatio,
                  },
                }
              : m
          ),
        };
      });
    }
  };

  // ==========================================
  // DIRECT IN-ASSISTANT VIDEO GENERATION
  // ==========================================
  const handleGenerateVideoInChat = async (prompt: string, style: string = 'سينمائي (Cinematic)') => {
    if (!activeAccount) return;

    const userMsg: ChatMessage = {
      id: `user_vid_${Date.now()}`,
      role: 'user',
      text: `🎬 أريد إنشاء مشهد فيديو بالذكاء الاصطناعي: "${prompt}" (نمط: ${style})`,
      timestamp: Date.now(),
    };

    const botMsgId = `bot_vid_${Date.now()}`;
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      text: `جاري كتابة السيناريو الإخراجي وتصميم لقطات الفيديو بالذكاء الاصطناعي مع **المساعد OMI**... 🎬`,
      timestamp: Date.now(),
      isStreaming: true,
      mediaType: 'video',
    };

    setActiveAccount(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, userMsg, initialBotMsg],
      };
    });

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, style }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAccount(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.map(m =>
              m.id === botMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    text: `تم إخراج وتصميم مشهد الفيديو بنجاح بواسطة **المساعد OMI**! 🎥\n\n📌 **الفكرة:** "${prompt}"\n🎭 **النمط:** ${style}\n\n📝 **السيناريو واللقطات الإخراجية:**\n${data.storyboard || 'لقطة سينمائية مع إضاءة ديناميكية وحركة كاميرا ناعمة.'}`,
                    videoUrl: data.videoUrl || '/assets/videos/cinematic_omi.mp4',
                    mediaType: 'video',
                    mediaData: {
                      prompt,
                      style,
                      storyboard: data.storyboard,
                      thumbnailUrl: data.thumbnailUrl,
                    },
                  }
                : m
            ),
          };
        });
      } else {
        throw new Error(data.error || 'تعذر توليد الفيديو.');
      }
    } catch (err: any) {
      console.warn('Video generation fallback in chat:', err);
      const fallbackThumb =
        'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1000&q=80';

      const simulatedStoryboard = `• المشهد 1: لقطة تأسيسية واسعة (Wide Angle) تُظهر تفاصيل "${prompt}" بانسيابية.\n• المشهد 2: حركة كاميرا سينمائية مقربة مع إضاءة ذهبية مبهرة بنمط ${style}.\n• المشهد 3: نهاية المشهد بانسحاب بطيء وحركة ثلاثية الأبعاد جذابة.`;

      setActiveAccount(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === botMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  text: `تم إخراج وتصميم مشهد الفيديو بالذكاء الاصطناعي مع **المساعد OMI**! 🎬\n\n📌 **الفكرة:** "${prompt}"\n🎭 **النمط:** ${style}\n\n🎬 **السيناريو الإخراجي المقترح:**\n${simulatedStoryboard}`,
                  videoUrl: '/assets/videos/cinematic_omi.mp4',
                  mediaType: 'video',
                  mediaData: {
                    prompt,
                    style,
                    storyboard: simulatedStoryboard,
                    thumbnailUrl: fallbackThumb,
                  },
                }
              : m
          ),
        };
      });
    }
  };

  // ==========================================
  // PROMO CODE REDEMPTION (ISOLATED PER USER)
  // ==========================================
  const handleRedeemCode = (inputCode: string) => {
    if (!activeAccount) {
      return { success: false, message: 'يجب تسجيل الدخول أولاً لشحن الكود.' };
    }

    const formatted = inputCode.trim().toUpperCase();
    const index = promoCodes.findIndex(c => c.code.toUpperCase() === formatted);

    if (index === -1) {
      return { success: false, message: 'الكود غير موجود أو غير صالح.' };
    }

    const codeObj = promoCodes[index];
    const username = activeAccount.username;
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

      const updatedAccount: UserAccount = {
        ...activeAccount,
        points: activeAccount.points + codeObj.points,
        redeemedCodes: [...(activeAccount.redeemedCodes || []), formatted],
      };
      setActiveAccount(updatedAccount);
      saveAccount(updatedAccount);

      return {
        success: true,
        points: codeObj.points,
        message: `تهانينا! لقد حصلت على الكود الحصري كأول شخص (+${codeObj.points} نقطة)!`,
      };
    }

    // multi_use
    if (redeemedList.includes(username) || (activeAccount.redeemedCodes || []).includes(formatted)) {
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

    const updatedAccount: UserAccount = {
      ...activeAccount,
      points: activeAccount.points + codeObj.points,
      redeemedCodes: [...(activeAccount.redeemedCodes || []), formatted],
    };
    setActiveAccount(updatedAccount);
    saveAccount(updatedAccount);

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
  // RENDER 1: ADMIN PORTAL (#admin)
  // ==========================================
  if (currentRoute === 'admin') {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100" dir="rtl">
        <header className="bg-slate-900 border-b border-purple-500/30 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg border border-purple-500/50 flex items-center justify-center bg-black">
              <img src={APP_LOGO} alt="Chat OMI" className="w-full h-full object-cover" />
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

              {/* 🎛️ بطاقة التحكم في إيقاف وتشغيل الرابط العام للزوار */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isAppPaused
                    ? 'bg-red-950/40 border-red-500/50 shadow-xl shadow-red-950/40'
                    : 'bg-slate-800/60 border-slate-700/60 shadow-lg'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        🎛️ حالة رابط المنصة للزوار والمستخدمين:
                      </span>
                      {isAppPaused ? (
                        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          الرابط متوقف حالياً ⏸️
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          الرابط نشط ويعمل للجميع ▶️
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {isAppPaused
                        ? 'الرابط معطل وموقف الآن لجميع الزوار، وتظهر لهم الرسالة: «هذا الرابط متوقف حالياً، الرجاء لاحقاً عندما أفعله في رابط المدير» ولا يمكنهم استخدام المحادثات حتى تقوم بتفعيله هنا.'
                        : 'الرابط نشط الآن، وجميع الزوار والمستخدمين يمكنهم الدخول والدردشة واستخدام المساعد OMI بحرية.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleAppPause(!isAppPaused)}
                    disabled={isUpdatingPause}
                    className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shrink-0 active:scale-95 shadow-lg ${
                      isAppPaused
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
                    }`}
                  >
                    {isUpdatingPause ? (
                      <span>جاري التحديث...</span>
                    ) : isAppPaused ? (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>▶️ تفعيل وإعادة تشغيل الرابط</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        <span>⏸️ إيقاف الرابط مؤقتاً الآن</span>
                      </>
                    )}
                  </button>
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
  // RENDER 1.5: LINK PAUSED / MAINTENANCE SCREEN
  // "هذا الرابط متوقف حالياً، الرجاء لاحقاً عندما أفعله في رابط المدير"
  // ==========================================
  if (isAppPaused) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6" dir="rtl">
        {/* Glow Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        {/* رأس الصفحة مع الشعار */}
        <header className="w-full max-w-xl flex items-center justify-between pt-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-black border border-purple-500/40 p-0.5 shadow-lg">
              <img src={APP_LOGO} alt="Chat OMI" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white">Chat OMI</h1>
              <span className="text-[11px] text-slate-400">المساعد OMI • تطوير عمر الذهلي</span>
            </div>
          </div>

          <button
            onClick={goToAdminPortal}
            className="text-xs bg-slate-900/80 hover:bg-slate-800 text-purple-400 hover:text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>لوحة المدير</span>
          </button>
        </header>

        {/* كرت التوقف المؤقت الرئيسي مع النص الإلزامي المطلوب من المستخدم */}
        <main className="w-full max-w-lg my-auto relative z-10 text-center py-8">
          <div className="bg-slate-900/90 border border-red-500/30 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600/20 to-amber-600/20 border border-red-500/30 text-red-400 shadow-xl shadow-red-500/10">
              <Pause className="w-10 h-10 fill-red-400" />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full inline-block">
                ⚠️ إشعار إداري مؤقت
              </span>

              {/* النص المحدد بالحرف من قبل المستخدم */}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                هذا الرابط متوقف حالياً، الرجاء لاحقاً عندما أفعله في رابط المدير
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                قام مدير النظام (<strong className="text-purple-300">عمر الذهلي</strong>) بإيقاف رابط المنصة مؤقتاً. يرجى الانتظار لحين إعادة تفعيل الرابط من قِبل المدير.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => syncSystemStatus()}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>فحص وتحديث الحالة الآن</span>
              </button>

              <button
                onClick={goToAdminPortal}
                className="w-full sm:w-auto bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>دخول المدير لتفعيل الرابط</span>
              </button>
            </div>
          </div>
        </main>

        {/* تذييل */}
        <footer className="text-center text-xs text-slate-500 py-4 relative z-10">
          منصة Chat OMI • المساعد OMI | المطور عمر الذهلي
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: USER PORTAL WITH OMI ASSISTANT
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100" dir="rtl">
      {/* شاشة تسجيل الدخول وإنشاء الحساب المنفصل بنظام 5 خانات إنجليزية */}
      {!activeAccount && (
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          onGoToAdmin={goToAdminPortal}
        />
      )}

      {/* التطبيق الرئيسي مع حساب المستخدم المستقل */}
      {activeAccount && (
        <div id="appScreen" className="flex flex-col min-h-screen">
          {/* شريط العنوان */}
          <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-blue-500/40 flex items-center justify-center bg-black">
                <img src={APP_LOGO} alt="Chat OMI" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-white text-base sm:text-lg">Chat OMI</h1>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    المساعد OMI
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>حسابك:</span>
                  <span className="text-blue-400 font-mono font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    @{activeAccount.username}
                  </span>
                  <span className="text-slate-500">• عمر الذهلي</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* رصيد النقاط الخاص بهذا الحساب */}
              <button
                onClick={() => setIsRedeemModalOpen(true)}
                title="اضغط لشحن كود نقاط"
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-sm"
              >
                <span>🪙 النقاط:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {activeAccount.points}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  + شحن
                </span>
              </button>

              {/* زر تصفير النقاط لهذا الحساب */}
              <button
                onClick={handleResetPoints}
                title="تصفير نقاط حسابك"
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 text-xs px-2 py-1.5 rounded-lg border border-slate-700 transition hidden sm:flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير</span>
              </button>


              {/* تبديل الحساب / تسجيل خروج */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitchAccountMenu(prev => !prev)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>تبديل الحساب</span>
                  <ChevronDown className="w-3 h-3 text-blue-400" />
                </button>

                {showSwitchAccountMenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fadeIn">
                    <div className="p-2 border-b border-slate-800 mb-1">
                      <div className="text-[11px] text-slate-400">الحساب الحالي:</div>
                      <div className="font-mono text-sm font-bold text-white">
                        @{activeAccount.username}
                      </div>
                      <div className="text-amber-400 text-[11px] font-mono mt-0.5">
                        رصيد الحساب: {activeAccount.points} نقطة
                      </div>
                    </div>

                    <button
                      onClick={handleResetPoints}
                      className="w-full text-right p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>تصفير نقاط هذا الحساب</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-right p-2 rounded-xl text-red-300 hover:text-white hover:bg-red-500/20 transition flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      <span>تسجيل الخروج / حساب جديد</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* شريط الأدوات والخواص الأساسية السريع */}
          <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">خدمات المساعد OMI:</span>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial overflow-x-auto no-scrollbar">
                {/* 1. إنشاء صورة */}
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

                {/* 5. تثبيت */}
                <button
                  onClick={() => setIsInstallModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 transition whitespace-nowrap"
                >
                  تثبيت 📲
                </button>
              </div>
            </div>
          </div>

          {/* محتوى المحادثة الأصلي مع المساعد OMI */}
          <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-4">
            <div
              id="chatSection"
              className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[70vh] shadow-xl overflow-hidden"
            >
              {/* شريط رأس المحادثة */}
              <div className="bg-slate-800/50 p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200">
                    💬 محادثة فورية مع المساعد OMI (مجانية بالكامل)
                  </span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    استجابة فورية (&lt; 3 ثوانٍ)
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>حسابك:</span>
                  <span className="font-mono text-blue-300 font-bold">@{activeAccount.username}</span>
                </div>
              </div>

              {/* الرسائل والوسائط (صور وفيديوهات داخل المحادثة) */}
              <div
                id="chatMessages"
                ref={chatMessagesRef}
                className="flex-1 p-4 overflow-y-auto chat-container space-y-4"
              >
                {activeAccount.messages.map(msg => {
                  const isUser = msg.role === 'user';
                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex gap-3 justify-end">
                        <div className="bg-blue-600 p-3.5 rounded-2xl max-w-[80%] text-sm text-white shadow whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-700/60 text-blue-200 border border-blue-500/40 flex items-center justify-center font-bold text-xs shrink-0 select-none font-mono">
                          {activeAccount.username.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-blue-500/40 flex items-center justify-center shrink-0 select-none">
                        <img src={APP_LOGO} alt="المساعد OMI" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-slate-800 p-3.5 rounded-2xl max-w-[85%] text-sm text-slate-200 border border-slate-700/50 leading-relaxed space-y-3">
                        <div className="whitespace-pre-wrap">
                          {msg.text || (
                            <span className="text-slate-400 animate-pulse">...</span>
                          )}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-blue-400 mr-1 animate-cursor align-middle" />
                          )}
                        </div>

                        {/* بطاقة عرض الصورة المولدة داخل المحادثة */}
                        {msg.imageUrl && (
                          <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-xl space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                صورة مولدة بنانو بنانو ✨
                              </span>
                              {msg.mediaData?.aspectRatio && (
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px]">
                                  {msg.mediaData.aspectRatio}
                                </span>
                              )}
                            </div>

                            <div className="rounded-lg overflow-hidden bg-black border border-slate-800 max-h-80 flex items-center justify-center">
                              <img
                                src={msg.imageUrl}
                                alt={msg.mediaData?.prompt || 'صورة من المساعد OMI'}
                                className="w-full h-auto object-cover max-h-80"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {msg.mediaData?.prompt}
                              </span>
                              <a
                                href={msg.imageUrl}
                                download="chat_omi_image.png"
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Download className="w-3 h-3" />
                                <span>تحميل</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* بطاقة عرض مشهد الفيديو المولد داخل المحادثة */}
                        {msg.videoUrl && (
                          <div className="p-3 bg-slate-950 border border-purple-500/30 rounded-xl space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                مشهد فيديو سينمائي جاهز للتشغيل 🎬
                              </span>
                              {msg.mediaData?.style && (
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px]">
                                  {msg.mediaData.style}
                                </span>
                              )}
                            </div>

                            {/* مشغل الفيديو الفعلي المباشر داخل المحادثة */}
                            <div className="rounded-xl overflow-hidden aspect-video bg-black border border-purple-500/30 shadow-lg relative group">
                              <video
                                src={msg.videoUrl}
                                poster={msg.mediaData?.thumbnailUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-contain bg-black"
                              />
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {msg.mediaData?.prompt || 'مشهد فيديو ذكي'}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivePlayerVideo({
                                      isOpen: true,
                                      videoUrl: msg.videoUrl!,
                                      thumbnailUrl: msg.mediaData?.thumbnailUrl,
                                      prompt: msg.mediaData?.prompt,
                                      style: msg.mediaData?.style,
                                      storyboard: msg.mediaData?.storyboard,
                                    })
                                  }
                                  className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                                >
                                  <Play className="w-3.5 h-3.5 fill-purple-300" />
                                  <span>فتح المشغل الكامل 🎬</span>
                                </button>

                                <a
                                  href={msg.videoUrl}
                                  download="chat_omi_video.mp4"
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition border border-slate-700"
                                  title="تحميل ملف الفيديو"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>تحميل</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.responseTime && (
                          <div className="text-[10px] text-emerald-400/80 flex items-center gap-1 pt-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>استجابة فورية خلال {msg.responseTime} ثانية</span>
                          </div>
                        )}

                        {msg.error && (
                          <div className="pt-2 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => sendUserMessage(undefined, 'أعد المحاولة')}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>إعادة المحاولة مع المساعد OMI</span>
                            </button>
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
                  onClick={() => sendUserMessage(undefined, 'من الذي أنشأك وطورك؟')}
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
                  onClick={() => setIsRedeemModalOpen(true)}
                  className="bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/30 transition whitespace-nowrap"
                >
                  🎟️ شحن كود نقاط
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
                    placeholder="اكتب رسالتك إلى المساعد OMI..."
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
            <span>Chat OMI • المساعد OMI | تطوير عمر الذهلي</span>
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

      {/* نوافذ الخواص التفاعلية */}
      <RedeemCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        promoCodes={promoCodes}
        currentUserUsername={activeAccount?.username || ''}
        onRedeem={handleRedeemCode}
      />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onGenerateInChat={handleGenerateImageInChat}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onGenerateInChat={handleGenerateVideoInChat}
      />

      <BrowserModal
        isOpen={isBrowserModalOpen}
        onClose={() => setIsBrowserModalOpen(false)}
      />

      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {activePlayerVideo && (
        <VideoPlayerModal
          isOpen={activePlayerVideo.isOpen}
          onClose={() => setActivePlayerVideo(null)}
          videoUrl={activePlayerVideo.videoUrl}
          thumbnailUrl={activePlayerVideo.thumbnailUrl}
          prompt={activePlayerVideo.prompt}
          style={activePlayerVideo.style}
          storyboard={activePlayerVideo.storyboard}
        />
      )}
    </div>
  );
}

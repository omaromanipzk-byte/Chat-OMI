import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Send, Trash2, Bot, User as UserIcon, Volume2, VolumeX, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';

interface ChatSectionProps {
  currentUser: User;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const STARTER_PROMPTS = [
  '💡 اقترح لي أفكار مشاريع تقنية مبتكرة لعام 2026',
  '💻 اكتب لي دالة بلغة TypeScript للتحقق من صحة البريد',
  '✍️ صِغ لي رسالة بريد إلكتروني رسمية لتقديم عرض عمل',
  '📊 لخص لي أهم خطوات بدء مشروع تجاري ناجح',
  '🪙 كيف يمكنني استخدام النقاط والأكواد في Chat OMI؟',
];

export const ChatSection: React.FC<ChatSectionProps> = ({
  currentUser,
  messages,
  setMessages,
}) => {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Speech synthesis cleanup
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text from markdown markers for cleaner speech
    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const clearChat = () => {
    const greeting: ChatMessage = {
      id: 'msg-welcome',
      role: 'assistant',
      text: `أهلاً بك يا **${currentUser.username}**! أنا **المساعد خليل**، المساعد الذكي الرسمي لمنصة **Chat OMI**.\n\nكيف يمكنني مساعدتك اليوم؟ تذكر أن المحادثات معي مجانية تماماً ولا تخصم أي نقاط من رصيدك!`,
      timestamp: Date.now(),
    };
    setMessages([greeting]);
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages([...updatedHistory, initialAssistantMessage]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Send message to server streaming endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map(m => ({ role: m.role, text: m.text })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
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
            if (parsed.text) {
              accumulatedText += parsed.text;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantPlaceholderId
                    ? { ...msg, text: accumulatedText }
                    : msg
                )
              );
            }
            if (parsed.error) {
              accumulatedText += `\n\n*(تنبيه: ${parsed.error})*`;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantPlaceholderId
                    ? { ...msg, text: accumulatedText, error: true }
                    : msg
                )
              );
            }
          } catch {
            // ignore partial line parse
          }
        }
      }

      // Finalize message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? { ...msg, isStreaming: false, text: accumulatedText || 'تم إتمام الرد.' }
            : msg
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? { ...msg, isStreaming: false, text: msg.text + ' (تم إيقاف التوليد)' }
              : msg
          )
        );
      } else {
        console.error('Chat error:', err);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  isStreaming: false,
                  error: true,
                  text: 'عذراً، حدث خطأ أثناء الاتصال بالخادم الذكي. يرجى إعادة المحاولة.',
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[76vh] sm:h-[80vh] shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Chat Section Header */}
      <div className="bg-slate-900 border-b border-slate-800/90 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">المساعد خليل</span>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                سرعة فائقة (Stream)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">محادثات فورية مجانية بالكامل مع ذكاء اصطناعي متقدم</p>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="text-slate-400 hover:text-red-400 hover:bg-slate-800/80 p-2 rounded-xl text-xs flex items-center gap-1.5 transition"
          title="مسح المحادثة وبدء حوار جديد"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">مسح المحادثة</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto chat-container space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-start flex-row-reverse' : 'justify-start'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-md ${
                  isUser
                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 border border-slate-600'
                    : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-blue-500/20'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : 'OMI'}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-sm shadow-md transition-all ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tl-sm'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tr-sm'
                } ${msg.error ? 'border-red-500/50 bg-red-950/20' : ''}`}
              >
                {/* Header label for assistant */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-3 mb-2 text-xs text-slate-400 pb-1 border-b border-slate-700/40">
                    <span className="font-semibold text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      المساعد خليل
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleSpeak(msg.id, msg.text)}
                        className={`p-1 rounded hover:bg-slate-700/70 transition ${
                          speakingMsgId === msg.id ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={speakingMsgId === msg.id ? 'إيقاف القراءة' : 'قراءة صوتية'}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 rounded hover:bg-slate-700/70 text-slate-400 hover:text-slate-200 transition"
                        title="نسخ الرسالة"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                ) : (
                  <div>
                    {msg.text ? (
                      <MarkdownRenderer content={msg.text} />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 py-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                        <span className="text-xs">المساعد خليل يكتب الآن...</span>
                      </div>
                    )}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-blue-400 mr-1 animate-pulse align-middle" />
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div
                  className={`mt-1.5 text-[10px] ${
                    isUser ? 'text-blue-200 text-left' : 'text-slate-400 text-right'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts (shown when only 1 greeting message exists) */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/60">
          <div className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            اقتراحات سريعة للبدء:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                className="whitespace-nowrap bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700/70 transition shrink-0 shadow-sm active:scale-95 text-right"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Section */}
      <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب رسالتك إلى المساعد خليل..."
              disabled={isStreaming}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition pr-4 pl-10"
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 sm:px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-red-600/20 flex items-center gap-1.5 shrink-0"
            >
              <span>إيقاف</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 sm:px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>إرسال</span>
            </button>
          )}
        </form>

        <div className="mt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>المحادثات مع المساعد خليل مجانية بالكامل 100% ولا يتم خصم أي نقاط من رصيدك.</span>
        </div>
      </div>
    </div>
  );
};

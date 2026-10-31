import React, { useState } from 'react';
import { Globe, Search, ExternalLink, Sparkles, X, Compass } from 'lucide-react';

interface BrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrowserModal: React.FC<BrowserModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    text: string;
    sources: Array<{ title: string; uri: string }>;
    query: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/browser/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResult({
          text: data.text,
          sources: data.sources || [],
          query: data.query,
        });
      } else {
        setErrorMessage(data.error || 'تعذر البحث في الويب حالياً. يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto chat-container">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white mb-3 shadow-lg shadow-cyan-500/20">
            <Globe className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">المتصفح الذكي (Live Browser) 🌐</h2>
          <p className="text-xs text-slate-400 mt-1">
            تصفح الإنترنت وابحث عن أحدث المعلومات الحية والمصادر المباشرة
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* حقل البحث */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2 mb-4"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث في الويب عن أي موضوع، أخبار، تقنيات..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 pl-10"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 shrink-0"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>تصفح</span>
            )}
          </button>
        </form>

        {/* اقتراحات بحث سريعة */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 text-xs no-scrollbar mb-4">
          <span className="text-slate-400 text-[11px] whitespace-nowrap self-center">مقترحات:</span>
          {['آخر أخبار التقنية 2026', 'طقس مسقط اليوم', 'تطورات الذكاء الاصطناعي'].map(topic => (
            <button
              key={topic}
              type="button"
              onClick={() => {
                setQuery(topic);
                handleSearch(topic);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap text-[11px] transition"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* نتائج التصفح والبحث */}
        {searchResult && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Compass className="w-4 h-4" />
              <span>نتائج تصفح: {searchResult.query}</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
              {searchResult.text}
            </p>

            {searchResult.sources.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                  🔗 المصادر ومواقع الويب:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {searchResult.sources.slice(0, 4).map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1 transition"
                    >
                      <span>{source.title || 'رابط المصدر'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

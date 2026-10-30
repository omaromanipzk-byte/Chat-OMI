import React, { useState } from 'react';
import { Video, Sparkles, X, Play, Film, Download, CheckCircle2 } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('سينمائي (Cinematic)');
  const [isLoading, setIsLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<{
    prompt: string;
    style: string;
    storyboard: string;
    thumbnailUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });
      const data = await res.json();
      if (data.success) {
        setVideoResult({
          prompt: data.prompt,
          style: data.style,
          storyboard: data.storyboard,
          thumbnailUrl: data.thumbnailUrl,
        });
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto chat-container">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white mb-3 shadow-lg shadow-pink-500/20">
            <Video className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">إنشاء فيديو بالذكاء الاصطناعي 🎬</h2>
          <p className="text-xs text-slate-400 mt-1">
            صمم مقاطع ومشاهد فيديو سينمائية بمجرد كتابة الفكرة
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold">
              وصف مشهد الفيديو:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="مثال: غروب شمس ساحر على شاطئ البحر مع حركة أمواج هادئة وسفينة في الأفق..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500 transition resize-none placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold">
              نمط الفيديو (Style):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['سينمائي (Cinematic)', 'ثلاثي الأبعاد (3D)', 'خيالي (Fantasy)'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition ${
                    style === s
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري معالجة وإنشاء مشاهد الفيديو...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>إنشاء الفيديو الآن ⚡</span>
              </>
            )}
          </button>
        </form>

        {/* نتيجة الفيديو */}
        {videoResult && (
          <div className="mt-5 p-4 bg-slate-950 border border-purple-500/40 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تم إخراج مشهد الفيديو بنجاح
              </span>
              <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                {videoResult.style}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-800 group">
              <img
                src={videoResult.thumbnailUrl}
                alt="Video scene"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition cursor-pointer">
                  <Play className="w-5 h-5 ml-0.5 fill-white" />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
              <span className="font-bold text-purple-300 block mb-1">🎬 السيناريو الإخراجي:</span>
              <p className="whitespace-pre-line text-slate-400">{videoResult.storyboard}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

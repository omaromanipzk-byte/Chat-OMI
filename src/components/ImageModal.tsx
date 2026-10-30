import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, X, Download, CheckCircle2 } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<{
    imageUrl: string;
    prompt: string;
    model: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImg({
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          model: data.model || 'نانو بنانو (Nano Banana)',
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-3 shadow-lg shadow-blue-500/20">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">إنشاء صورة (نانو بنانو) 🎨</h2>
          <p className="text-xs text-slate-400 mt-1">
            توليد صور بدقة فائقة باستخدام أحدث نماذج نانو بنانو
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold">
              وصف الصورة المراد إنشاؤها:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="مثال: شعار مستقبلي ثلاثي الأبعاد بألوان نيون زرقاء..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold">
              أبعاد الصورة (Aspect Ratio):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'مربع (1:1)', val: '1:1' },
                { label: 'عريض (16:9)', val: '16:9' },
                { label: 'طولي (9:16)', val: '9:16' },
              ].map(ar => (
                <button
                  key={ar.val}
                  type="button"
                  onClick={() => setAspectRatio(ar.val)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition ${
                    aspectRatio === ar.val
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري معالجة وتوليد الصورة بنانو بنانو...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>توليد الصورة الآن ⚡</span>
              </>
            )}
          </button>
        </form>

        {/* نتيجة الصورة */}
        {generatedImg && (
          <div className="mt-5 p-4 bg-slate-950 border border-blue-500/40 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تم التوليد بنجاح
              </span>
              <span className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                نانو بنانو
              </span>
            </div>

            <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
              <img
                src={generatedImg.imageUrl}
                alt={generatedImg.prompt}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 italic">"{generatedImg.prompt}"</span>
              <a
                href={generatedImg.imageUrl}
                download="chat_omi_nano_image.png"
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الصورة</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

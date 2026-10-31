import React, { useState } from 'react';
import { Video, Sparkles, X, ArrowLeft, Film } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateInChat: (prompt: string, style?: string) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  onGenerateInChat,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('سينمائي (Cinematic)');

  if (!isOpen) return null;

  const handleSendToAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    // Immediately pass prompt into assistant chat and close modal
    onGenerateInChat(cleanPrompt, style);
    onClose();
  };

  const samplePrompts = [
    'سفينة فضاء تقترب من محطة مدارية زرقاء مع انعكاس كوكب الأرض في الفضاء',
    'لقطة درون سينمائية فوق واحة صحراوية ذهبية وقت شروق الشمس مع قوافل جمال',
    'شلالات مائية مضيئة بألوان الفلورسنت داخل غابة استوائية ليلية ساحرة',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
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
            اكتب مشهد الفيديو وسيقوم <strong className="text-purple-400">المساعد OMI</strong> بإخراجه وعرضه فوراً في المحادثة
          </p>
        </div>

        <form onSubmit={handleSendToAssistant} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
              ما المشهد الذي تريد تصويره في الفيديو؟
            </label>
            <textarea
              rows={3}
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="مثال: لقطة سينمائية بطيئة لغروب الشمس على شاطئ استوائي مع أمواج ذهبية..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500 transition resize-none placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold">
              نمط الفيديو (Style):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                'سينمائي (Cinematic)',
                'ثلاثي الأبعاد (3D)',
                'خيالي (Fantasy)',
              ].map(s => (
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

          {/* أفكار مقترحة سريعة */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">أفكار مشاهد مقترحة (اضغط للتجربة):</span>
            <div className="space-y-1">
              {samplePrompts.slice(0, 3).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="w-full text-right p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white transition truncate block border border-slate-700/50"
                >
                  🎬 {sample}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>إنشاء مشهد الفيديو ونقله للمساعد OMI 🎬</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, X, ArrowLeft, Send } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateInChat: (prompt: string, aspectRatio?: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  onGenerateInChat,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  if (!isOpen) return null;

  const handleSendToAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    // Immediately pass prompt into assistant chat and close modal
    onGenerateInChat(cleanPrompt, aspectRatio);
    onClose();
  };

  const samplePrompts = [
    'سيارة مستقبلية طائرة فوق أبراج دبي ليلاً بأضواء نيون زرقاء',
    'شعار تقني ثلاثي الأبعاد لكلمة OMI على خلفية فضائية زجاجية',
    'صقر عربي أصيل يقف على قمة جبل وقت الغروب بدقة فائقة 8K',
    'رائد فضاء عربي يكتشف واحة نخيل خضراء على سطح كوكب المريخ',
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-3 shadow-lg shadow-blue-500/20">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">إنشاء صورة (نانو بنانو) 🎨</h2>
          <p className="text-xs text-slate-400 mt-1">
            اكتب وصف الصورة وسيقوم <strong className="text-blue-400">المساعد OMI</strong> بتوليدها وعرضها فوراً في المحادثة
          </p>
        </div>

        <form onSubmit={handleSendToAssistant} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
              ما الصورة التي تريد إنشاءها؟
            </label>
            <textarea
              rows={3}
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="مثال: قطة رائد فضاء لطيفة في الفضاء مع نجوم وكواكب بألوان نيون..."
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

          {/* أفكار مقترحة سريعة */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">أفكار مقترحة سريعة (اضغط للتجربة):</span>
            <div className="space-y-1">
              {samplePrompts.slice(0, 3).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="w-full text-right p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white transition truncate block border border-slate-700/50"
                >
                  💡 {sample}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>إنشاء الصورة وعرضها في المساعد OMI 🚀</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

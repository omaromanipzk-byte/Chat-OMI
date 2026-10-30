import React from 'react';
import { Download, Smartphone, Monitor, Share2, MoreVertical, X } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto chat-container">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* عرض الشعار الجديد عند التثبيت */}
        <div className="text-center mb-4">
          <div className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden border border-blue-500/40 shadow-2xl mb-3 bg-black">
            <img
              src="/assets/aistudio/image_4dfbd469.jpg"
              alt="شعار تثبيت تطبيق Chat OMI - الذكاء الاصطناعي"
              className="w-full h-auto object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-white">تثبيت تطبيق Chat OMI</h2>
          <p className="text-xs text-slate-400 mt-1">
            ثبّت التطبيق على شاشتك الرئيسية للحصول على تجربة فورية وسريعة كأي تطبيق أصلي 📲
          </p>
        </div>

        <div className="space-y-3">
          {/* iOS */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-200 mb-1.5">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>هواتف آيفون (Safari):</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              اضغط على أيقونة المشاركة <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-1" /> ثم اختر <span className="text-white font-semibold">«إضافة إلى الشاشة الرئيسية / Add to Home Screen»</span> وستظهر أيقونة التطبيق الرسمية فوراً.
            </p>
          </div>

          {/* Android */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-200 mb-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>هواتف أندرويد (Chrome):</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              اضغط على القائمة (الثلاث نقاط) <MoreVertical className="w-3.5 h-3.5 inline text-emerald-400 mx-1" /> واختر <span className="text-white font-semibold">«تثبيت التطبيق / Install App»</span>.
            </p>
          </div>

          {/* Desktop */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-200 mb-1.5">
              <Monitor className="w-4 h-4 text-purple-400" />
              <span>الحاسوب (Chrome / Edge):</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              انقر على أيقونة التثبيت <Download className="w-3.5 h-3.5 inline text-purple-400 mx-1" /> في شريط عنوان المتصفح.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition text-xs"
        >
          تم، إغلاق النافذة
        </button>
      </div>
    </div>
  );
};

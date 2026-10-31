import React from 'react';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Coins, Plus, Settings, MessageSquare, Download, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  currentTab: 'chat' | 'admin';
  setCurrentTab: (tab: 'chat' | 'admin') => void;
  onOpenRedeemModal: () => void;
  onOpenInstallModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  onOpenRedeemModal,
  onOpenInstallModal,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-3 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Assistant Identity */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[2px] shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-base tracking-tighter">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">OMI</span>
              </div>
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                Chat <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">OMI</span>
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium text-slate-300">المساعد OMI</span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-medium ${
                isAdmin
                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
              }`}>
                {isAdmin ? <ShieldCheck className="w-3 h-3 text-purple-400" /> : <UserIcon className="w-3 h-3 text-blue-400" />}
                {isAdmin ? 'مدير النظام' : 'مستخدم'} ({currentUser.username})
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Points, Tabs, Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Points Balance Pill */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 pr-2.5 sm:pr-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="hidden xs:inline">النقاط:</span>
              <span className="text-amber-400 font-bold text-sm tracking-wide">
                {currentUser.points.toLocaleString('ar-EG')}
              </span>
            </div>
            <button
              onClick={onOpenRedeemModal}
              title="إدخال كود شحن نقاط"
              className="mr-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition shadow-sm active:scale-95"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span className="hidden sm:inline">شحن كود</span>
            </button>
          </div>

          {/* Navigation View Switcher (Admin / Chat) */}
          {isAdmin && (
            <div className="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                onClick={() => {
                  setCurrentTab('chat');
                  window.location.hash = '';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  currentTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>المحادثة</span>
              </button>
              <button
                onClick={() => {
                  setCurrentTab('admin');
                  window.location.hash = '#admin';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  currentTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>لوحة المدير</span>
              </button>
            </div>
          )}

          {/* Install App Button */}
          <button
            onClick={onOpenInstallModal}
            className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs px-2.5 sm:px-3 py-2 rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition active:scale-95"
            title="تثبيت التطبيق على جهازك"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">تثبيت التطبيق</span>
          </button>

          {/* Logout / Switch Role */}
          <button
            onClick={onLogout}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300 p-2 rounded-xl text-xs border border-transparent hover:border-red-500/20 transition active:scale-95 flex items-center gap-1"
            title="تسجيل الخروج أو تبديل الحساب"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};

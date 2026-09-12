import React from 'react';
import { Shield, Sparkles, Sun, Moon, Cpu } from 'lucide-react';

export default function Header({ theme, setTheme }) {
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-200 ${
      isDark ? 'bg-[#090A0F]/90 border-[#232736] text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                FinServe
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                Enterprise RAG
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Intelligent Document QA Platform
            </p>
          </div>
        </div>

        {/* Status Badges & Theme Toggle */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-100 dark:bg-[#12141C] border-slate-200 dark:border-[#232736] text-slate-700 dark:text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Enterprise RAG Engine</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs bg-slate-100 dark:bg-[#12141C] border-slate-200 dark:border-[#232736] text-slate-700 dark:text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>120ms Latency</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl border transition-all bg-slate-100 dark:bg-[#12141C] border-slate-200 dark:border-[#232736] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1A1D27] cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>

      </div>
    </header>
  );
}

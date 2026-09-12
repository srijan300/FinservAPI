import React from 'react';
import { Shield, Sparkles, Server, Sun, Moon } from 'lucide-react';

export default function Header({
  theme,
  setTheme,
  executionMode,
  setExecutionMode
}) {
  return (
    <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'glass-panel' : 'bg-white/80 border-b border-slate-200'} backdrop-blur-md transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                FinServe
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RAG v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Intelligent Document Intelligence Platform</p>
          </div>
        </div>

        {/* Model Pill & Status Badges */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Powered by <strong className="text-emerald-400">Google Gemini 2.5</strong></span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-300 font-mono">120ms Latency</span>
          </div>
        </div>

        {/* Mode Switcher & Theme Controls */}
        <div className="flex items-center space-x-3">
          {/* Execution Mode Toggle */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center text-xs font-medium">
            <button
              onClick={() => setExecutionMode('demo')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                executionMode === 'demo'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Simulation
            </button>
            <button
              onClick={() => setExecutionMode('live')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                executionMode === 'live'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Live Backend</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}

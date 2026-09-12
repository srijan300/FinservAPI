import React from 'react';
import { Activity, RefreshCw, CheckCircle2, Server } from 'lucide-react';
import { RAG_STAGES } from '../constants/mockData';

export default function PipelineVisualizer({
  isProcessing,
  currentStep,
  executionMode,
  apiEndpoint,
  setApiEndpoint,
  bearerToken,
  setBearerToken
}) {
  return (
    <div className="space-y-6">
      
      {/* 5-Stage Stepper Container */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-heading font-bold text-lg text-slate-100">Live RAG Workflow Stepper</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">2-Stage Reranker</span>
        </div>

        {/* Stepper Stages List */}
        <div className="space-y-3 relative">
          {RAG_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = isProcessing && currentStep === stage.id;
            const isDone = currentStep > stage.id;

            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-xl border transition-all duration-300 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/50 glow-emerald scale-[1.02]'
                    : isDone
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold font-mono text-emerald-400">0{stage.id}</span>
                        <h4 className="font-bold text-sm text-slate-100">{stage.name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {stage.tech}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{stage.desc}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isActive && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backend Endpoint Config (Visible in Live Mode) */}
      {executionMode === 'live' && (
        <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
            <div className="flex items-center space-x-1.5">
              <Server className="w-4 h-4" />
              <span>Live Backend Configuration</span>
            </div>
            <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">POST Endpoint</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-slate-400 font-mono">Endpoint URL:</label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 mt-1"
              />
            </div>

            <div>
              <label className="text-slate-400 font-mono">Security Bearer Token:</label>
              <input
                type="text"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 mt-1"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

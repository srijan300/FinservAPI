import React from 'react';
import { Activity, RefreshCw, CheckCircle2 } from 'lucide-react';
import { RAG_STAGES } from '../constants/mockData';

export default function PipelineVisualizer({
  isProcessing,
  currentStep
}) {
  return (
    <div className="enterprise-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#232736] pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-heading font-bold text-base text-slate-900 dark:text-slate-100">Live RAG Workflow Stepper</h3>
        </div>
        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">FAISS + CrossEncoder</span>
      </div>

      {/* Stepper Stages List */}
      <div className="space-y-2.5 relative">
        {RAG_STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = isProcessing && currentStep === stage.id;
          const isDone = currentStep > stage.id;

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border transition-all duration-200 relative ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500/60 shadow-sm'
                  : isDone
                  ? 'inner-box text-slate-800 dark:text-slate-300'
                  : 'bg-slate-50 dark:bg-[#090A0F]/60 border-slate-200 dark:border-[#1E2230] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-1.5 rounded-lg mt-0.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : isDone
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-200 dark:bg-[#1A1D27] text-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">0{stage.id}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{stage.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#090A0F] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#232736]">
                        {stage.tech}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stage.desc}</p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div>
                  {isActive && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />}
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


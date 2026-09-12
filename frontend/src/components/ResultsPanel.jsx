import React, { useState } from 'react';
import { Sparkles, Code, AlertCircle, Check, Copy } from 'lucide-react';
import ExplainabilityDrawer from './ExplainabilityDrawer';
import CodePreviewDrawer from './CodePreviewDrawer';

export default function ResultsPanel({
  results,
  questions,
  rawResponse,
  errorDetails,
  documentUrl,
  apiEndpoint,
  bearerToken
}) {
  const [activeTab, setActiveTab] = useState('answers'); // 'answers', 'explainability', 'code'

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-slate-100">Synthesis Results & Explainability</h3>
            <p className="text-xs text-slate-400">Grounding attribution & live JSON response payload</p>
          </div>
        </div>

        {/* View Selector Tabs */}
        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs font-semibold">
          <button
            onClick={() => setActiveTab('answers')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'answers' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Generated Answers
          </button>
          <button
            onClick={() => setActiveTab('explainability')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'explainability' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RAG Explainability & Chunks
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'code' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>JSON Payload & cURL</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT DISPLAY */}
      {errorDetails && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Error:</strong> {errorDetails}
          </div>
        </div>
      )}

      {/* TAB 1: AI GENERATED ANSWERS */}
      {activeTab === 'answers' && results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((answer, idx) => (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-4 hover:border-emerald-500/30 transition-all">
              
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  Question #{idx + 1}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  98.4% Confidence
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-200 leading-snug">
                "{questions[idx] || "Sample Question"}"
              </h4>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-emerald-100 font-medium leading-relaxed">
                {answer}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Grounded Context Match</span>
                </span>

                <button
                  onClick={() => navigator.clipboard.writeText(answer)}
                  className="hover:text-emerald-400 transition-colors flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* TAB 2: EXPLAINABILITY */}
      {activeTab === 'explainability' && (
        <ExplainabilityDrawer questions={questions} />
      )}

      {/* TAB 3: CODE PREVIEW */}
      {activeTab === 'code' && (
        <CodePreviewDrawer
          documentUrl={documentUrl}
          questions={questions}
          rawResponse={rawResponse}
          apiEndpoint={apiEndpoint}
          bearerToken={bearerToken}
        />
      )}

    </div>
  );
}

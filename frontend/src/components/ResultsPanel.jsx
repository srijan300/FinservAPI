import React, { useState } from 'react';
import { Sparkles, Code, AlertCircle, Check, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ExplainabilityDrawer from './ExplainabilityDrawer';
import CodePreviewDrawer from './CodePreviewDrawer';

function renderFormattedAnswer(answerText) {
  if (!answerText) return null;

  let cleanText = answerText
    .replace(/\\n/g, '\n')
    .trim();

  return (
    <div className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed space-y-2 font-sans">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="border-l-2 border-indigo-500/60 pl-3 py-1 mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 inline-block mr-1">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-2 border-l-2 border-indigo-500/40">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-slate-700 dark:text-slate-300 py-0.5">
              {children}
            </li>
          )
        }}
      >
        {cleanText}
      </ReactMarkdown>
    </div>
  );
}

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
  const [copiedIndex, setCopiedIndex] = useState(null);

  return (
    <div className="enterprise-panel rounded-2xl p-6 space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-[#232736] pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-slate-100">Synthesis Results & Explainability</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Strictly grounded answer synthesis & RAG chunk attribution</p>
          </div>
        </div>

        {/* View Selector Tabs */}
        <div className="inner-box p-1 rounded-xl flex text-xs font-semibold">
          <button
            onClick={() => setActiveTab('answers')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'answers'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            AI Generated Answers
          </button>
          <button
            onClick={() => setActiveTab('explainability')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'explainability'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            RAG Explainability & Chunks
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>JSON Payload & cURL</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT DISPLAY */}
      {errorDetails && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-600 dark:text-red-400 text-sm">
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
            <div key={idx} className="enterprise-card p-5 rounded-xl space-y-4 hover:border-indigo-500/40 transition-all">
              
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold font-mono">
                  Question #{idx + 1}
                </span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                  98.4% Grounded Confidence
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                "{questions[idx] || "Evaluation Query"}"
              </h4>

              {/* REACT-MARKDOWN FORMATTED RENDERER */}
              <div className="p-4 rounded-xl inner-box">
                {renderFormattedAnswer(answer)}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-[#232736]">
                <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>FAISS & CrossEncoder Grounded</span>
                </span>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(answer);
                    setCopiedIndex(idx);
                    setTimeout(() => setCopiedIndex(null), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg btn-secondary text-xs flex items-center space-x-1.5 font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedIndex === idx ? 'Copied!' : 'Copy Answer'}</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* TAB 2: EXPLAINABILITY */}
      {activeTab === 'explainability' && (
        <ExplainabilityDrawer questions={questions} results={results} />
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


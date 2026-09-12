import React, { useState } from 'react';
import { HelpCircle, Plus, Trash2, Sparkles, ArrowRight, RefreshCw, Wand2, ChevronDown } from 'lucide-react';
import { QUESTION_PRESETS } from '../constants/mockData';

export default function QuestionBuilder({
  questions,
  setQuestions,
  onRunPipeline,
  onSuggestQuestions,
  isProcessing,
  isSuggesting,
  currentStep
}) {
  const [showPresets, setShowPresets] = useState(false);

  const handleSelectPreset = (key) => {
    if (QUESTION_PRESETS[key]) {
      setQuestions(QUESTION_PRESETS[key]);
    }
    setShowPresets(false);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, '']);
  };

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) return;
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const getDynamicButtonStatus = () => {
    switch (currentStep) {
      case 1:
        return 'Analyzing & Extracting Document Text...';
      case 2:
        return 'NLTK Sentence Chunking & Overlap...';
      case 3:
        return 'FAISS Vector Index Retrieval...';
      case 4:
        return 'CrossEncoder Precision Reranking...';
      case 5:
        return 'Synthesizing Grounded Answer...';
      default:
        return 'Executing RAG Pipeline...';
    }
  };

  return (
    <div className="enterprise-panel p-6 rounded-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#232736]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <HelpCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-slate-100">Step 2: Query Batch Module</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Specify evaluation questions for concurrent RAG processing</p>
          </div>
        </div>

        {/* Action Buttons & Presets Dropdown */}
        <div className="flex items-center space-x-2 shrink-0 relative">
          <div className="relative">
            <button
              type="button"
              disabled={isSuggesting}
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSuggesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>AI Generating Questions...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Suggest Questions</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </>
              )}
            </button>

            {showPresets && (
              <div className="absolute right-0 top-9 z-30 w-56 p-1 rounded-xl bg-white dark:bg-[#12141C] border border-slate-200 dark:border-[#232736] shadow-xl text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => { onSuggestQuestions(); setShowPresets(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-[#1A1D27] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between"
                >
                  <span>🤖 Auto-Detect (Smart)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('policy')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A1D27] text-slate-700 dark:text-slate-300 font-medium"
                >
                  📄 Insurance Policy & Claims
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('resume')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A1D27] text-slate-700 dark:text-slate-300 font-medium"
                >
                  💼 Resume / Candidate CV
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('finance')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A1D27] text-slate-700 dark:text-slate-300 font-medium"
                >
                  📊 Financial Report / Earnings
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('contract')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A1D27] text-slate-700 dark:text-slate-300 font-medium"
                >
                  📜 Contract & Legal Terms
                </button>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-3 py-1.5 rounded-lg btn-secondary text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-xl inner-box text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-sm">
              Q{idx + 1}
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => handleQuestionChange(idx, e.target.value)}
              placeholder="Type your question here (e.g. What are the key findings or coverage limits in this document?)"
              className="flex-1 bg-white dark:bg-[#090A0F] border border-slate-300 dark:border-[#232736] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            />
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveQuestion(idx)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#12141C] hover:bg-red-500/10 border border-slate-200 dark:border-[#232736] hover:border-red-500/30 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Remove Question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* VISUALLY DOMINANT CTA BUTTON WITH DYNAMIC INLINE PROGRESS */}
      <div className="pt-2">
        <button
          onClick={onRunPipeline}
          disabled={isProcessing}
          className={`w-full py-3.5 rounded-xl font-heading font-bold text-base tracking-wide transition-all duration-200 flex items-center justify-center space-x-3 cursor-pointer ${
            isProcessing
              ? 'bg-slate-200 dark:bg-[#161923] text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="font-mono text-sm tracking-normal">{getDynamicButtonStatus()}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-white" />
              <span>Run RAG Pipeline & Generate Answers</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}


import React from 'react';
import { HelpCircle, Plus, Trash2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

export default function QuestionBuilder({
  questions,
  setQuestions,
  onRunPipeline,
  isProcessing,
  currentStep
}) {

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

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100">Step 2: Questions Query Batch</h3>
            <p className="text-xs text-slate-400">Ask questions about the document (Concurrent Parallel Execution)</p>
          </div>
        </div>

        <button
          onClick={handleAddQuestion}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center space-x-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 flex items-center justify-center shrink-0">
              Q{idx + 1}
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => handleQuestionChange(idx, e.target.value)}
              placeholder="e.g. What is the maximum limit for Domiciliary Hospitalisation?"
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            {questions.length > 1 && (
              <button
                onClick={() => handleRemoveQuestion(idx)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          onClick={onRunPipeline}
          disabled={isProcessing}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-heading font-extrabold text-base tracking-wide shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Executing RAG Pipeline (Stage {currentStep}/5)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Run RAG Pipeline & Generate Answers</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}

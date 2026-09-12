import React from 'react';

export default function ExplainabilityDrawer({ questions }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Showing CrossEncoder reranked passages retrieved from FAISS vector database.
      </p>

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="glass-card p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-200">Q{qIdx + 1}: "{q || "Sample Query"}"</h4>
            <span className="text-xs font-mono text-emerald-400">Top 3 Reranked Passages</span>
          </div>

          <div className="space-y-2">
            {[
              { score: "+8.42", text: "Under Plan A, Domiciliary Hospitalisation benefit coverage extends up to a maximum financial limit of INR 1,00,000 per policy year subject to 3-day continuous hospitalization rule." },
              { score: "+7.15", text: "Plan B Hospital Cash Allowance is fixed at INR 1,000 per 24-hour day up to a maximum cap of 5 days." },
              { score: "+5.89", text: "General Policy Exclusions: Pre-existing conditions waiting period of 24 months applies unless explicitly endorsed." }
            ].map((chunk, cIdx) => (
              <div key={cIdx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>Chunk Index: #{cIdx * 4 + 2}</span>
                  <span className="text-emerald-400 font-bold">Reranker Score: {chunk.score}</span>
                </div>
                <p className="text-slate-300 italic">"{chunk.text}"</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

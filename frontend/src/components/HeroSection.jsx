import React from 'react';
import { Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="relative rounded-2xl p-6 sm:p-8 overflow-hidden enterprise-panel">
      <div className="relative z-10 max-w-3xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          <span>Two-Stage Vector Retrieval & Precision Reranking RAG</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          Enterprise Document <span className="text-indigo-600 dark:text-indigo-400">Intelligence System</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          Extract precise information from PDFs, DOCX files, and emails. Powered by <span className="font-semibold text-slate-900 dark:text-white">pdfplumber</span> table extraction, <span className="font-semibold text-slate-900 dark:text-white">NLTK</span> sentence chunking, <span className="font-semibold text-slate-900 dark:text-white">FAISS</span> vector search, and <span className="font-semibold text-slate-900 dark:text-white">CrossEncoder</span> reranking.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {['📄 PDF, DOCX, EML Support', '📊 Table Markdown Conversion', '🧠 NLTK Sentence Boundary', '⚡ FAISS Similarity Search', '🎯 CrossEncoder Reranker'].map((tag, i) => (
            <span key={i} className="px-3 py-1 rounded-lg inner-box text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="relative rounded-3xl p-8 overflow-hidden glass-panel border border-emerald-500/20 shadow-2xl">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 via-cyan-500/5 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 max-w-3xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          <span>Two-Stage Retrieval + Precision Reranking RAG</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Enterprise Document <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Intelligence System
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          Extract precise information from PDFs, DOCX files, and emails. Powered by <strong>pdfplumber</strong> table extraction, <strong>NLTK</strong> sentence chunking, <strong>FAISS</strong> vector search, <strong>CrossEncoder</strong> reranking, and <strong>Google Gemini</strong>.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {['📄 PDF, DOCX, EML Support', '📊 Table Markdown Conversion', '🧠 NLTK Sentence Boundary', '⚡ FAISS Similarity Search', '🎯 CrossEncoder Reranker'].map((tag, i) => (
            <span key={i} className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-300">FinServe API</span>
          <span>• Intelligent Document Q&A Platform</span>
        </div>
        <p>© 2026 Developed for Hackathon by Akash Gupta & Shubham Verma</p>
      </div>
    </footer>
  );
}

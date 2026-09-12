import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-[#232736] py-8 text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-slate-800 dark:text-slate-300">FinServe API</span>
          <span>• Intelligent Document QA Platform</span>
        </div>
        <p className="font-medium text-slate-600 dark:text-slate-400">Developed by Srijan Paul</p>
      </div>
    </footer>
  );
}


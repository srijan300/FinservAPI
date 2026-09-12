import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodePreviewDrawer({
  documentUrl,
  questions,
  rawResponse,
  apiEndpoint,
  bearerToken
}) {
  const [copiedCode, setCopiedCode] = useState(false);

  const getCurlCommand = () => {
    const validQuestions = questions.filter(q => q && q.trim().length > 0);
    const bodyObj = {
      documents: documentUrl || "https://hackrx.blob.core.windows.net/assets/policy.pdf",
      questions: validQuestions.length > 0 ? validQuestions : ["What is the maximum limit?"]
    };
    return `curl -X POST '${apiEndpoint}' \\
  -H 'Authorization: Bearer ${bearerToken}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(bodyObj, null, 2)}'`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header & Copy Action */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">API Endpoint: POST /api/v1/hackrx/run</span>
        <button
          onClick={handleCopyCode}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCode ? 'Copied!' : 'Copy cURL Command'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
        {/* Request JSON */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Request Payload (JSON)</div>
          <pre className="text-cyan-300 overflow-x-auto">
            {JSON.stringify({
              documents: documentUrl,
              questions: questions.filter(q => q && q.trim().length > 0)
            }, null, 2)}
          </pre>
        </div>

        {/* Response JSON */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Response Payload (JSON)</div>
          <pre className="text-emerald-400 overflow-x-auto">
            {rawResponse ? JSON.stringify(rawResponse, null, 2) : "// Awaiting pipeline execution..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

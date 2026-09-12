import React from 'react';
import { FileText, Globe, UploadCloud, FileCheck, Trash2 } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../constants/mockData';

export default function DocumentInput({
  inputTab,
  setInputTab,
  documentUrl,
  setDocumentUrl,
  selectedFile,
  setSelectedFile,
  onLoadSample
}) {

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setSelectedFile({
        rawFile: file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.name.split('.').pop().toLowerCase()
      });
      setDocumentUrl(`local://${file.name}`);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100">Step 1: Document Source</h3>
            <p className="text-xs text-slate-400">Provide a document URL or upload a file</p>
          </div>
        </div>

        {/* Input Type Switcher */}
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex text-xs">
          <button
            onClick={() => setInputTab('url')}
            className={`px-3 py-1 rounded-md transition-colors ${
              inputTab === 'url' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            URL Link
          </button>
          <button
            onClick={() => setInputTab('upload')}
            className={`px-3 py-1 rounded-md transition-colors ${
              inputTab === 'upload' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload
          </button>
        </div>
      </div>

      {/* INPUT TAB 1: URL INPUT */}
      {inputTab === 'url' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://example.com/assets/policy.pdf"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
            />
            <Globe className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          <p className="text-xs text-slate-400">
            Paste a public document URL (e.g. direct PDF link or Google Drive share link).
          </p>
        </div>
      )}

      {/* INPUT TAB 2: DRAG & DROP UPLOAD */}
      {inputTab === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center bg-slate-900/50 hover:bg-slate-900/80 transition-all cursor-pointer relative"
        >
          <input
            type="file"
            accept=".pdf,.docx,.eml"
            onChange={handleFileDrop}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
          <p className="text-sm font-semibold text-slate-200">Drag & Drop your document here</p>
          <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, and EML files (Auto-extracts tables)</p>

          {selectedFile && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-left">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-slate-100">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{selectedFile.size} • {selectedFile.type.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

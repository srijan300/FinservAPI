import React from 'react';
import { FileText, Globe, UploadCloud, FileCheck, Trash2, CheckCircle2, FileCode, Loader2 } from 'lucide-react';
import { uploadDocumentFileAPI } from '../services/api';

export default function DocumentInput({
  inputTab,
  setInputTab,
  documentUrl,
  setDocumentUrl,
  selectedFile,
  setSelectedFile,
  onDocumentUploaded
}) {
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const fileData = {
        rawFile: file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.name.split('.').pop().toLowerCase(),
        lastModified: new Date(file.lastModified).toLocaleDateString()
      };
      setSelectedFile(fileData);
      setIsUploading(true);
      try {
        const uploadRes = await uploadDocumentFileAPI(file);
        const uploadedTarget = uploadRes.file_path || uploadRes.url || file.name;
        setDocumentUrl(uploadedTarget);
        if (onDocumentUploaded) {
          onDocumentUploaded(uploadedTarget);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setDocumentUrl(file.name);
        if (onDocumentUploaded) {
          onDocumentUploaded(file.name);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleUrlChange = (e) => {
    setDocumentUrl(e.target.value);
  };

  return (
    <div className="enterprise-panel p-6 rounded-2xl space-y-5">
      
      {/* Header & Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#232736]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-slate-100">Step 1: Document Architecture</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload an enterprise document or connect via URL</p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="inner-box p-1 rounded-xl flex text-xs font-medium shrink-0">
          <button
            onClick={() => setInputTab('upload')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              inputTab === 'upload'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Document Upload</span>
          </button>
          <button
            onClick={() => setInputTab('url')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              inputTab === 'url'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Document URL</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FILE UPLOAD ZONE & DATA TABLE PREVIEW */}
      {inputTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 dark:border-[#232736] hover:border-indigo-500/60 rounded-xl p-5 text-center inner-box hover:bg-slate-100 dark:hover:bg-[#161923] transition-all cursor-pointer relative group"
          >
            <input
              type="file"
              accept=".pdf,.docx,.eml"
              onChange={handleFileDrop}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-full bg-slate-200 dark:bg-[#1A1D27] text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                <UploadCloud className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">Click to upload</span> or drag and drop document
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Supports PDF, DOCX, and EML (Auto-extracts tables & text)</p>
              </div>
            </div>
          </div>

          {/* INTEGRATED FILE DATA TABLE PREVIEW */}
          {selectedFile ? (
            <div className="rounded-xl border border-slate-200 dark:border-[#232736] inner-box overflow-hidden text-xs">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-[#232736] flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Uploaded Document Metadata</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[10px] flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ready for Query</span>
                </span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-[#232736] font-mono">
                <div className="grid grid-cols-12 px-4 py-2 text-slate-500 dark:text-slate-400 text-[11px] font-sans font-semibold">
                  <div className="col-span-5">Filename</div>
                  <div className="col-span-2 text-center">Format</div>
                  <div className="col-span-3 text-right">Size</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
                <div className="grid grid-cols-12 px-4 py-2.5 items-center text-slate-800 dark:text-slate-200">
                  <div className="col-span-5 font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">{selectedFile.name}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#1A1D27] border border-slate-300 dark:border-[#2E3447] text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedFile.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-3 text-right text-slate-500 dark:text-slate-400 text-[11px]">{selectedFile.size}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => { setSelectedFile(null); setDocumentUrl(''); if (onDocumentUploaded) onDocumentUploaded(''); }}
                      className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#232736] text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
              No document uploaded yet. Drag & drop a PDF to inspect metadata table.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENT URL INPUT */}
      {inputTab === 'url' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="url"
              value={documentUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/assets/policy.pdf"
              className="w-full inner-box rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono transition-all"
            />
            <Globe className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supports direct PDF, DOCX, EML URLs or public Google Drive share links.
          </p>
        </div>
      )}

    </div>
  );
}

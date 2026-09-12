import { FileText, Layers, Database, Cpu, Sparkles } from 'lucide-react';

export const SAMPLE_DOCUMENTS = [
  {
    id: 'sample-1',
    name: "Insurance Policy PDF",
    url: "https://hackrx.blob.core.windows.net/assets/policy.pdf",
    type: "pdf",
    questions: [
      "What is the maximum limit for Domiciliary Hospitalisation under Plan A?",
      "For Plan B, what is the daily Hospital Cash allowance and for how many days is it provided?"
    ]
  },
  {
    id: 'sample-2',
    name: "W3C Sample Test PDF",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    type: "pdf",
    questions: [
      "What is the title or description of this document?",
      "Is this document for testing?"
    ]
  },
  {
    id: 'sample-3',
    name: "Financial Quarterly Report",
    url: "https://example.com/assets/financial_report_q3.docx",
    type: "docx",
    questions: [
      "What is the total net revenue reported for Q3?",
      "What are the key risk factors highlighted in section 4?"
    ]
  }
];

export const RAG_STAGES = [
  {
    id: 1,
    name: "Ingestion & Table Parsing",
    tech: "pdfplumber",
    desc: "Extracting raw text & converting embedded PDF tables into Markdown",
    icon: FileText,
    latency: "35ms"
  },
  {
    id: 2,
    name: "Sentence Chunking",
    tech: "NLTK Punkt",
    desc: "Sentence-aware boundary splitting with 300-word window & 50-word overlap",
    icon: Layers,
    latency: "18ms"
  },
  {
    id: 3,
    name: "Fast Vector Retrieval",
    tech: "FAISS + BGE-Small",
    desc: "Embedding passages and retrieving top 12 chunks using IndexFlatIP cosine similarity",
    icon: Database,
    latency: "42ms"
  },
  {
    id: 4,
    name: "Precision Re-Ranking",
    tech: "CrossEncoder ms-marco",
    desc: "Contextual deep cross-encoding rerank to select top 5 most relevant passages",
    icon: Cpu,
    latency: "84ms"
  },
  {
    id: 5,
    name: "Synthesis & Generation",
    tech: "Google Gemini 2.5 Flash",
    desc: "Strictly grounded answer synthesis using top reranked context passages",
    icon: Sparkles,
    latency: "195ms"
  }
];

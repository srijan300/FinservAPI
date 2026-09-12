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
    tech: "Grounded LLM Synthesis",
    desc: "Strictly grounded answer synthesis using top reranked context passages",
    icon: Sparkles,
    latency: "195ms"
  }
];

export const QUESTION_PRESETS = {
  policy: [
    "What is the maximum coverage limit and benefit allowance specified in this policy?",
    "What are the pre-existing conditions, waiting periods, and deductible exclusions?",
    "What is the exact procedure, required documentation, and deadline for filing a claim?"
  ],
  resume: [
    "What are the core technical skills, programming languages, and frameworks highlighted in this profile?",
    "What is the candidate's professional experience background, key project contributions, and achievements?",
    "What are potential areas of improvement, skill gaps, or weak points in this resume?"
  ],
  finance: [
    "What is the total net revenue, gross profit margin, and EBITDA reported in this statement?",
    "What are the primary operational expense categories and key financial risk factors?",
    "What is the forecasted revenue growth rate or guidance outlook for upcoming quarters?"
  ],
  contract: [
    "What are the termination conditions, cure periods, and notice period requirements in this contract?",
    "What are the payment schedules, liability caps, indemnification terms, and confidentiality obligations?",
    "Which jurisdiction or governing law applies to dispute resolution and arbitration?"
  ],
  general: [
    "What is the primary subject matter, key findings, and executive summary of this document?",
    "What are the key statistical metrics, performance benchmarks, or data tables included?",
    "What actionable recommendations, compliance requirements, or conclusions are highlighted?"
  ]
};

export function generateSemanticQuestionsForDocument(fileName = '') {
  const nameLower = fileName ? fileName.toLowerCase() : '';
  
  if (nameLower.includes('resume') || nameLower.includes('cv') || nameLower.includes('profile') || nameLower.includes('bio')) {
    return QUESTION_PRESETS.resume;
  } else if (nameLower.includes('policy') || nameLower.includes('insurance') || nameLower.includes('claim') || nameLower.includes('health') || nameLower.includes('coverage')) {
    return QUESTION_PRESETS.policy;
  } else if (nameLower.includes('finance') || nameLower.includes('report') || nameLower.includes('tax') || nameLower.includes('invoice') || nameLower.includes('q3') || nameLower.includes('earning')) {
    return QUESTION_PRESETS.finance;
  } else if (nameLower.includes('contract') || nameLower.includes('agreement') || nameLower.includes('legal') || nameLower.includes('terms') || nameLower.includes('nda')) {
    return QUESTION_PRESETS.contract;
  } else if (nameLower.includes('drive.google.com') || nameLower.includes('1w_4') || nameLower.includes('hackrx') || nameLower.includes('pdf')) {
    // Smart heuristic for Drive & HackRX links (defaulting to policy/financial QA standard)
    return QUESTION_PRESETS.policy;
  } else {
    return QUESTION_PRESETS.general;
  }
}


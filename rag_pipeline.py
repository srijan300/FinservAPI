# rag_pipeline.py
# This file contains the core logic for the Retrieval-Augmented Generation pipeline
# with table extraction, reranking, caching, and parallel processing.

import os
import re
import requests
import faiss
import torch
torch.set_num_threads(1)
import networkx as nx
import nltk
import numpy as np
import hashlib
import pdfplumber
import docx
import eml_parser
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer, CrossEncoder
from PyPDF2 import PdfReader
from pydantic import BaseModel
from typing import List
import logging
from concurrent.futures import ThreadPoolExecutor

try:
    from groq import Groq
except ImportError:
    Groq = None

# Set up logging

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

nltk.data.path.append('/tmp/nltk_data')

nltk.download("punkt_tab", quiet=True)

class RAGPipeline:
    def __init__(self, groq_api_key: str = None, gemini_api_key: str = None,
                 embed_model_name: str = "all-MiniLM-L6-v2",
                 rerank_model_name: str = None):
        """
        Initializes the RAG pipeline with Groq API as the primary high-speed LLM engine.
        Embedder is lazy-loaded on the first request to guarantee instant startup under 512MB RAM.
        """
        logger.info("Initializing RAG Pipeline with Groq LLM (instant startup)...")
        
        # --- Configuration ---
        self.CHUNK_SIZE = 300
        self.OVERLAP = 50
        self.TOP_K_RETRIEVAL = 12
        self.FINAL_K_RERANK = 5
        self.CACHE_DIR = "cache"

        # --- Model and API Setup ---
        self.groq_client = None
        self.groq_model = "openai/gpt-oss-120b"
        self.groq_fallback_model = "openai/gpt-oss-20b"

        if groq_api_key:
            try:
                if Groq is not None:
                    self.groq_client = Groq(api_key=groq_api_key)
                else:
                    import groq
                    self.groq_client = groq.Groq(api_key=groq_api_key)
                logger.info(f"Configured Groq API client with model: {self.groq_model}.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

        if not self.groq_client:
            raise ValueError("GROQ_API_KEY is required to initialize RAG Pipeline.")
        
        self.embed_model_name = embed_model_name
        self._embedder = None
        self.reranker = None

        # --- State variables ---
        self.chunks = None
        self.faiss_index = None
        self.graph = None
        self.current_doc_url = None
        self.is_ready = False
        os.makedirs(self.CACHE_DIR, exist_ok=True)
        logger.info("RAG Pipeline ready (embedder configured for lazy loading).")

    @property
    def embedder(self):
        """Lazy load SentenceTransformer embedder on demand to preserve startup memory."""
        if self._embedder is None:
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            logger.info(f"Lazy-loading embedding model ({self.embed_model_name}) on device: {device}...")
            self._embedder = SentenceTransformer(self.embed_model_name, device=device)
            logger.info("Embedding model loaded successfully.")
        return self._embedder

    def _hash_url(self, url: str) -> str:
        clean_url = url.replace("local://", "").strip()
        uploads_path = os.path.join(os.path.dirname(__file__), "uploads", os.path.basename(clean_url))
        for p in [url, clean_url, uploads_path]:
            if os.path.exists(p) and os.path.isfile(p):
                mtime = os.path.getmtime(p)
                size = os.path.getsize(p)
                return hashlib.sha256(f"{p}_{mtime}_{size}".encode("utf-8")).hexdigest()
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def _save_cache(self, prefix: str, chunks: list, embeddings: np.ndarray, faiss_index):
        logger.info(f"Saving cache for prefix: {prefix}")
        try:
            os.makedirs(self.CACHE_DIR, exist_ok=True)
            np.save(os.path.join(self.CACHE_DIR, f"{prefix}_embeddings.npy"), embeddings)
            faiss.write_index(faiss_index, os.path.join(self.CACHE_DIR, f"{prefix}_faiss.index"))
            with open(os.path.join(self.CACHE_DIR, f"{prefix}_chunks.txt"), "w", encoding="utf-8") as f:
                f.write("\n".join(chunks))
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")

    def _load_cache(self, prefix: str):
        try:
            logger.info(f"Attempting to load cache for prefix: {prefix}")
            embedding_path = os.path.join(self.CACHE_DIR, f"{prefix}_embeddings.npy")
            faiss_path = os.path.join(self.CACHE_DIR, f"{prefix}_faiss.index")
            chunks_path = os.path.join(self.CACHE_DIR, f"{prefix}_chunks.txt")

            if not (os.path.exists(embedding_path) and os.path.exists(faiss_path) and os.path.exists(chunks_path)):
                logger.info("Cache not found.")
                return None, None, None
            
            embeddings = np.load(embedding_path)
            faiss_index = faiss.read_index(faiss_path)
            with open(chunks_path, "r", encoding="utf-8") as f:
                chunks = f.read().splitlines()
            
            logger.info("Cache loaded successfully.")
            return chunks, embeddings, faiss_index
        except Exception as e:
            logger.warning(f"Cache load skipped due to: {e}")
            return None, None, None

    def _table_to_markdown(self, table_data):
        if not table_data:
            return ""
        num_cols = max(len(row) for row in table_data)
        markdown_string = ""
        header = [(cell if cell is not None else "") for cell in table_data[0]]
        header += [""] * (num_cols - len(header))
        markdown_string += "| " + " | ".join(str(cell).replace("|", "\\|") for cell in header) + " |\n"
        markdown_string += "|" + "|".join(["---"] * num_cols) + "|\n"
        for row in table_data[1:]:
            row = [(cell if cell is not None else "") for cell in row]
            row += [""] * (num_cols - len(row))
            markdown_string += "| " + " | ".join(str(cell).replace("|", "\\|") for cell in row) + " |\n"
        return markdown_string

    def _download_and_extract_text(self, url: str) -> str:
        """
        Downloads a file from a local path or HTTP/HTTPS URL and extracts text content based on its type.
        Supports PDF, DOCX, EML, and Google Drive links.
        """
        logger.info(f"Downloading and extracting text from {url}...")
        
        target_url = url.strip()
        local_path = None
        file_extension = "pdf"

        clean_url = target_url.replace("local://", "")
        uploads_path = os.path.join(os.path.dirname(__file__), "uploads", os.path.basename(clean_url))

        # Check if local path exists (direct, clean, or inside uploads/)
        if os.path.exists(target_url):
            local_path = target_url
            ext = os.path.splitext(target_url)[1].lstrip('.').lower()
            if ext in ['pdf', 'docx', 'eml', 'txt', 'md']:
                file_extension = ext
        elif os.path.exists(clean_url):
            local_path = clean_url
            ext = os.path.splitext(clean_url)[1].lstrip('.').lower()
            if ext in ['pdf', 'docx', 'eml', 'txt', 'md']:
                file_extension = ext
        elif os.path.exists(uploads_path):
            local_path = uploads_path
            ext = os.path.splitext(uploads_path)[1].lstrip('.').lower()
            if ext in ['pdf', 'docx', 'eml', 'txt', 'md']:
                file_extension = ext
        elif target_url.startswith("http://") or target_url.startswith("https://"):
            # Handle Google Drive share links: convert /file/d/FILE_ID/view to direct download link
            drive_match = re.search(r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)', target_url)
            if drive_match:
                file_id = drive_match.group(1)
                target_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                logger.info(f"Converted Google Drive link to direct download URL: {target_url}")

            try:
                response = requests.get(target_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
                if response.status_code == 409:
                    raise ValueError("Public access is not permitted on this URL (HTTP 409). Please upload your document file directly using the File Upload option.")
                elif response.status_code in (401, 403):
                    raise ValueError(f"Access forbidden (HTTP {response.status_code}). Please verify permissions or upload your file directly.")
                elif response.status_code == 404:
                    raise ValueError("Document not found at the specified URL (HTTP 404). Please check the link or upload your file directly.")
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                raise ValueError(f"Failed to download document from URL: {str(e)}. Please check the URL or upload your file directly.")

            # Infer file extension from headers or content
            content_type = response.headers.get("Content-Type", "").lower()
            url_ext = target_url.split('?')[0].split('.')[-1].lower() if '.' in target_url.split('?')[0] else ''
            
            if 'pdf' in content_type or url_ext == 'pdf' or response.content.startswith(b'%PDF'):
                file_extension = 'pdf'
                local_path = os.path.join(self.CACHE_DIR, "temp_downloaded_doc.pdf")
            elif 'word' in content_type or url_ext == 'docx' or response.content.startswith(b'PK'):
                file_extension = 'docx'
                local_path = os.path.join(self.CACHE_DIR, "temp_downloaded_doc.docx")
            elif 'email' in content_type or url_ext == 'eml':
                file_extension = 'eml'
                local_path = os.path.join(self.CACHE_DIR, "temp_downloaded_doc.eml")
            else:
                file_extension = 'pdf' if response.content.startswith(b'%PDF') else url_ext or 'pdf'
                local_path = os.path.join(self.CACHE_DIR, f"temp_downloaded_doc.{file_extension}")

            with open(local_path, "wb") as f:
                f.write(response.content)
        else:
            raise ValueError(f"Document file path or URL not found: '{url}'. Please upload a file or provide a valid URL.")

        full_text = ""
        if file_extension == 'pdf':
            with pdfplumber.open(local_path) as pdf:
                for page in pdf.pages:
                    txt = page.extract_text()
                    if txt:
                        full_text += txt + "\n"
                    for table in page.find_tables():
                        if table.extract():
                            full_text += "\n" + self._table_to_markdown(table.extract()) + "\n"
        
        elif file_extension == 'docx':
            doc = docx.Document(local_path)
            for para in doc.paragraphs:
                full_text += para.text + "\n"
            for table in doc.tables:
                table_data = []
                for row in table.rows:
                    table_data.append([cell.text for cell in row.cells])
                full_text += "\n" + self._table_to_markdown(table_data) + "\n"

        elif file_extension == 'eml':
            with open(local_path, 'rb') as f:
                raw_email = f.read()
            ep = eml_parser.EmlParser()
            parsed_eml = ep.decode_email_bytes(raw_email)
            if parsed_eml.get('body'):
                full_text = parsed_eml['body'][0]['content']

        elif file_extension in ['txt', 'md']:
            with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
                full_text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {file_extension}. Supported formats are PDF, DOCX, EML, TXT, and MD.")

        if not full_text.strip():
            raise ValueError("No text could be extracted from the document. Please ensure the file contains readable text or tables.")
            
        return full_text

    def _chunk_text(self, text: str) -> list[str]:
        logger.info("Performing smart chunking...")
        sentences = nltk.sent_tokenize(text)
        chunks, current_chunk_words, current_length = [], [], 0
        for sentence in sentences:
            words = re.findall(r"\S+", sentence)
            if current_length + len(words) > self.CHUNK_SIZE and current_chunk_words:
                chunks.append(" ".join(current_chunk_words))
                overlap_word_count = int(self.OVERLAP * len(current_chunk_words) / current_length) if current_length > 0 else 0
                current_chunk_words = current_chunk_words[-overlap_word_count:]
                current_length = len(current_chunk_words)
            current_chunk_words.extend(words)
            current_length += len(words)
        if current_chunk_words:
            chunks.append(" ".join(current_chunk_words))
        return chunks

    def _get_embeddings(self, chunks: list[str]) -> np.ndarray:
        return normalize(self.embedder.encode([f"passage: {c}" for c in chunks], convert_to_numpy=True, batch_size=32))

    def _build_faiss(self, embeddings: np.ndarray):
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)
        return index

    def _build_graph(self, chunks: list[str], embeddings: np.ndarray = None):
        """Constructs a fast linear coherence graph connecting adjacent document sections (0.001s)."""
        G = nx.Graph()
        n = len(chunks)
        for i in range(n):
            G.add_node(i, text=chunks[i])
            if i > 0:
                G.add_edge(i, i - 1, weight=1.0)
            if i < n - 1:
                G.add_edge(i, i + 1, weight=1.0)
        return G

    def process_document(self, doc_url: str):
        # If the same document is already loaded in memory, don't re-process
        if getattr(self, "current_doc_url", None) == doc_url and self.is_ready and self.chunks:
            logger.info(f"Document {doc_url} is already active in memory.")
            return

        cache_prefix = self._hash_url(doc_url)
        cached_chunks, cached_embeddings, cached_faiss = self._load_cache(cache_prefix)
        
        if cached_chunks and cached_faiss is not None:
            self.chunks = cached_chunks
            self.faiss_index = cached_faiss
            self.graph = self._build_graph(self.chunks)
        else:
            logger.info(f"Processing new document from {doc_url}...")
            raw_text = self._download_and_extract_text(doc_url)
            self.chunks = self._chunk_text(raw_text)
            embeddings = self._get_embeddings(self.chunks)
            self.faiss_index = self._build_faiss(embeddings)
            self.graph = self._build_graph(self.chunks)
            self._save_cache(cache_prefix, self.chunks, embeddings, self.faiss_index)

        self.current_doc_url = doc_url
        self.is_ready = True
        logger.info(f"--- Document processing complete ({len(self.chunks)} chunks). Pipeline is ready. ---")

    def _generate_heuristic_questions(self, sample_text: str) -> list[str]:
        """Dynamically constructs 3 relevant questions strictly derived from the actual content of the document."""
        if not sample_text or not sample_text.strip():
            return [
                "What are the core topics, objectives, and methodologies covered in this document?",
                "What specific procedures, guidelines, or criteria are detailed?",
                "What are the primary recommendations, findings, and conclusions presented?"
            ]

        lower_text = sample_text.lower()
        if any(w in lower_text for w in ["dsa", "algorithm", "data structure", "placement", "leetcode", "array", "binary tree", "graph", "sorting"]):
            return [
                "What are the primary Data Structures and Algorithms topics emphasized for placement preparation in this guide?",
                "What recommended problem-solving strategies, roadmaps, and practice patterns are outlined?",
                "What are the essential technical interview preparation steps and topic weightages discussed?"
            ]
        elif any(w in lower_text for w in ["resume", "curriculum vitae", "education", "experience", "skills", "projects", "gpa", "bachelor", "master"]):
            return [
                "What are the primary technical skills, key projects, and professional experience highlighted in this profile?",
                "What are the main areas of expertise, educational background, and notable achievements?",
                "What are the key technical competencies, tools, and platforms demonstrated in this document?"
            ]
        elif any(w in lower_text for w in ["financial", "revenue", "balance sheet", "ebitda", "fiscal", "profit", "cash flow"]):
            return [
                "What are the key financial highlights, revenue figures, and operational metrics reported?",
                "What major financial risks, liabilities, or expenditures are highlighted?",
                "What strategic investments and future fiscal projections are detailed?"
            ]
        elif any(w in lower_text for w in ["policy", "coverage", "premium", "deductible", "claim", "insurance"]):
            return [
                "What are the specific coverage terms, benefit limits, and exclusions specified in this policy?",
                "What are the mandatory conditions, waiting periods, and procedures for filing a claim?",
                "What are the obligations, premium payment rules, and renewal terms outlined?"
            ]

        # General documents: extract salient sentences or headings from the actual text
        lines = [line.strip() for line in sample_text.split('\n') if len(line.strip()) > 15 and not line.strip().startswith('|')]
        topic1 = lines[0][:60] if len(lines) > 0 else "the primary subjects"
        topic2 = lines[1][:60] if len(lines) > 1 else "the methodology"
        return [
            f"What are the key requirements and explanations regarding '{topic1}' discussed in this document?",
            f"What are the specific guidelines and recommendations outlined for '{topic2}'?",
            "What are the critical conclusions and next steps presented in this document?"
        ]

    def generate_ai_suggested_questions(self, doc_url: str) -> list[str]:
        """
        Extracts document text from doc_url and uses Groq LLM to dynamically generate
        3 highly relevant, document-specific questions strictly derived from the document content.
        """
        # Always ensure the active pipeline document matches the requested doc_url
        if getattr(self, "current_doc_url", None) != doc_url or not self.chunks or not self.is_ready:
            self.process_document(doc_url)
        
        sample_text = "\n\n".join(self.chunks[:8])[:3500] if self.chunks else ""
        if not sample_text:
            sample_text = self._download_and_extract_text(doc_url)[:3500]

        prompt = f"""You are an expert document analyst. Read the following text excerpt from this uploaded document:

--- DOCUMENT EXCERPT START ---
{sample_text}
--- DOCUMENT EXCERPT END ---

Task: Generate EXACTLY 3 clear, highly relevant evaluation questions that are strictly about the specific topics, concepts, procedures, or facts in THIS document excerpt above.

Rules:
1. Every question must be directly related to the document excerpt above.
2. Return ONLY the 3 questions, each on a new line.
3. Do NOT include numbers (1., 2., 3.), bullet points (*, -), asterisks, or intro/outro commentary.
4. Each question must be a complete sentence ending with a question mark."""

        # 1. Try Groq API models (gpt-oss-120b or fast gpt-oss-20b)
        if self.groq_client:
            logger.info("Generating dynamic AI questions using Groq LLM based on extracted document content...")
            for model_choice in [self.groq_model, self.groq_fallback_model]:
                try:
                    completion = self.groq_client.chat.completions.create(
                        model=model_choice,
                        messages=[
                            {"role": "system", "content": "You are a professional document analyst that returns only exact question lists without numbering, markdown bolding, or commentary."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=600,
                        timeout=25.0
                    )
                    raw_text = completion.choices[0].message.content or ""
                    lines = [line.strip().lstrip('0123456789.-* ') for line in raw_text.strip().split('\n') if line.strip() and '?' in line]
                    if len(lines) >= 3:
                        return lines[:3]
                    elif len(lines) > 0:
                        return lines
                except Exception as groq_err:
                    logger.warning(f"Groq API call ({model_choice}) failed: {groq_err}.")

        logger.info("Using smart document heuristic question generator based on actual document content...")
        return self._generate_heuristic_questions(sample_text)

    def _retrieve_chunks(self, query: str) -> list[str]:
        if not self.is_ready:
            raise RuntimeError("Pipeline not ready.")
        q_embed = normalize(self.embedder.encode([f"query: {query}"], convert_to_numpy=True))
        _, indices = self.faiss_index.search(q_embed, self.TOP_K_RETRIEVAL)
        
        base_indices = set(indices[0])
        for i in indices[0]:
            if self.graph.has_node(i) and list(self.graph.neighbors(i)):
                 base_indices.update(list(self.graph.neighbors(i))[:3])
        
        return [self.chunks[i] for i in sorted(list(base_indices)) if i < len(self.chunks)]

    def _rerank_chunks(self, query: str, candidates: list[str]) -> list[str]:
        if not candidates:
            return []
        if self.reranker is not None:
            try:
                pairs = [(query, passage) for passage in candidates]
                scores = self.reranker.predict(pairs, batch_size=32)
                ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
                return [text for text, _ in ranked[:self.FINAL_K_RERANK]]
            except Exception as e:
                logger.warning(f"CrossEncoder reranking error: {e}. Falling back to cosine ranking.")

        # High-accuracy, memory-free reranking using embedder cosine similarity (0 extra RAM)
        q_embed = normalize(self.embedder.encode([f"query: {query}"], convert_to_numpy=True))
        c_embeds = normalize(self.embedder.encode([f"passage: {c}" for c in candidates], convert_to_numpy=True))
        sims = (q_embed @ c_embeds.T)[0]
        ranked = sorted(zip(candidates, sims), key=lambda x: x[1], reverse=True)
        return [text for text, _ in ranked[:self.FINAL_K_RERANK]]

    def _generate_answer(self, original_query: str, top_chunks: list[str]) -> str:
        context = "\n\n".join(top_chunks)
        prompt = f"""You are an expert document analyst. Answer the question using the following context from the document.
Keep the answer accurate, helpful, and concise based directly on the context.

Context:
{context}

Question:
{original_query}

Answer:"""
        try:
            # 1. Try Groq LLM first
            if self.groq_client:
                for model_choice in [self.groq_model, self.groq_fallback_model]:
                    try:
                        completion = self.groq_client.chat.completions.create(
                            model=model_choice,
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are an intelligent, accurate document analyst and auditor. Answer questions directly using only the provided context. Keep answers clear, factual, and succinct."
                                },
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ],
                            temperature=0.2,
                            max_tokens=600,
                            timeout=25.0
                        )
                        ans = completion.choices[0].message.content
                        if ans and ans.strip():
                            return ans.strip()
                    except Exception as groq_err:
                        logger.warning(f"Groq API call ({model_choice}) failed: {groq_err}.")

            # Fallback to direct chunk retrieval answer if Groq API fails
            formatted_chunks = "\n\n".join([f"> **Excerpt {i+1}**: {chunk[:300]}..." for i, chunk in enumerate(top_chunks[:2])])
            return f"**[Document Grounded Excerpt]**:\n\n{formatted_chunks}"
        except Exception as e:
            logger.error(f"Error during LLM API call: {e}")
            formatted_chunks = "\n\n".join([f"> {c[:250]}..." for c in top_chunks[:2]])
            return f"**[Extracted Document Reference]**:\n\n{formatted_chunks}"

    def _process_single_question(self, question: str) -> str:
        """Helper function to process one question for parallel execution."""
        retrieved = self._retrieve_chunks(question)
        reranked = self._rerank_chunks(question, retrieved)
        answer = self._generate_answer(question, reranked)
        safe_q = question.encode('ascii', 'ignore').decode('ascii')
        safe_a = answer.encode('ascii', 'ignore').decode('ascii')
        logger.info(f"Question-----> {safe_q}")
        logger.info(f"Answer-------> {safe_a[:100]}...")
        return answer

    def answer_questions(self, questions: list[str]) -> list[str]:
        """
        Answers a list of questions in parallel and returns only the answer strings.
        """
        if not self.is_ready:
            raise RuntimeError("Pipeline not ready.")
        
        logger.info(".........ANSWERING QUESTIONS........")
        
        with ThreadPoolExecutor() as executor:
            answers = list(executor.map(self._process_single_question, questions))
            
        return answers
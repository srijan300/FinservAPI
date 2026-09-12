# rag_pipeline.py
# This file contains the core logic for the Retrieval-Augmented Generation pipeline
# with table extraction, reranking, caching, and parallel processing.

import os
import re
import requests
import faiss
import torch
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
from openai import OpenAI
from pydantic import BaseModel
from typing import List
import logging
from concurrent.futures import ThreadPoolExecutor

import google.generativeai as genai

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
    def __init__(self, openai_api_key: str = None, gemini_api_key: str = None,
                 embed_model_name: str = "BAAI/bge-small-en-v1.5",
                 rerank_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        """
        Initializes the RAG pipeline, loading models and setting up configurations.
        Supports both OpenAI and Google Gemini APIs.
        """
        logger.info("Initializing RAG Pipeline with Caching and Reranker...")
        
        # --- Configuration ---
        self.CHUNK_SIZE = 300
        self.OVERLAP = 50
        self.TOP_K_RETRIEVAL = 12
        self.FINAL_K_RERANK = 5
        self.CACHE_DIR = "cache"

        # --- Model and API Setup ---
        self.gemini_model = None
        self.openai_client = None

        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            logger.info("Configured Google Gemini API (gemini-2.5-flash).")
        
        if openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
            logger.info("Configured OpenAI API.")

        if not self.gemini_model and not self.openai_client:
            raise ValueError("Either GEMINI_API_KEY or OPENAI_API_KEY is required.")
        
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Loading models onto device: {device}...")
        self.embedder = SentenceTransformer(embed_model_name, device=device)
        self.reranker = CrossEncoder(rerank_model_name, device=device)
        logger.info("All models loaded.")

        # --- State variables ---
        self.chunks = None
        self.faiss_index = None
        self.graph = None
        self.is_ready = False
        os.makedirs(self.CACHE_DIR, exist_ok=True)
        logger.info("RAG Pipeline initialized.")

    def _hash_url(self, url: str) -> str:
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def _save_cache(self, prefix: str, chunks: list, embeddings: np.ndarray, faiss_index):
        logger.info(f"Saving cache for prefix: {prefix}")
        np.save(os.path.join(self.CACHE_DIR, f"{prefix}_embeddings.npy"), embeddings)
        faiss.write_index(faiss_index, os.path.join(self.CACHE_DIR, f"{prefix}_faiss.index"))
        with open(os.path.join(self.CACHE_DIR, f"{prefix}_chunks.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(chunks))

    def _load_cache(self, prefix: str):
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
            if ext in ['pdf', 'docx', 'eml']:
                file_extension = ext
        elif os.path.exists(clean_url):
            local_path = clean_url
            ext = os.path.splitext(clean_url)[1].lstrip('.').lower()
            if ext in ['pdf', 'docx', 'eml']:
                file_extension = ext
        elif os.path.exists(uploads_path):
            local_path = uploads_path
            ext = os.path.splitext(uploads_path)[1].lstrip('.').lower()
            if ext in ['pdf', 'docx', 'eml']:
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

        else:
            raise ValueError(f"Unsupported file type: {file_extension}. Supported formats are PDF, DOCX, and EML.")

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

    def _build_graph(self, chunks: list[str], embeddings: np.ndarray):
        G = nx.Graph()
        for i, text in enumerate(chunks):
            G.add_node(i, text=text)
        sim_matrix = cosine_similarity(embeddings)
        for i in range(len(chunks)):
            for j in range(i + 1, len(chunks)):
                if sim_matrix[i][j] > 0.75:
                    G.add_edge(i, j, weight=sim_matrix[i][j])
        return G

    def process_document(self, doc_url: str):
        cache_prefix = self._hash_url(doc_url)
        cached_chunks, cached_embeddings, cached_faiss = self._load_cache(cache_prefix)
        
        if cached_chunks and cached_faiss is not None:
            self.chunks = cached_chunks
            self.faiss_index = cached_faiss
            self.graph = self._build_graph(self.chunks, cached_embeddings)
        else:
            logger.info("Cache not found, processing document from scratch...")
            raw_text = self._download_and_extract_text(doc_url)
            self.chunks = self._chunk_text(raw_text)
            embeddings = self._get_embeddings(self.chunks)
            self.faiss_index = self._build_faiss(embeddings)
            self.graph = self._build_graph(self.chunks, embeddings)
            self._save_cache(cache_prefix, self.chunks, embeddings, self.faiss_index)

        self.is_ready = True
        logger.info("--- Document processing complete. Pipeline is ready. ---")

    def _generate_heuristic_questions(self, sample_text: str) -> list[str]:
        """Generates document-tailored questions when LLM APIs are offline or missing credits."""
        lower_text = sample_text.lower()
        q1 = "What are the primary coverage terms, benefit limits, and exclusions outlined in this document?"
        q2 = "What is the mandatory process and criteria required for filing a claim or request?"
        q3 = "What are the effective terms, payment conditions, and policy obligations specified?"

        if "insurance" in lower_text or "policy" in lower_text or "coverage" in lower_text:
            q1 = "What are the specific coverage limits, deductibles, and exclusions specified under this policy?"
            q2 = "What are the waiting periods and mandatory conditions for claim eligibility?"
            q3 = "What are the terms regarding premium payments, policy renewal, and cancellation?"
        elif "financial" in lower_text or "revenue" in lower_text or "balance" in lower_text:
            q1 = "What are the key financial highlights and net revenue figures reported?"
            q2 = "What major financial risks or liabilities are highlighted in the report?"
            q3 = "What strategic investments or operational expenses are detailed?"

        return [q1, q2, q3]

    def generate_ai_suggested_questions(self, doc_url: str) -> list[str]:
        """
        Extracts document text from doc_url and uses LLM to dynamically generate
        3 highly relevant, document-specific questions.
        Falls back to document-extracted heuristic questions if LLM keys are invalid or out of quota.
        """
        try:
            if not self.chunks or not self.is_ready:
                self.process_document(doc_url)
            
            sample_text = "\n\n".join(self.chunks[:6]) if self.chunks else ""
            if not sample_text:
                sample_text = self._download_and_extract_text(doc_url)[:2000]

            prompt = f"""You are an expert document analyst. Read the following excerpt from a document and generate 3 clear, highly relevant, specific evaluation questions that an auditor or executive would ask about this specific document.

Document Excerpt:
{sample_text[:2500]}

Format requirements:
- Return EXACTLY 3 questions.
- Each question must be on a new line.
- Do NOT include numbers, bullet points, asterisks, or extra intro text.
- Each question must be a complete sentence ending with a question mark."""

            logger.info("Generating dynamic AI questions using LLM based on extracted document content...")
            if self.gemini_model:
                try:
                    response = self.gemini_model.generate_content(prompt)
                    lines = [line.strip().lstrip('123456789.-* ') for line in response.text.strip().split('\n') if line.strip() and '?' in line]
                    if len(lines) >= 3:
                        return lines[:3]
                    elif len(lines) > 0:
                        return lines
                except Exception as gemini_err:
                    logger.warning(f"Gemini API failed: {gemini_err}. Trying OpenAI fallback...")

            if self.openai_client:
                try:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                    )
                    lines = [line.strip().lstrip('123456789.-* ') for line in response.choices[0].message.content.strip().split('\n') if line.strip() and '?' in line]
                    if len(lines) >= 3:
                        return lines[:3]
                    elif len(lines) > 0:
                        return lines
                except Exception as openai_err:
                    logger.warning(f"OpenAI API failed: {openai_err}. Using heuristic fallback...")

            logger.info("Using smart document heuristic question generator...")
            return self._generate_heuristic_questions(sample_text)
        except Exception as e:
            logger.error(f"Error in question generation pipeline: {e}")
            return self._generate_heuristic_questions("document insurance policy terms coverage")

    def _retrieve_chunks(self, query: str) -> list[str]:
        if not self.is_ready:
            raise RuntimeError("Pipeline not ready.")
        q_embed = normalize(self.embedder.encode([f"query: {query}"], convert_to_numpy=True))
        _, indices = self.faiss_index.search(q_embed, self.TOP_K_RETRIEVAL)
        
        base_indices = set(indices[0])
        for i in indices[0]:
            if self.graph.has_node(i) and list(self.graph.neighbors(i)):
                 base_indices.update(list(self.graph.neighbors(i))[:3])
        
        return [self.chunks[i] for i in sorted(list(base_indices))]

    def _rerank_chunks(self, query: str, candidates: list[str]) -> list[str]:
        pairs = [(query, passage) for passage in candidates]
        scores = self.reranker.predict(pairs, batch_size=32)
        ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
        return [text for text, _ in ranked[:self.FINAL_K_RERANK]]

    def _generate_answer(self, original_query: str, top_chunks: list[str]) -> str:
        context = "\n\n".join(top_chunks)
        prompt = f"""You are answering a question using the following context from an insurance policy. 
Don't use knowledge which is not in the context. Keep the answer brief.

Context:
{context}

Question:
{original_query}

Answer:"""
        try:
            if self.gemini_model:
                try:
                    response = self.gemini_model.generate_content(prompt)
                    return response.text.strip()
                except Exception as gemini_err:
                    logger.warning(f"Gemini API failed: {gemini_err}. Trying OpenAI fallback...")

            if self.openai_client:
                try:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.0,
                    )
                    return response.choices[0].message.content.strip()
                except Exception as openai_err:
                    logger.warning(f"OpenAI API failed: {openai_err}.")

            # Fallback to direct chunk retrieval answer if LLM APIs fail
            formatted_chunks = "\n\n".join([f"> **Excerpt {i+1}**: {chunk[:300]}..." for i, chunk in enumerate(top_chunks[:2])])
            return f"**[Document Grounded Excerpt]** *(LLM API offline/quota limit)*:\n\n{formatted_chunks}"
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
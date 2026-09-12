/**
 * Service layer for interacting with FinServe RAG API backend.
 */
export async function runSubmissionAPI({ endpoint, token, documentUrl, questions }) {
  const validQuestions = questions.filter(q => q && q.trim().length > 0);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      documents: documentUrl,
      questions: validQuestions
    })
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}). Please check backend service logs.`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.detail || `Server error ${response.status}`);
  }

  return data;
}

/**
 * Fetch dynamic AI-generated questions from backend Gemini LLM based on extracted document text.
 */
export async function suggestQuestionsAPI(documentUrl) {
  const baseUrl = window.location.origin.includes('http') && !window.location.origin.includes('5173') ? window.location.origin : 'http://127.0.0.1:8000';
  const response = await fetch(`${baseUrl}/api/v1/suggest-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documents: documentUrl })
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}). Please check backend service logs.`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.detail || `Failed to generate AI questions (${response.status})`);
  }

  return data.questions;
}

/**
 * Upload a document file (PDF, DOCX, EML) to backend for live parsing.
 */
export async function uploadDocumentFileAPI(rawFile) {
  const formData = new FormData();
  formData.append('file', rawFile);
  const baseUrl = window.location.origin.includes('http') && !window.location.origin.includes('5173') ? window.location.origin : 'http://127.0.0.1:8000';

  const response = await fetch(`${baseUrl}/api/v1/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'File upload failed');
  }

  return data;
}

/**
 * Generate simulated demo simulation results for offline testing.
 */
export function generateDemoSimulationAnswers(questions) {
  const answers = questions.map((q) => {
    const query = q.toLowerCase();
    if (query.includes("domiciliary")) {
      return "Under Plan A, the maximum limit for Domiciliary Hospitalisation is up to INR 1,00,000, provided treatment continues for at least 3 consecutive days.";
    } else if (query.includes("cash") || query.includes("allowance")) {
      return "Under Plan B, the daily Hospital Cash allowance is INR 1,000 per day, provided for a maximum limit of up to 5 days per hospitalization event.";
    } else if (query.includes("title") || query.includes("description")) {
      return "The document is titled 'Dummy PDF file', created as a standardized test file for automated parser verification.";
    } else {
      return `Based on the retrieved document context, ${q.replace('?', '')} is explicitly governed under Section 4.2 with full coverage subject to standard waiting periods.`;
    }
  });

  return {
    answers,
    explainability: questions.map((q, idx) => ({
      question: q,
      confidence: "98.4%",
      chunks: [
        { index: idx * 4 + 2, score: "+8.42", text: "Under Plan A, Domiciliary Hospitalisation benefit coverage extends up to a maximum financial limit of INR 1,00,000 per policy year." },
        { index: idx * 4 + 3, score: "+7.15", text: "Plan B Hospital Cash Allowance is fixed at INR 1,000 per 24-hour day up to a maximum cap of 5 days." },
        { index: idx * 4 + 4, score: "+5.89", text: "General Policy Exclusions: Pre-existing conditions waiting period of 24 months applies unless explicitly endorsed." }
      ]
    }))
  };
}

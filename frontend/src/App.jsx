import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import DocumentInput from './components/DocumentInput';
import QuestionBuilder from './components/QuestionBuilder';
import PipelineVisualizer from './components/PipelineVisualizer';
import ResultsPanel from './components/ResultsPanel';
import Footer from './components/Footer';

import { runSubmissionAPI, uploadDocumentFileAPI, suggestQuestionsAPI, generateDemoSimulationAnswers } from './services/api';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');
  
  // Execution Mode: default to 'live' for real backend & actual file parsing
  const [executionMode, setExecutionMode] = useState('live');
  
  // API Config State
  const [apiEndpoint, setApiEndpoint] = useState(() => {
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('5173')) {
      return `${window.location.origin}/api/v1/hackrx/run`;
    }
    return 'http://localhost:8000/api/v1/hackrx/run';
  });
  const [bearerToken, setBearerToken] = useState('128c33fc16f4a70cab19dab48958d5bf246e7003a8bfd7eb0be2f617b48e662a');
  
  // Document Input State (Default to File Upload tab and empty inputs)
  const [inputTab, setInputTab] = useState('upload');
  const [documentUrl, setDocumentUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Questions State
  const [questions, setQuestions] = useState(['']);
  
  // Execution & Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Results State
  const [results, setResults] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  // Toggle Theme Class on HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handler to auto-generate LIVE AI questions by sending document text to Gemini LLM
  const handleSuggestQuestions = async () => {
    setErrorDetails(null);
    let targetDocUrl = documentUrl ? documentUrl.trim() : '';

    if (inputTab === 'upload' && selectedFile?.rawFile) {
      try {
        setIsSuggesting(true);
        const uploadRes = await uploadDocumentFileAPI(selectedFile.rawFile);
        targetDocUrl = uploadRes.file_path || uploadRes.url;
      } catch (err) {
        setIsSuggesting(false);
        setErrorDetails(`⚠️ Failed to upload file for AI analysis: ${err.message}`);
        return;
      }
    }

    if (!targetDocUrl) {
      setErrorDetails("⚠️ Please upload a document file (PDF, DOCX, EML) or enter a document URL first to generate AI questions.");
      return;
    }

    try {
      setIsSuggesting(true);
      const aiQuestions = await suggestQuestionsAPI(targetDocUrl);
      if (aiQuestions && aiQuestions.length > 0) {
        setQuestions(aiQuestions);
      } else {
        setErrorDetails("⚠️ LLM did not return questions for this document. Please try typing a custom question.");
      }
    } catch (err) {
      setErrorDetails(err.message || "⚠️ Google Gemini API Free-Tier Quota Limit Reached (429). Please wait 10-15 seconds before trying again.");
    } finally {
      setIsSuggesting(false);
    }
  };

  // Run RAG Pipeline Execution
  const handleRunPipeline = async () => {
    setErrorDetails(null);

    // Document Validation
    if (inputTab === 'upload' && !selectedFile?.rawFile) {
      setErrorDetails("⚠️ Please upload a document file (PDF, DOCX, or EML) using the drag-and-drop zone below.");
      return;
    }
    if (inputTab === 'url' && (!documentUrl || !documentUrl.trim())) {
      setErrorDetails("⚠️ Please enter a valid document URL or switch to the 'File Upload' tab.");
      return;
    }

    // Question Validation
    const validQuestions = questions.filter(q => q && q.trim().length > 0);
    if (validQuestions.length === 0) {
      setErrorDetails("⚠️ Please enter at least one question to analyze your document.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setResults(null);
    setRawResponse(null);

    if (executionMode === 'demo') {
      // Step-by-step animated simulation
      for (let step = 1; step <= 5; step++) {
        setCurrentStep(step);
        await new Promise((res) => setTimeout(res, 450));
      }

      const sim = generateDemoSimulationAnswers(validQuestions);
      setResults(sim.answers);
      setRawResponse({ answers: sim.answers });
      setIsProcessing(false);
      setCurrentStep(5);
    } else {
      // Live Backend Endpoint API Execution
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 300);

      try {
        let finalDocUrl = documentUrl.trim();

        // If user uploaded a local file (PDF/DOCX/EML), upload it live to backend
        if (inputTab === 'upload' && selectedFile?.rawFile) {
          const uploadRes = await uploadDocumentFileAPI(selectedFile.rawFile);
          finalDocUrl = uploadRes.file_path || uploadRes.url;
        }

        if (!finalDocUrl) {
          setErrorDetails("⚠️ Document source invalid. Please upload a file or enter a document URL.");
          setIsProcessing(false);
          clearInterval(stepInterval);
          return;
        }

        const data = await runSubmissionAPI({
          endpoint: apiEndpoint,
          token: bearerToken,
          documentUrl: finalDocUrl,
          questions: validQuestions
        });

        clearInterval(stepInterval);
        setCurrentStep(5);
        setRawResponse(data);

        if (data && data.answers) {
          setResults(data.answers);
        } else {
          setErrorDetails(data.detail || "Error processing request on backend server.");
        }
      } catch (err) {
        clearInterval(stepInterval);
        setErrorDetails(err.message || `Failed to connect to backend at ${apiEndpoint}. Make sure Uvicorn is running.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#090A0F] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      
      {/* 1. Executive Navigation Bar */}
      <Header
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Hero Header */}
        <HeroSection />

        {/* 3. Structured Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Inputs & Questions (Span 12 cols when idle, 7 cols when active) */}
          <div className={isProcessing || currentStep > 0 ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
            <DocumentInput
              inputTab={inputTab}
              setInputTab={setInputTab}
              documentUrl={documentUrl}
              setDocumentUrl={setDocumentUrl}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
            />

            <QuestionBuilder
              questions={questions}
              setQuestions={setQuestions}
              onRunPipeline={handleRunPipeline}
              onSuggestQuestions={() => handleSuggestQuestions()}
              isProcessing={isProcessing}
              isSuggesting={isSuggesting}
              currentStep={currentStep}
            />
          </div>

          {/* Live RAG Execution Stepper (Appears on right side when user clicks Run Pipeline) */}
          {(isProcessing || currentStep > 0) && (
            <div className="lg:col-span-5 space-y-6 transition-all duration-300">
              <PipelineVisualizer
                isProcessing={isProcessing}
                currentStep={currentStep}
              />
            </div>
          )}

        </div>

        {/* 4. Output Results & Explainability Panel (Appears upon pipeline completion or error) */}
        {(results || errorDetails) && (
          <div className="pt-4">
            <ResultsPanel
              results={results}
              questions={questions}
              rawResponse={rawResponse}
              errorDetails={errorDetails}
              documentUrl={documentUrl}
              apiEndpoint={apiEndpoint}
              bearerToken={bearerToken}
            />
          </div>
        )}

      </main>

      {/* 5. Minimal Footer */}
      <Footer />

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import DocumentInput from './components/DocumentInput';
import QuestionBuilder from './components/QuestionBuilder';
import PipelineVisualizer from './components/PipelineVisualizer';
import ResultsPanel from './components/ResultsPanel';
import Footer from './components/Footer';

import { SAMPLE_DOCUMENTS } from './constants/mockData';
import { runSubmissionAPI, uploadDocumentFileAPI, generateDemoSimulationAnswers } from './services/api';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');
  
  // Execution Mode: default to 'live' for real backend & actual file parsing
  const [executionMode, setExecutionMode] = useState('live');
  
  // API Config State
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:8000/api/v1/hackrx/run');
  const [bearerToken, setBearerToken] = useState('128c33fc16f4a70cab19dab48958d5bf246e7003a8bfd7eb0be2f617b48e662a');
  
  // Document Input State
  const [inputTab, setInputTab] = useState('url');
  const [documentUrl, setDocumentUrl] = useState(SAMPLE_DOCUMENTS[0].url);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Questions State
  const [questions, setQuestions] = useState(SAMPLE_DOCUMENTS[0].questions);
  
  // Execution & Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Load Sample Preset
  const handleLoadSample = (sample) => {
    setDocumentUrl(sample.url);
    setQuestions([...sample.questions]);
    setSelectedFile(null);
  };

  // Run RAG Pipeline Execution
  const handleRunPipeline = async () => {
    const validQuestions = questions.filter(q => q && q.trim().length > 0);
    if (validQuestions.length === 0) {
      alert("Please enter at least one question.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setResults(null);
    setRawResponse(null);
    setErrorDetails(null);

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
        let finalDocUrl = documentUrl;

        // If user uploaded a local file (PDF/DOCX/EML), upload it live to backend
        if (inputTab === 'upload' && selectedFile?.rawFile) {
          const uploadRes = await uploadDocumentFileAPI(selectedFile.rawFile);
          finalDocUrl = uploadRes.file_path || uploadRes.url;
        }

        if (!finalDocUrl) {
          alert("Please enter a valid document URL or select a file.");
          setIsProcessing(false);
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      
      {/* Background Glow Overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* 1. Header Navigation */}
      <Header
        theme={theme}
        setTheme={setTheme}
        executionMode={executionMode}
        setExecutionMode={setExecutionMode}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Hero Section */}
        <HeroSection />

        {/* Workspace 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs & Questions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <DocumentInput
              inputTab={inputTab}
              setInputTab={setInputTab}
              documentUrl={documentUrl}
              setDocumentUrl={setDocumentUrl}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              onLoadSample={handleLoadSample}
            />

            <QuestionBuilder
              questions={questions}
              setQuestions={setQuestions}
              onRunPipeline={handleRunPipeline}
              isProcessing={isProcessing}
              currentStep={currentStep}
            />
          </div>

          {/* Right Column: Workflow Stepper Visualizer (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <PipelineVisualizer
              isProcessing={isProcessing}
              currentStep={currentStep}
              executionMode={executionMode}
              apiEndpoint={apiEndpoint}
              setApiEndpoint={setApiEndpoint}
              bearerToken={bearerToken}
              setBearerToken={setBearerToken}
            />
          </div>

        </div>

        {/* 3. Output Results & Explainability Panel */}
        {(results || errorDetails || isProcessing) && (
          <ResultsPanel
            results={results}
            questions={questions}
            rawResponse={rawResponse}
            errorDetails={errorDetails}
            documentUrl={documentUrl}
            apiEndpoint={apiEndpoint}
            bearerToken={bearerToken}
          />
        )}

      </main>

      {/* 4. Footer */}
      <Footer />

    </div>
  );
}

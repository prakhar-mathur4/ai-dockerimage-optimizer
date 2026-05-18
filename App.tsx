
import React, { useState, useEffect } from 'react';
import { optimizeDockerfile } from './services/optimizerService';
import { OptimizationResult } from './types';
import CodeBlock from './components/CodeBlock';
import logo from './logo.png';

const App: React.FC = () => {
  const [input, setInput] = useState<string>(`# Example inefficient Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]`);
  
  const [output, setOutput] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dockerfile' | 'yaml'>('dockerfile');
  const [metadata, setMetadata] = useState<{ name: string } | null>(null);

  // Load metadata dynamically to avoid import specifier issues
  useEffect(() => {
    fetch('./metadata.json')
      .then(res => res.json())
      .then(data => setMetadata({ name: data?.name || 'Docker Optimizer AI' }))
      .catch(err => {
        console.error("Failed to load metadata:", err);
        setError("Configuration error: Could not load metadata.json");
      });
  }, []);

  const handleOptimize = async () => {
    if (!input.trim()) {
      setError("Please provide a Dockerfile to optimize.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await optimizeDockerfile({ dockerfile: input });
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const toJsonReport = (res: OptimizationResult): string => {
    return JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        app: metadata?.name || 'Docker Optimizer AI',
        inputDockerfile: input,
        result: res,
      },
      null,
      2
    );
  };

  const toYaml = (res: OptimizationResult): string => {
    const sanitize = (str: string) => str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `---
metadata:
  app: "${metadata?.name || 'Docker Optimizer'}"
  version: "2.0"

summary:
  confidence: "${res.confidence}"
  score_before: ${res.ruleChecks.before.score}
  score_after: ${res.ruleChecks.after.score}
  strategy: "${sanitize(res.explanation)}"
  total_improvements: ${res.improvements.length}

key_improvements:
${res.improvements.map(i => `  - "${sanitize(i)}"`).join('\n')}

changes_reference:
${res.detailedChanges.map(c => `  - original: "${sanitize(c.original)}"
    optimized: "${sanitize(c.optimized)}"
    reason: "${sanitize(c.reason)}"`).join('\n')}

risk_notes:
${res.riskNotes.map(note => `  - "${sanitize(note)}"`).join('\n')}

optimized_content: |
${res.optimizedDockerfile.split('\n').map(line => '  ' + line).join('\n')}
`;
  };

  const downloadFile = (filename: string, content: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDockerfile = () => {
    if (!output) return;
    downloadFile('Dockerfile.optimized', output.optimizedDockerfile, 'text/x-dockerfile');
  };

  const handleDownloadJsonReport = () => {
    if (!output) return;
    downloadFile('dockerfile-optimization-report.json', toJsonReport(output), 'application/json');
  };

  const getFriendlyErrorTitle = (message: string): string => {
    if (/Too many requests/i.test(message)) return 'Rate Limit Reached';
    if (/Missing GROQ_API_KEY/i.test(message)) return 'Server Configuration Error';
    if (/exceeds/i.test(message)) return 'Input Too Large';
    if (/Optimization failed/i.test(message)) return 'Model Request Failed';
    return 'Optimization Error';
  };

  const getFriendlyErrorHint = (message: string): string => {
    if (/Too many requests/i.test(message)) return 'Wait for a minute and retry.';
    if (/Missing GROQ_API_KEY/i.test(message)) return 'Set GROQ_API_KEY in server environment and restart.';
    if (/exceeds/i.test(message)) return 'Try a shorter Dockerfile input.';
    if (/Optimization failed/i.test(message)) return 'Retry the request. If it repeats, check provider/model settings.';
    return 'Retry once. If issue continues, check server logs.';
  };

  const handleClear = () => {
    setInput('');
    setOutput(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Docker Optimizer AI Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg border border-slate-700"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Docker Optimizer AI</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none mt-1">
                {metadata?.name || 'Loading Config...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClear}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={handleOptimize}
              disabled={isLoading}
              className={`relative overflow-hidden group px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98]'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Optimizing...
                  </>
                ) : 'Optimize & Analyze'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Pane */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Raw Dockerfile</h2>
          </div>
          <CodeBlock 
            code={input} 
            onChange={setInput} 
            label="Input" 
            placeholder="# Paste your Dockerfile here..."
          />
        </section>

        {/* Output Pane */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Optimized Output</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button
                    onClick={handleDownloadDockerfile}
                    className="px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-md border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                  >
                    Download Dockerfile
                  </button>
                  <button
                    onClick={handleDownloadJsonReport}
                    className="px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-md border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                  >
                    Download JSON
                  </button>
                </>
              )}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 shadow-inner">
                <button 
                  onClick={() => setViewMode('dockerfile')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'dockerfile' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Dockerfile
                </button>
                <button 
                  onClick={() => setViewMode('yaml')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'yaml' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  YAML Report
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-amber-300/80 bg-amber-900/10 border border-amber-500/20 rounded-lg px-3 py-2">
            AI recommendation only. Runtime build is not verified in this tool.
          </p>
          <CodeBlock 
            code={output ? (viewMode === 'dockerfile' ? output.optimizedDockerfile : toYaml(output)) : ''} 
            label={viewMode === 'dockerfile' ? 'Docker Output' : 'YAML Analysis'} 
            readOnly 
          />
        </section>

        {/* Changes Reference & Explanations */}
        <div className="lg:col-span-2 space-y-8 mt-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              <div className="flex gap-3 items-start">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="flex-1">
                  <p className="font-semibold">{getFriendlyErrorTitle(error)}</p>
                  <p className="mt-1 text-red-200/90">{error}</p>
                  <p className="mt-1 text-red-200/70 text-xs">{getFriendlyErrorHint(error)}</p>
                </div>
                <button
                  onClick={handleOptimize}
                  disabled={isLoading || !input.trim()}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors ${
                    isLoading || !input.trim()
                      ? 'border-red-900 text-red-800 cursor-not-allowed'
                      : 'border-red-400/40 text-red-100 hover:bg-red-500/20'
                  }`}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-200 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin"></div>
                <span>Analyzing Dockerfile and generating optimized output...</span>
              </div>
            </div>
          )}

          {output && (
            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Detailed Changes Log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
                  <h3 className="font-bold text-indigo-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Refactored Logic Reference
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950/50">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Original</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Optimized</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {output.detailedChanges.map((change, idx) => (
                        <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <code className="text-[11px] text-red-400 bg-red-400/5 px-2 py-1 rounded font-mono whitespace-pre-wrap break-all block">
                              {change.original}
                            </code>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <code className="text-[11px] text-emerald-400 bg-emerald-400/5 px-2 py-1 rounded font-mono whitespace-pre-wrap break-all block">
                              {change.optimized}
                            </code>
                          </td>
                          <td className="px-6 py-4 align-top text-xs text-slate-400 leading-relaxed italic">
                            {change.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                  <h3 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-widest">Key Improvements</h3>
                  <ul className="space-y-3">
                    {output.improvements.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-300">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {output.riskNotes.length > 0 && (
                <div className="p-6 bg-rose-900/10 border border-rose-500/20 rounded-2xl">
                  <h3 className="text-sm font-bold text-rose-300 mb-4 uppercase tracking-widest">Risk Notes</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {output.riskNotes.map((note, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-rose-400">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!output && !isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-900 rounded-3xl group transition-all hover:border-indigo-500/30">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 mb-6 group-hover:text-indigo-500 transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">DevOps Engine Primed</h3>
              <p className="text-slate-600 text-sm max-w-xs mx-auto">
                Paste a Dockerfile and get best-practices optimization suggestions with static quality checks.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-slate-900 mt-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          <span>&copy; {new Date().getFullYear()} Docker Optimizer AI</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Stateless API mode active
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;

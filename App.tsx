
import React, { useState, useEffect } from 'react';
import { optimizeDockerfile } from './services/geminiService';
import { OptimizationResult, DetailedChange } from './types';
import CodeBlock from './components/CodeBlock';

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
  const [metadata, setMetadata] = useState<{ name: string; systemPrompt: string } | null>(null);

  // Load metadata dynamically to avoid import specifier issues
  useEffect(() => {
    fetch('./metadata.json')
      .then(res => res.json())
      .then(data => setMetadata(data))
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
    if (!metadata) {
      setError("System prompt not loaded yet.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await optimizeDockerfile(input, metadata.systemPrompt);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const toYaml = (res: OptimizationResult): string => {
    const sanitize = (str: string) => str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `---
metadata:
  app: "${metadata?.name || 'Docker Optimizer'}"
  version: "1.1"

summary:
  strategy: "${sanitize(res.explanation)}"
  total_improvements: ${res.improvements.length}

key_improvements:
${res.improvements.map(i => `  - "${sanitize(i)}"`).join('\n')}

changes_reference:
${res.detailedChanges.map(c => `  - original: "${sanitize(c.original)}"
    optimized: "${sanitize(c.optimized)}"
    reason: "${sanitize(c.reason)}"`).join('\n')}

optimized_content: |
${res.optimizedDockerfile.split('\n').map(line => '  ' + line).join('\n')}
`;
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
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
              disabled={isLoading || !metadata}
              className={`relative overflow-hidden group px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isLoading || !metadata
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
          <CodeBlock 
            code={output ? (viewMode === 'dockerfile' ? output.optimizedDockerfile : toYaml(output)) : ''} 
            label={viewMode === 'dockerfile' ? 'Docker Output' : 'YAML Analysis'} 
            readOnly 
          />
        </section>

        {/* Changes Reference & Explanations */}
        <div className="lg:col-span-2 space-y-8 mt-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex gap-3 items-center">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
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
                            <code className="text-[11px] text-red-400 bg-red-400/5 px-2 py-1 rounded font-mono break-all block">
                              {change.original}
                            </code>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <code className="text-[11px] text-emerald-400 bg-emerald-400/5 px-2 py-1 rounded font-mono break-all block">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl">
                  <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-widest">Optimization Strategy</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {output.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!output && !isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-900 rounded-3xl group transition-all hover:border-indigo-500/30">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 mb-6 group-hover:text-indigo-500 transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">DevOps Engine Primed</h3>
              <p className="text-slate-600 text-sm max-w-xs mx-auto">
                Paste a Dockerfile and let the Gemini AI analyze your container architecture for production readiness.
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
            System Prompt Active from metadata
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;

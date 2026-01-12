
import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  label?: string;
  readOnly?: boolean;
  onChange?: (val: string) => void;
  placeholder?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, label, readOnly = false, onChange, placeholder }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {code && (
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-indigo-600 transition-colors text-slate-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="relative flex-grow">
        {readOnly ? (
          <pre className="p-4 font-mono text-sm text-indigo-300 whitespace-pre-wrap h-[500px] overflow-auto custom-scrollbar">
            {code || '// Optimization result will appear here...'}
          </pre>
        ) : (
          <textarea
            value={code}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="w-full h-[500px] p-4 font-mono text-sm bg-slate-900 text-slate-100 outline-none resize-none placeholder-slate-600 custom-scrollbar"
          />
        )}
      </div>
    </div>
  );
};

export default CodeBlock;

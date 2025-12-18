import React from 'react';
import ReactMarkdown from 'react-markdown';
import { UsageStats } from '../types';

interface ReportViewProps {
  content: string;
  onReset: () => void;
  usage: UsageStats | null;
  analysisDate?: string; // Add optional date prop
}

const ReportView: React.FC<ReportViewProps> = ({ content, onReset, usage, analysisDate }) => {
  const handlePrint = () => {
    window.print();
  };

  // Format YYYY-MM to Readable String
  const dateDisplay = analysisDate 
    ? new Date(analysisDate + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase()
    : "SEPTEMBER 2025";

  return (
    <div className="w-full min-h-screen pb-20">
      
      {/* Floating Action Bar (Screen Only) */}
      <div className="no-print fixed top-6 right-6 z-50 flex gap-4">
        <button 
          onClick={onReset}
          className="bg-midnight/80 backdrop-blur text-gold border border-gold/30 px-6 py-2 rounded font-cinzel hover:bg-gold/10 transition-all"
        >
          New Client
        </button>
        <button 
          onClick={handlePrint}
          className="bg-gold text-midnight px-8 py-2 rounded font-cinzel font-bold hover:bg-gold-light transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          Export PDF / Print
        </button>
      </div>

      {/* Report Container */}
      <div className="report-container max-w-[23cm] mx-auto bg-parchment text-charcoal shadow-2xl min-h-[29.7cm] p-[2.5cm]">
        
        {/* Header Decoration */}
        <div className="text-center mb-16 border-b-2 border-gold pb-8 relative">
           <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-6">
             <span className="text-6xl text-gold">✦</span>
           </div>
           <h1 className="font-cinzel text-5xl md:text-7xl font-bold text-midnight tracking-widest mb-4 uppercase">
             Cosmography Report
           </h1>
           <p className="font-serif italic text-gold-dim text-2xl">
             Prepared by Natalie Lau
           </p>
           <p className="font-cinzel text-base tracking-[0.3em] text-gray-400 mt-3 uppercase">
             {dateDisplay} • Confidential Insight
           </p>
        </div>

        {/* Content */}
        <div className="prose prose-xl max-w-none font-serif text-justify leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="font-cinzel text-5xl text-midnight border-b border-gold/30 pb-4 mt-20 mb-10 text-center break-inside-avoid" {...props} />,
              h2: ({node, ...props}) => <h2 className="font-cinzel text-4xl text-gold-dim mt-16 mb-8 tracking-wide break-after-avoid" {...props} />,
              h3: ({node, ...props}) => <h3 className="font-display text-3xl text-midnight mt-12 mb-6 font-bold break-after-avoid" {...props} />,
              p: ({node, ...props}) => <p className="mb-8 text-charcoal/90 text-[21px] leading-10" {...props} />,
              strong: ({node, ...props}) => <strong className="text-midnight font-bold" {...props} />,
              em: ({node, ...props}) => <em className="text-gold-dim" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-8 marker:text-gold text-[21px] leading-10" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-8 marker:text-gold text-[21px] leading-10" {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className="border-l-4 border-gold pl-8 italic text-gray-700 my-12 bg-gold/5 p-8 rounded-r text-2xl shadow-sm break-inside-avoid" {...props} />
              ),
              hr: ({node, ...props}) => <hr className="border-gold/30 my-16" {...props} />,
              table: ({node, ...props}) => <div className="overflow-x-auto my-8"><table className="w-full border-collapse border border-gold/20" {...props} /></div>,
              th: ({node, ...props}) => <th className="border border-gold/20 bg-gold/10 p-4 text-left font-cinzel text-midnight" {...props} />,
              td: ({node, ...props}) => <td className="border border-gold/20 p-4" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Footer Decoration */}
        <div className="mt-32 pt-12 border-t border-gray-300 text-center break-inside-avoid">
          <p className="font-cinzel text-sm text-gray-500 tracking-widest">
            Wisdom for the Soul • Sidereal Ayanamsa Raman • Natalie Lau
          </p>
          <div className="mt-6 text-gold text-3xl">❖</div>
        </div>

        {/* Token Usage Stats (Only visible in App, Hidden in Print) */}
        {usage && (
          <div className="no-print mt-12 p-6 bg-gray-50 border border-gray-200 rounded text-center text-xs font-mono text-gray-500">
            <p className="uppercase tracking-widest mb-2">Generation Statistics</p>
            <p>Input Tokens: {usage.inputTokens.toLocaleString()} | Output Tokens: {usage.outputTokens.toLocaleString()}</p>
            <p className="font-bold text-gray-700 mt-1">Estimated Cost: ${usage.totalCost.toFixed(4)} USD</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportView;
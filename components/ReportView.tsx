
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UsageStats } from '../types';

interface ReportViewProps {
  content: string;
  onReset: () => void;
  usage: UsageStats | null;
  analysisDate?: string;
}

const ReportView: React.FC<ReportViewProps> = ({ content, onReset, usage, analysisDate }) => {
  const handlePrint = () => {
    window.print();
  };

  const dateDisplay = analysisDate 
    ? new Date(analysisDate + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase()
    : "SEPTEMBER 2025";

  return (
    <div className="w-full min-h-screen pb-20 bg-midnight/40">
      
      {/* Floating Action Bar (Screen Only) */}
      <div className="no-print fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex gap-4 bg-midnight/90 backdrop-blur-md p-4 rounded-full border border-gold/30 shadow-2xl">
        <button 
          onClick={onReset}
          className="bg-transparent text-gold border border-gold/30 px-8 py-3 rounded-full font-cinzel text-sm hover:bg-gold/10 transition-all uppercase tracking-widest"
        >
          New Client
        </button>
        <button 
          onClick={handlePrint}
          className="bg-gold text-midnight px-10 py-3 rounded-full font-cinzel font-bold text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] uppercase tracking-widest"
        >
          Download PDF / Print
        </button>
      </div>

      {/* Report Container */}
      <div className="report-container max-w-[24cm] mx-auto bg-white text-charcoal shadow-2xl min-h-[29.7cm] relative overflow-hidden print:shadow-none print:max-w-none">
        
        {/* Luxury Frame - Subtle on print */}
        <div className="absolute inset-4 border-[1px] border-gold/10 pointer-events-none print:inset-8"></div>

        <div className="relative z-10 p-[1.5cm] md:p-[2.5cm] print:p-[1.2cm]">
          
          {/* Main Cover Header */}
          <div className="text-center mb-32 relative">
             <div className="mb-10">
               <span className="text-7xl text-gold font-serif italic">✧</span>
             </div>
             
             <div className="inline-block relative px-16 py-8 border-t border-b border-gold/30">
                <h1 className="font-cinzel text-5xl md:text-6xl font-bold text-midnight tracking-[0.3em] mb-1 uppercase leading-tight">
                  Cosmography<br/><span className="text-gold-dim">Strategic Analysis</span>
                </h1>
             </div>

             <div className="mt-10">
                <p className="font-serif italic text-gold-dim text-3xl tracking-wide">
                  Strategic Forecasting by Natalie Lau
                </p>
                <p className="font-cinzel text-[12px] tracking-[0.6em] text-gray-400 uppercase mt-6">
                  {dateDisplay}
                </p>
             </div>
          </div>

          {/* Content Body */}
          <div className="prose prose-2xl max-w-none font-serif text-justify leading-relaxed print:leading-normal">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => (
                  <div className="page-break-before-always first:page-break-before-avoid mb-20 mt-32 text-center">
                    <h1 className="font-cinzel text-5xl text-midnight uppercase tracking-[0.25em] mb-6 leading-tight" {...props} />
                    <div className="flex justify-center">
                       <div className="h-[3px] w-32 bg-gold"></div>
                    </div>
                  </div>
                ),
                h2: ({node, ...props}) => (
                  <h2 className="font-cinzel text-3xl text-gold-dim mt-20 mb-8 tracking-widest uppercase border-l-8 border-gold/20 pl-8 py-2" {...props} />
                ),
                p: ({node, ...props}) => (
                  <p className="mb-12 text-charcoal/90 text-[26px] print:text-[18pt] leading-relaxed font-light" {...props} />
                ),
                strong: ({node, ...props}) => <strong className="text-midnight font-bold border-b-2 border-gold/10" {...props} />,
                em: ({node, ...props}) => <em className="text-gold-dim italic font-medium px-2 bg-gold/5 rounded" {...props} />,
                ul: ({node, ...props}) => <ul className="list-none space-y-6 mb-16 pl-6 text-[24px] print:text-[16pt]" {...props} />,
                li: ({node, ...props}) => (
                  <li className="flex gap-6 items-start">
                    <span className="text-gold mt-2 text-lg">✦</span>
                    <span {...props} />
                  </li>
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote className="italic text-midnight my-20 bg-gold/5 p-16 rounded-sm text-3xl text-center border-y-2 border-gold/20 leading-snug" {...props} />
                ),
                hr: ({node, ...props}) => (
                  <div className="flex items-center justify-center my-24 gap-12">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent"></div>
                    <span className="text-gold text-3xl">❖</span>
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent"></div>
                  </div>
                ),
                table: ({node, ...props}) => (
                  <div className="my-16 overflow-x-auto border border-gold/20 shadow-md page-break-inside-avoid bg-white">
                    <table className="w-full border-collapse" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-midnight text-gold border-b-2 border-gold/40" {...props} />,
                th: ({node, ...props}) => (
                  <th className="p-6 text-center font-cinzel text-sm tracking-[0.3em] uppercase" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="p-6 border-b border-gold/10 text-center font-serif text-2xl text-charcoal/80" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Luxury Footer */}
          <div className="mt-48 pt-20 border-t-4 border-gold/10 text-center page-break-inside-avoid">
            <p className="font-cinzel text-[12px] text-gray-400 tracking-[0.8em] mb-8 uppercase">
              Wisdom • Guidance • Strategic Forecasting
            </p>
            <p className="font-serif italic text-gold-dim text-2xl mb-6">
              "Understanding your past is wisdom. Predicting your future is power."
            </p>
            <div className="mt-16 flex justify-center gap-4">
               {[1,2,3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-gold/30"></div>)}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .report-container { width: 210mm !important; min-height: 297mm !important; padding: 0 !important; margin: 0 !important; }
          .prose { font-size: 18pt !important; color: black !important; }
          h1 { font-size: 36pt !important; }
          h2 { font-size: 24pt !important; }
          p { line-height: 1.8 !important; margin-bottom: 24pt !important; }
          .page-break-before-always { page-break-before: always !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportView;


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
    : "DESEMBER 2025";

  // Pre-process content to fix common AI Markdown mistakes before rendering
  const cleanContent = content
    .replace(/\|\|/g, '|') // Fix double pipes
    .replace(/\$([a-zA-Z0-9-]+)\$/g, '**$1**') // Remove LaTeX style variables
    .replace(/<div class='page-break'><\/div>/g, '---PAGE_BREAK---'); // Handle custom page breaks

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
      <div className="report-container max-w-[21.5cm] mx-auto bg-white text-charcoal shadow-2xl min-h-[29.7cm] relative overflow-hidden print:shadow-none print:max-w-none">
        
        {/* Luxury Frame */}
        <div className="absolute inset-4 border-[1px] border-gold/20 pointer-events-none print:inset-8"></div>

        <div className="relative z-10 p-[1.5cm] md:p-[2cm] print:p-[1.2cm]">
          
          {/* Main Cover Header */}
          <div className="text-center mb-24 relative page-break-after-avoid">
             <div className="mb-8">
               <span className="text-5xl text-gold font-serif italic">✧</span>
             </div>
             
             <div className="inline-block relative px-12 py-6 border-t border-b border-gold/30">
                <h1 className="font-cinzel text-4xl md:text-5xl font-bold text-midnight tracking-wider mb-2 uppercase leading-tight">
                  Cosmography<br/><span className="text-gold-dim">Strategic Analysis</span>
                </h1>
             </div>

             <div className="mt-8">
                <p className="font-serif italic text-gold-dim text-2xl tracking-wide">
                  Strategic Forecasting by Natalie Lau
                </p>
                <p className="font-cinzel text-[11px] tracking-[0.4em] text-gray-400 uppercase mt-4">
                  {dateDisplay}
                </p>
             </div>
          </div>

          {/* Content Body */}
          <div className="prose prose-xl max-w-none font-serif text-justify leading-relaxed print:leading-normal">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => (
                  <div className="page-break-before-always first:page-break-before-avoid mb-12 mt-16 text-center">
                    <h1 className="font-cinzel text-3xl md:text-4xl text-midnight uppercase tracking-wide mb-4 leading-snug" {...props} />
                    <div className="flex justify-center">
                       <div className="h-[2px] w-24 bg-gold/50"></div>
                    </div>
                  </div>
                ),
                h2: ({node, ...props}) => (
                  <h2 className="font-cinzel text-xl md:text-2xl text-gold-dim mt-14 mb-6 tracking-wide uppercase border-l-4 border-gold/20 pl-6 py-1 break-after-avoid" {...props} />
                ),
                p: ({node, ...props}) => {
                   // Handle the custom page break marker from our pre-processing
                   if (props.children && String(props.children).includes('---PAGE_BREAK---')) {
                     return <div className="page-break-before-always h-0" />;
                   }
                   return <p className="mb-8 text-charcoal/90 text-[18px] print:text-[14pt] leading-[1.8] font-light" {...props} />;
                },
                strong: ({node, ...props}) => <strong className="text-midnight font-bold border-b border-gold/20" {...props} />,
                em: ({node, ...props}) => <em className="text-gold-dim italic font-medium px-1 bg-gold/5 rounded-sm" {...props} />,
                ul: ({node, ...props}) => <ul className="list-none space-y-4 mb-10 pl-4 text-[18px] print:text-[14pt]" {...props} />,
                li: ({node, ...props}) => (
                  <li className="flex gap-4 items-start">
                    <span className="text-gold mt-1.5 text-base flex-shrink-0">✦</span>
                    <span {...props} />
                  </li>
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote className="italic text-midnight my-14 bg-gold/5 p-10 rounded-sm text-xl text-center border-y border-gold/20 leading-snug break-inside-avoid" {...props} />
                ),
                hr: ({node, ...props}) => (
                  <div className="flex items-center justify-center my-16 gap-8">
                    <div className="h-[1px] w-full bg-gold/20"></div>
                    <span className="text-gold text-2xl">❖</span>
                    <div className="h-[1px] w-full bg-gold/20"></div>
                  </div>
                ),
                // Enhanced Table Styling
                table: ({node, ...props}) => (
                  <div className="my-12 overflow-hidden border border-gold/20 rounded-sm shadow-sm page-break-inside-avoid bg-white">
                    <table className="w-full border-collapse text-left" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-midnight text-gold" {...props} />,
                th: ({node, ...props}) => (
                  <th className="p-4 font-cinzel text-[11px] tracking-[0.2em] uppercase border-b border-gold/30" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="p-4 border-b border-gold/10 font-serif text-[16px] print:text-[12pt] text-charcoal/80 align-top" {...props} />
                ),
              }}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>

          {/* Luxury Footer */}
          <div className="mt-32 pt-12 border-t border-gold/10 text-center page-break-inside-avoid">
            <p className="font-cinzel text-[10px] text-gray-400 tracking-[0.6em] mb-4 uppercase">
              Wisdom • Guidance • Strategic Forecasting
            </p>
            <p className="font-serif italic text-gold-dim text-xl mb-4">
              "Understanding your past is wisdom. Predicting your future is power."
            </p>
            <div className="mt-10 flex justify-center gap-3">
               {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gold/20"></div>)}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .report-container { width: 210mm !important; min-height: 297mm !important; padding: 0 !important; margin: 0 !important; }
          .prose { font-size: 14pt !important; color: black !important; }
          h1 { font-size: 24pt !important; }
          h2 { font-size: 18pt !important; }
          p { line-height: 1.6 !important; margin-bottom: 16pt !important; }
          .page-break-before-always { page-break-before: always !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportView;

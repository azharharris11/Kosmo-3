
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UsageStats } from '../types';

interface ReportViewProps {
  content: string;
  onReset: () => void;
  usage: UsageStats | null;
  analysisDate?: string;
  clientName?: string;
  isLive?: boolean;
}

const ReportView: React.FC<ReportViewProps> = ({ content, onReset, usage, analysisDate, clientName, isLive = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect for live view
  useEffect(() => {
    if (isLive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isLive]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Hasil Analisis Kosmografi (${clientName || 'Klien'})`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const dateDisplay = analysisDate 
    ? new Date(analysisDate + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase()
    : "DESEMBER 2025";

  // --- CLEANING AI ARTIFACTS ---
  const cleanContent = content
    .replace(/\|\|/g, '|')
    .replace(/\$([a-zA-Z0-9-]+)\$/g, '**$1**')
    .replace(/<div class='page-break'><\/div>/g, '') // Hapus string page break lama jika ada
    .replace(/^(The following table|Table below|Berikut adalah tabel|Data teknis|Tabel berikut).*?[:]\s*$/gim, '')
    .replace(/^\s*[-_]{3,}\s*$/gm, (match) => match.includes('|') ? match : '') 
    .replace(/^Analisis:\s*/gim, '')
    .replace(/^Narasi:\s*/gim, '');

  return (
    <div className={`w-full ${isLive ? 'h-full' : 'min-h-screen pb-20'} bg-midnight/40`}>
      
      {/* Floating Action Bar (Only show when NOT live) */}
      {!isLive && (
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
      )}

      {/* Report Container */}
      <div className={`report-container max-w-[21.5cm] mx-auto bg-white text-charcoal shadow-2xl relative overflow-hidden print:shadow-none print:max-w-none ${isLive ? 'min-h-[500px] mb-0' : 'min-h-[29.7cm]'}`}>
        
        {/* Luxury Frame */}
        <div className="absolute inset-4 border-[1px] border-gold/20 pointer-events-none print:inset-8"></div>

        <div className="relative z-10 p-[1.5cm] md:p-[2cm] print:p-[1.2cm]">
          
          {/* Main Cover Header */}
          <div className="text-center mb-24 relative page-break-after-avoid">
             <div className="mb-8">
               <span className="text-5xl text-gold font-serif italic">✧</span>
             </div>
             
             <div className="inline-block relative px-12 py-6 border-t border-b border-gold/30">
                <h1 className="font-cinzel text-5xl md:text-6xl font-bold text-midnight tracking-wider mb-2 uppercase leading-tight">
                  Cosmography<br/><span className="text-gold-dim">Strategic Analysis</span>
                </h1>
             </div>

             <div className="mt-8">
                <p className="font-serif italic text-gold-dim text-3xl tracking-wide">
                  Strategic Forecasting by Natalie Lau
                </p>
                <p className="font-cinzel text-sm tracking-[0.4em] text-gray-400 uppercase mt-6">
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
                  <div className="page-break-before-always first:page-break-before-avoid mb-16 mt-20 text-center">
                    <h1 className="font-cinzel text-4xl md:text-5xl text-midnight uppercase tracking-wide mb-6 leading-snug font-bold" {...props} />
                    <div className="flex justify-center">
                       <div className="h-[2px] w-32 bg-gold/50"></div>
                    </div>
                  </div>
                ),
                h2: ({node, ...props}) => (
                  // H2 akan memicu page break melalui CSS @media print
                  <h2 className="font-cinzel text-4xl md:text-5xl text-midnight font-black tracking-wider uppercase border-b-4 border-black/10 pb-6 mb-8 leading-tight mt-24 page-break-before-always break-after-avoid" {...props} />
                ),
                h3: ({node, ...props}) => (
                  <h3 className="font-cinzel text-2xl font-bold text-midnight mt-12 mb-6 uppercase tracking-wide border-l-4 border-gold pl-4 break-after-avoid" {...props} />
                ),
                p: ({node, ...props}) => {
                   if (!props.children || props.children === '') return null;
                   return <p className="mb-8 text-charcoal/90 text-[18px] print:text-[14pt] leading-[1.8] font-light" {...props} />;
                },
                strong: ({node, ...props}) => <strong className="text-midnight font-bold" {...props} />,
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
                table: ({node, ...props}) => (
                  <div className="my-10 w-full overflow-hidden border border-gold/30 rounded-lg shadow-sm page-break-inside-avoid bg-white">
                    <table className="w-full border-collapse text-left table-auto" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-midnight text-gold" {...props} />,
                th: ({node, ...props}) => (
                  <th className="p-4 font-cinzel text-[10px] md:text-[12px] tracking-[0.1em] uppercase border-b border-gold/30 text-center" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="p-4 border-b border-gold/10 font-serif text-[14px] md:text-[16px] print:text-[12pt] text-charcoal/80 align-middle text-center" {...props} />
                ),
              }}
            >
              {cleanContent}
            </ReactMarkdown>

            {/* Live Typing Cursor */}
            {isLive && (
              <span className="inline-block w-2 h-6 bg-gold ml-1 animate-pulse align-middle"></span>
            )}
            
            {/* Scroll Anchor */}
            <div ref={bottomRef} />
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
          h1 { font-size: 28pt !important; }
          h2 { 
            font-size: 24pt !important; 
            page-break-before: always !important; 
            color: black !important; 
            font-weight: 800 !important;
            border-bottom: 3px solid #000 !important; 
            padding-bottom: 15pt !important;
            margin-bottom: 25pt !important;
          }
          h3 { font-size: 18pt !important; font-weight: bold !important; margin-top: 20pt !important; }
          p { line-height: 1.6 !important; margin-bottom: 16pt !important; }
          .page-break-before-always { page-break-before: always !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportView;

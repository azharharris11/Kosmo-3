
import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ReportView from './components/ReportView';
import LoadingScreen from './components/LoadingScreen';
import { ClientData, ReportState, Step, UsageStats, BatchItem } from './types';
import { generateReport } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [reportState, setReportState] = useState<ReportState>({
    isLoading: false,
    isStreaming: false,
    currentProcessingId: null,
    batchItems: [],
  });
  
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  const handleStartBatch = async (queue: ClientData[]) => {
    const initialBatchItems: BatchItem[] = queue.map(client => ({
      client,
      status: 'PENDING',
      resultContent: '',
      usage: null
    }));

    setReportState({
      isLoading: true,
      isStreaming: false,
      currentProcessingId: null,
      batchItems: initialBatchItems
    });
    setStep(Step.GENERATING);

    for (let i = 0; i < queue.length; i++) {
      const client = queue[i];
      
      setReportState(prev => ({
        ...prev,
        currentProcessingId: client.id,
        isStreaming: true,
        batchItems: prev.batchItems.map(item => 
          item.client.id === client.id ? { ...item, status: 'PROCESSING' } : item
        )
      }));

      try {
        await generateReport(
          client,
          (chunkContent) => {
            setReportState(prev => ({
              ...prev,
              batchItems: prev.batchItems.map(item => 
                item.client.id === client.id ? { ...item, resultContent: chunkContent } : item
              )
            }));
          },
          (statusUpdate) => {},
          (usage) => {
            setReportState(prev => ({
              ...prev,
              batchItems: prev.batchItems.map(item => 
                item.client.id === client.id ? { ...item, usage: usage } : item
              )
            }));
          },
          (detectedName) => {
             setReportState(prev => ({
               ...prev,
               batchItems: prev.batchItems.map(item => 
                 item.client.id === client.id 
                 ? { ...item, client: { ...item.client, clientName: detectedName } } 
                 : item
               )
             }));
          }
        );

        setReportState(prev => ({
          ...prev,
          batchItems: prev.batchItems.map(item => 
            item.client.id === client.id ? { ...item, status: 'COMPLETED' } : item
          )
        }));

      } catch (error: any) {
        console.error(`Error processing client ${client.clientName}:`, error);
        setReportState(prev => ({
          ...prev,
          batchItems: prev.batchItems.map(item => 
            item.client.id === client.id 
              ? { ...item, status: 'ERROR', error: error.message || "Gagal memproses." } 
              : item
          )
        }));
      }
    }

    setReportState(prev => ({ ...prev, isLoading: false, isStreaming: false, currentProcessingId: null }));
    setStep(Step.RESULT_LIST);
  };

  const handleViewReport = (clientId: string) => {
    setViewingClientId(clientId);
    setStep(Step.RESULT_VIEW);
  };

  const handleBackToList = () => {
    setViewingClientId(null);
    setStep(Step.RESULT_LIST);
  };

  const handleNewSession = () => {
    setStep(Step.INPUT);
    setReportState({
      isLoading: false,
      isStreaming: false,
      currentProcessingId: null,
      batchItems: []
    });
    setViewingClientId(null);
  };

  const currentViewItem = reportState.batchItems.find(item => item.client.id === viewingClientId);
  const currentProcessingItem = reportState.batchItems.find(item => item.client.id === reportState.currentProcessingId);

  return (
    <div className="min-h-screen w-full bg-midnight text-parchment bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-midnight/80 to-midnight"></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        
        {step !== Step.RESULT_VIEW && (
          <header className="text-center mb-10 pt-6">
            <h1 className="font-cinzel text-5xl md:text-6xl text-gold mb-2 tracking-widest drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
              Natalie Lau
            </h1>
            <p className="font-serif text-xl text-gray-300 tracking-wide uppercase border-t border-b border-gold/30 inline-block py-2 px-8">
              Cosmography Office
            </p>
          </header>
        )}

        <main className="w-full">
          {step === Step.INPUT && (
            <div className="animate-fade-in-up">
              <InputSection onStartBatch={handleStartBatch} isLoading={reportState.isLoading} />
            </div>
          )}

          {/* SPLIT VIEW FOR LIVE GENERATION */}
          {step === Step.GENERATING && (
             <div className="flex flex-col lg:flex-row gap-6 max-w-[95%] mx-auto h-[calc(100vh-180px)] animate-fade-in-up">
                {/* Left Panel: Queue List */}
                <div className="w-full lg:w-1/4 bg-midnight/80 border border-gold/20 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shadow-xl">
                   <h3 className="font-cinzel text-gold text-center border-b border-gold/20 pb-2 mb-2 sticky top-0 bg-midnight/90 z-10">
                     Antrian Analisis ({reportState.batchItems.filter(i => i.status === 'COMPLETED').length}/{reportState.batchItems.length})
                   </h3>
                   {reportState.batchItems.map(item => (
                      <div 
                        key={item.client.id} 
                        className={`
                          p-4 rounded border transition-all duration-300
                          ${item.status === 'PROCESSING' ? 'bg-gold/10 border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)] scale-105' : ''}
                          ${item.status === 'PENDING' ? 'bg-black/40 border-gold/10 opacity-60' : ''}
                          ${item.status === 'COMPLETED' ? 'bg-green-900/20 border-green-500/30' : ''}
                          ${item.status === 'ERROR' ? 'bg-red-900/20 border-red-500/50' : ''}
                        `}
                      >
                         <div className="flex justify-between items-start mb-2">
                           <h4 className="font-cinzel text-sm font-bold text-parchment truncate w-3/4">{item.client.clientName}</h4>
                           {item.status === 'PROCESSING' && <span className="w-2 h-2 bg-gold rounded-full animate-pulse"></span>}
                           {item.status === 'COMPLETED' && <span className="text-green-400 text-xs">✓</span>}
                         </div>
                         <div className="text-[10px] font-serif uppercase tracking-wider text-gold-dim">
                            {item.status === 'PENDING' && 'Menunggu...'}
                            {item.status === 'PROCESSING' && 'Sedang Menulis...'}
                            {item.status === 'COMPLETED' && 'Selesai'}
                         </div>
                      </div>
                   ))}
                </div>

                {/* Right Panel: Live Preview */}
                <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative shadow-2xl border border-gold/30 flex flex-col">
                   <div className="bg-midnight p-4 border-b border-gold/30 flex justify-between items-center shadow-lg z-20">
                      <div className="flex items-center gap-3">
                        <span className="text-gold text-2xl animate-spin-slow">✦</span>
                        <div>
                          <h3 className="font-cinzel text-gold text-lg">
                            Live Construction
                          </h3>
                          <p className="text-xs font-serif text-gray-400 italic">
                             {currentProcessingItem ? `Analyzing ${currentProcessingItem.client.clientName}...` : "Menyiapkan..."}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-gold/60 border border-gold/20 px-2 py-1 rounded">
                         LIVE PREVIEW MODE
                      </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth relative">
                       {currentProcessingItem ? (
                          <div className="transform origin-top scale-[0.85] md:scale-90 lg:scale-100 transition-transform p-4">
                            <ReportView 
                               content={currentProcessingItem.resultContent} 
                               isLive={true} 
                               clientName={currentProcessingItem.client.clientName}
                               analysisDate={currentProcessingItem.client.analysisDate}
                               onReset={() => {}} 
                               usage={null}
                            />
                          </div>
                       ) : (
                          <div className="flex h-full w-full items-center justify-center bg-midnight/95">
                             <LoadingScreen />
                          </div>
                       )}
                   </div>
                </div>
             </div>
          )}

          {/* RESULT GRID LIST (AFTER COMPLETION) */}
          {step === Step.RESULT_LIST && (
            <div className="max-w-5xl mx-auto animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportState.batchItems.map((item) => (
                  <div 
                    key={item.client.id} 
                    className={`
                      relative p-6 rounded border transition-all duration-500 bg-midnight border-gold/50 hover:border-gold hover:shadow-lg cursor-pointer group
                      ${item.status === 'ERROR' ? 'border-red-500/50' : ''}
                    `}
                    onClick={() => item.status === 'COMPLETED' ? handleViewReport(item.client.id) : null}
                  >
                    <div className="absolute top-4 right-4">
                      {item.status === 'COMPLETED' && <span className="text-xs font-cinzel text-green-400">✓ Selesai</span>}
                      {item.status === 'ERROR' && <span className="text-xs font-cinzel text-red-400">! Gagal</span>}
                    </div>

                    <h3 className="font-cinzel text-xl text-parchment mb-1 truncate pr-4 group-hover:text-gold transition-colors">{item.client.clientName}</h3>
                    <p className="text-xs font-serif text-gold-dim uppercase tracking-widest mb-4">
                      {item.client.selectedModel === 'gemini-3-pro-preview' ? 'Premium Tier' : item.client.selectedModel === 'gemini-3-flash-preview' ? 'Balanced Tier' : 'Standard Tier'}
                    </p>

                    {item.status === 'COMPLETED' && (
                       <div className="mt-4 flex justify-between items-end">
                          <div className="text-xs text-gray-500 font-serif italic">
                             Siap dicetak
                          </div>
                          <button className="text-gold text-sm font-cinzel border-b border-gold group-hover:text-white group-hover:border-white transition-colors">
                             BUKA &rarr;
                          </button>
                       </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button 
                  onClick={handleNewSession}
                  className="bg-transparent border border-gray-600 text-gray-400 px-8 py-3 font-cinzel hover:border-gold hover:text-gold transition-colors uppercase tracking-widest text-sm"
                >
                  + Input Batch Baru
                </button>
              </div>
            </div>
          )}

          {/* SINGLE REPORT VIEW */}
          {step === Step.RESULT_VIEW && currentViewItem && (
             <div className="animate-fade-in-up">
                <div className="no-print fixed top-6 left-6 z-50">
                   <button 
                     onClick={handleBackToList}
                     className="bg-midnight/90 text-parchment border border-gold/30 px-6 py-2 rounded-full font-cinzel hover:bg-gold/20 flex items-center gap-2 text-sm shadow-xl backdrop-blur-md"
                   >
                     &larr; Kembali
                   </button>
                </div>
                <ReportView 
                   content={currentViewItem.resultContent}
                   onReset={() => {}} 
                   usage={currentViewItem.usage}
                   analysisDate={currentViewItem.client.analysisDate}
                   clientName={currentViewItem.client.clientName}
                />
             </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;

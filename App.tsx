
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

          {(step === Step.GENERATING || step === Step.RESULT_LIST) && (
            <div className="max-w-5xl mx-auto">
              
              {step === Step.GENERATING && (
                 <div className="text-center mb-12">
                   <LoadingScreen />
                   <div className="mt-4 font-cinzel text-gold text-xl animate-pulse">
                     Memproses: {reportState.batchItems.find(i => i.client.id === reportState.currentProcessingId)?.client.clientName}
                   </div>
                   <p className="text-sm text-gray-500 mt-2 font-serif italic italic text-xs">
                      "Natalie sedang menyeimbangkan pola bintang untuk Anda..."
                   </p>
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportState.batchItems.map((item) => (
                  <div 
                    key={item.client.id} 
                    className={`
                      relative p-6 rounded border transition-all duration-500
                      ${item.status === 'PROCESSING' ? 'bg-gold/10 border-gold shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-105' : ''}
                      ${item.status === 'PENDING' ? 'bg-black/40 border-gold/10 opacity-60' : ''}
                      ${item.status === 'COMPLETED' ? 'bg-midnight border-gold/50 hover:border-gold hover:shadow-lg cursor-pointer' : ''}
                      ${item.status === 'ERROR' ? 'bg-red-900/20 border-red-500/50' : ''}
                    `}
                    onClick={() => item.status === 'COMPLETED' ? handleViewReport(item.client.id) : null}
                  >
                    <div className="absolute top-4 right-4">
                      {item.status === 'PENDING' && <span className="text-xs font-cinzel text-gray-500">Menunggu</span>}
                      {item.status === 'PROCESSING' && <span className="text-xs font-cinzel text-gold animate-pulse">Menulis...</span>}
                      {item.status === 'COMPLETED' && <span className="text-xs font-cinzel text-green-400">✓ Selesai</span>}
                      {item.status === 'ERROR' && <span className="text-xs font-cinzel text-red-400">! Gagal</span>}
                    </div>

                    <h3 className="font-cinzel text-xl text-parchment mb-1 truncate pr-4">{item.client.clientName}</h3>
                    <p className="text-xs font-serif text-gold-dim uppercase tracking-widest mb-4">
                      {item.client.selectedModel === 'gemini-3-pro-preview' ? 'Premium Tier' : item.client.selectedModel === 'gemini-3-flash-preview' ? 'Balanced Tier' : 'Standard Tier'}
                    </p>

                    {item.status === 'PROCESSING' && (
                       <div className="text-xs font-serif text-gray-400 italic line-clamp-3 h-12">
                         {item.resultContent.slice(-100)}...
                       </div>
                    )}

                    {item.status === 'COMPLETED' && (
                       <div className="mt-4 flex justify-between items-end">
                          <div className="text-xs text-gray-500">
                             {(item.resultContent.length / 5).toFixed(0)} words
                          </div>
                          <button className="text-gold text-sm font-cinzel border-b border-gold hover:text-white">
                             BUKA &rarr;
                          </button>
                       </div>
                    )}
                  </div>
                ))}
              </div>

              {step === Step.RESULT_LIST && (
                <div className="mt-12 text-center">
                  <button 
                    onClick={handleNewSession}
                    className="bg-transparent border border-gray-600 text-gray-400 px-8 py-3 font-cinzel hover:border-gold hover:text-gold transition-colors"
                  >
                    + Input Batch Baru
                  </button>
                </div>
              )}
            </div>
          )}

          {step === Step.RESULT_VIEW && currentViewItem && (
             <div className="animate-fade-in-up">
                <div className="no-print fixed top-6 left-6 z-50">
                   <button 
                     onClick={handleBackToList}
                     className="bg-midnight/90 text-parchment border border-gold/30 px-6 py-2 rounded font-cinzel hover:bg-gold/20 flex items-center gap-2"
                   >
                     &larr; Kembali ke Daftar
                   </button>
                </div>
                <ReportView 
                   content={currentViewItem.resultContent}
                   onReset={() => {}} 
                   usage={currentViewItem.usage}
                   analysisDate={currentViewItem.client.analysisDate}
                />
             </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;

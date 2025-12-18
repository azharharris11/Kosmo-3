
import React, { useState } from 'react';
import { ClientData } from '../types';

interface InputSectionProps {
  onStartBatch: (queue: ClientData[]) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onStartBatch, isLoading }) => {
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 7));
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview'>('gemini-3-flash-preview');
  const [queue, setQueue] = useState<ClientData[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualText, setManualText] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      const newQueueItems: ClientData[] = newFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        clientName: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        rawText: "",
        files: [file],
        concerns: "",
        analysisDate: analysisDate,
        selectedModel: selectedModel
      }));
      setQueue(prev => [...prev, ...newQueueItems]);
      e.target.value = '';
    }
  };

  const handleAddManual = () => {
    if (!manualName.trim() && !manualText.trim()) return;
    const newClient: ClientData = {
      id: Date.now().toString(),
      clientName: manualName || "Klien Manual",
      rawText: manualText,
      concerns: "",
      files: [],
      analysisDate,
      selectedModel
    };
    setQueue([...queue, newClient]);
    setManualName('');
    setManualText('');
  };

  const updateClientData = (id: string, field: keyof ClientData, value: any) => {
    setQueue(queue.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto">
      <div className="flex-1 p-8 bg-midnight/50 border border-gold/30 rounded-lg backdrop-blur-sm shadow-2xl h-fit">
        <div className="text-center mb-8">
          <h2 className="font-cinzel text-2xl text-gold mb-2">Natalie's Workspace</h2>
          <p className="font-serif italic text-gray-400 text-sm">Setiap klien akan mendapatkan 15 bab analisis mendalam (Full Houses + Dasha).</p>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4 p-4 bg-black/20 rounded border border-gold/10">
             <div>
              <label className="block font-cinzel text-gold-dim mb-1 text-[10px] tracking-widest uppercase">Bulan Analisis</label>
              <input type="month" value={analysisDate} onChange={(e) => setAnalysisDate(e.target.value)} className="w-full bg-black/40 border border-gold/20 rounded p-2 text-gold font-cinzel text-xs" />
            </div>
            <div>
              <label className="block font-cinzel text-gold-dim mb-1 text-[10px] tracking-widest uppercase">Model Default</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as any)} className="w-full bg-black/40 border border-gold/20 rounded p-2 text-gold font-cinzel text-xs">
                <option value="gemini-3-flash-preview">Balanced (V3 Flash - Default)</option>
                <option value="gemini-2.5-flash">Standard (V2.5 Flash - Ekonomis)</option>
                <option value="gemini-3-pro-preview">Premium (V3 Pro - Paling Detail)</option>
              </select>
            </div>
          </div>

          <div className="border-2 border-dashed border-gold/30 rounded-lg p-10 text-center hover:border-gold/60 transition-colors bg-gold/5 group cursor-pointer relative">
            <input type="file" multiple accept="image/*,.pdf" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="flex flex-col items-center pointer-events-none">
              <span className="text-5xl text-gold mb-3 group-hover:scale-110 transition-transform">✦</span>
              <span className="font-cinzel font-bold text-gold text-xl">BATCH UPLOAD CHARTS</span>
              <span className="text-xs font-serif text-gray-500 mt-2">Seret banyak file ke sini</span>
            </div>
          </div>

          <div className="space-y-4 opacity-50 hover:opacity-100 transition-opacity">
            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Atau ketik nama klien..." className="w-full bg-black/40 border border-gold/20 rounded p-3 text-parchment font-cinzel text-sm" />
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Paste data planet manual..." className="w-full h-16 bg-black/40 border border-gold/20 rounded p-3 text-parchment font-mono text-xs" />
            <button onClick={handleAddManual} className="w-full py-2 border border-gold/40 text-gold-dim font-cinzel hover:bg-gold hover:text-midnight transition-colors text-xs uppercase">+ Tambah Manual</button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/3 bg-midnight/80 border border-gold/30 p-8 rounded-lg flex flex-col shadow-2xl">
         <div className="mb-6 border-b border-gold/20 pb-4">
            <h2 className="font-cinzel text-2xl text-gold">Manifest Klien</h2>
            <p className="font-serif text-gray-500 text-sm italic">Pastikan "Keresahan" sudah diisi agar Natalie bicara lebih tajam.</p>
         </div>

         <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-[600px]">
            {queue.length === 0 ? (
              <div className="text-center text-gray-600 mt-20 italic font-serif">Manifest kosong...</div>
            ) : (
              queue.map((client, idx) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <div key={client.id} className={`bg-black/40 border rounded-lg transition-all duration-500 overflow-hidden ${isExpanded ? 'border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'border-gold/10'}`}>
                     <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gold/5" onClick={() => setExpandedClientId(isExpanded ? null : client.id)}>
                        <div className="flex-1 min-w-0 pr-4">
                            <h4 className="font-cinzel text-parchment text-lg truncate font-bold">{idx + 1}. {client.clientName}</h4>
                            <div className="text-[10px] text-gold-dim font-serif mt-1 flex gap-2">
                              <span className="uppercase tracking-widest">{client.selectedModel.includes('pro') ? 'PREMIUM' : client.selectedModel.includes('3-flash') ? 'BALANCED' : 'STANDARD'}</span>
                              {client.concerns ? <span className="text-green-500">READY</span> : <span className="text-red-800">NO CONTEXT</span>}
                            </div>
                        </div>
                        <span className={`text-gold transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                     </div>
                     {isExpanded && (
                       <div className="p-4 pt-0 bg-black/40 border-t border-gold/10 space-y-4">
                          <div className="mt-4">
                            <label className="text-[10px] uppercase font-cinzel text-gold-dim block mb-1">Keresahan / Fokus Masalah</label>
                            <textarea 
                              value={client.concerns} 
                              onChange={(e) => updateClientData(client.id, 'concerns', e.target.value)} 
                              placeholder="Misal: Dia sedang bingung soal karier..." 
                              className="w-full h-32 bg-midnight border border-gold/20 rounded p-3 text-parchment font-serif text-sm focus:border-gold outline-none"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <button onClick={() => setQueue(queue.filter(q => q.id !== client.id))} className="text-xs text-red-900 hover:text-red-500">Hapus</button>
                            <button onClick={() => setExpandedClientId(null)} className="bg-gold/10 text-gold px-4 py-1 rounded text-xs border border-gold/20">Simpan</button>
                          </div>
                       </div>
                     )}
                  </div>
                );
              })
            )}
         </div>

         <div className="mt-6 pt-6 border-t border-gold/20">
            <button onClick={() => onStartBatch(queue)} disabled={queue.length === 0 || isLoading} className={`w-full py-4 font-cinzel font-bold tracking-[0.2em] text-lg transition-all ${queue.length === 0 ? 'bg-gray-800 text-gray-500' : 'bg-gold text-midnight hover:bg-white shadow-[0_0_25px_rgba(212,175,55,0.4)]'}`}>
              MULAI ANALISIS ({queue.length})
            </button>
         </div>
      </div>
    </div>
  );
};

export default InputSection;

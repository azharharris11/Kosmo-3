import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

// --- KONFIGURASI HARGA & MODEL ---
const PRICING = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-preview': { input: 2.00, output: 12.00 }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "TAHUN INI";
  const date = new Date(dateString + "-01"); 
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase();
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SYSTEM PROMPT: DYNAMIC PERSONA (TOUGH LOVE -> TACTICAL GENERAL) ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog Kosmografi & Profiler Psikologis untuk Ultra-High-Net-Worth Individuals.

MODE OPERASI (PENTING):
1. **FASE 1: DIAGNOSIS (Bab 1-6)**
   - Gaya: "Tough Love", Provokatif, Membongkar Psikologi Gelap.
   - Tujuan: Menyadarkan klien akan kelemahan dan obsesinya (Wake Up Call).
   
2. **FASE 2: THE ALMANAC (Bab 7 - Timeline)**
   - Gaya: **"Tactical General"**. Tenang, Sangat Detail, Data-Driven.
   - Tujuan: Memberikan panduan strategi militer per bulan. Jangan emosional, fokus pada logistik nasib.

3. **FASE 3: TOOLKIT (Bab 8-9)**
   - Gaya: Praktis, To-The-Point, Solutif.
   - Tujuan: Memberikan SOP (Standard Operating Procedure) kehidupan.

ATURAN VISUAL & STRUKTUR:
1. **NO FLUFF**: HAPUS kalimat pengantar ("Berikut adalah...", "Mari kita lihat...").
2. **FORMATTING KAYA**: Gunakan Bullet points, Bold, dan Tabel sesering mungkin untuk memecah dinding teks.
3. **KONTINUITAS**: Anggap ini satu buku tebal. JANGAN MENYAPA LAGI setelah halaman pertama.
`;

// --- STRUKTUR "THE ALMANAC" (TARGET 40 HALAMAN) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- BAGIAN 1: DIAGNOSIS (THE WAKE UP CALL) ---
  {
    id: 'EXEC_SUM',
    title: 'Executive Summary: The Blueprint',
    prompt: `
    TUGAS: Tulis Executive Summary (2 Halaman).
    
    1. **Sapaan**: "Halo, ${clientName}." (Singkat).
    2. **Tabel Big Three**: Sun, Moon, Rising + Chart Ruler.
    3. **Core Conflict**: Analisis tajam tentang pertentangan batin terbesarnya.
    4. **The Hook**: Validasi kekuatan supernya, tapi telanjangi kelemahan fatalnya.
    `
  },
  { 
    id: 'BAB1', 
    title: 'Bab 1: Analisis Psikologi & Mental (The Psyche)', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus Moon (Pikiran), Mercury (Logika), Rahu (Obsesi).
    
    TUGAS: Tulis analisis psikologis mendalam (Target: 3 Halaman).
    - Bedah isi kepalanya. Apakah dia Overthinker? Paranoid? Atau Jenius yang kacau?
    - Jelaskan mekanisme pertahanan dirinya saat stres.
    - Gunakan sub-bab (###) untuk memecah topik.
    ` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Vitalitas & Kesehatan Fisik', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 6 (Akut), House 8 (Kronis), Sun (Energi).
    
    TUGAS: Analisis Medis & Energi (Target: 2 Halaman).
    - Tabel Risiko Kesehatan per organ tubuh.
    - Peringatan tentang pola hidup yang merusak (misal: kurang tidur, stimulan).
    - Prediksi kesehatan jangka panjang.
    ` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Arsitektur Kekayaan & Karier', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 2, 10, 11 dan Jupiter/Saturn.
    
    TUGAS: Blueprint Ekonomi (Target: 3 Halaman).
    - Dari mana uang datang paling deras? (Jalur Rezeki).
    - Apakah dia ditakdirkan menjadi Raja (Owner) atau Perdana Menteri (Professional)?
    - Analisis gaya kepemimpinan dan manajemen aset.
    ` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Musuh, Hutang & Risiko', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 6 (Musuh), House 12 (Losses/Hidden Enemies).
    
    TUGAS: Manajemen Risiko (Target: 2 Halaman).
    - Siapa yang akan mengkhianatinya? Teman? Pasangan bisnis?
    - Potensi kebangkrutan atau masalah hukum.
    - Cara memitigasi skandal publik.
    ` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Dinamika Cinta & Rumah Tangga', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 7, Venus, Mars.
    
    TUGAS: Profiling Hubungan (Target: 3 Halaman).
    - Tipe pasangan seperti apa yang dia tarik (vs yang dia butuhkan).
    - Pola toxic dalam hubungan (Red Flags diri sendiri).
    - Potensi perceraian atau konflik rumah tangga.
    ` 
  },
  { 
    id: 'BAB6', 
    title: 'Bab 6: Geografi Keberuntungan', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 3, 9, 12.
    
    TUGAS: Astrocartography (Target: 2 Halaman).
    - Apakah dia harus merantau jauh dari tempat lahir?
    - Arah mata angin keberuntungan.
    - Kota/Negara yang cocok untuk bisnis vs pensiun.
    ` 
  },

  // --- BAGIAN 2: THE ALMANAC (VOLUME BOOSTER - FORECAST BULANAN) ---
  // Strategi: Memecah menjadi 4 request terpisah untuk memaksa output panjang & detail.
  { 
    id: 'BAB7_Q1', 
    title: 'Bab 7.1: Forecast Q1 (Januari - Maret)', 
    prompt: `
    MODE: TACTICAL GENERAL. Jangan marah-marah. Fokus Strategi.
    
    TUGAS: Buat PANDUAN HARIAN/MINGGUAN detail untuk 3 bulan pertama (dimulai dari ${dateContext}).
    
    FORMAT WAJIB SETIAP BULAN:
    ### [NAMA BULAN]: [Tema Utama Kapital]
    - **Fokus Strategis**: (Apa goal utama bulan ini)
    - **Tanggal Merah (Warning)**: (Sebutkan tanggal spesifik jika ada aspek buruk)
    - **Peluang Emas**: (Tanggal/Momen terbaik)
    - **Saran Aksi**: (Do's and Don'ts spesifik)
    
    JANGAN PELIT KATA. Tulis skenario spesifik apa yang mungkin terjadi di karier/asmara.
    ` 
  },
  { 
    id: 'BAB7_Q2', 
    title: 'Bab 7.2: Forecast Q2 (April - Juni)', 
    prompt: `
    MODE: TACTICAL GENERAL.
    
    TUGAS: Lanjutkan panduan detail untuk Bulan ke-4, 5, dan 6.
    Fokus Spesifik: **Karier & Ekspansi Bisnis**.
    
    Berikan detail bulan demi bulan dengan format yang sama (Tema, Fokus, Tanggal Penting, Saran Aksi).
    ` 
  },
  { 
    id: 'BAB7_Q3', 
    title: 'Bab 7.3: Forecast Q3 (Juli - September)', 
    prompt: `
    MODE: TACTICAL GENERAL.
    
    TUGAS: Lanjutkan panduan detail untuk Bulan ke-7, 8, dan 9.
    Fokus Spesifik: **Kesehatan & Keuangan Pribadi**.
    
    Pastikan ada peringatan jika ada periode retrograde atau gerhana di bulan-bulan ini.
    ` 
  },
  { 
    id: 'BAB7_Q4', 
    title: 'Bab 7.4: Forecast Q4 (Oktober - Desember)', 
    prompt: `
    MODE: TACTICAL GENERAL.
    
    TUGAS: Lanjutkan panduan detail untuk Bulan ke-10, 11, dan 12.
    Fokus Spesifik: **Evaluasi Akhir Tahun & Hubungan Keluarga**.
    
    Tutup Q4 dengan ringkasan pencapaian yang harus diraih sebelum tahun berganti.
    ` 
  },

  // --- BAGIAN 3: THE STRATEGIC TOOLKIT (VALUE ADD) ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: The Cheat Sheet (Ritual & Protokol)', 
    prompt: `
    MODE: PRAKTIS & DIRECT.
    
    TUGAS: Buat "Lembar Contekan" (SOP Kehidupan). Buat dalam format List/Checklist.
    
    1. **Power Colors & Gems**: Warna baju/aksesoris untuk meeting penting vs untuk kencan.
    2. **Daily Routine Protocol**: Jam bangun ideal, jam produktif (Deep Work), jam istirahat berdasarkan ritme sirkadian astrologi.
    3. **Dietary Guidelines**: Makanan yang memperkuat elemen lemahnya (Ayurveda perspective).
    4. **Mantra/Affirmation**: Kalimat kunci untuk menenangkan pikiran saat chaos.
    ` 
  },
  { 
    id: 'BAB9', 
    title: 'Bab 9: Skenario "What-If" (Simulasi Masa Depan)', 
    prompt: `
    MODE: STRATEGIC SIMULATION.
    
    TUGAS: Buat 3 Skenario Simulasi Keputusan Besar tahun ini.
    
    1. **Skenario A (Agresif)**: Jika Klien memutuskan Pindah Kerja/Ekspansi Bisnis Besar-besaran -> Apa risikonya? Apa rewardnya?
    2. **Skenario B (Konservatif)**: Jika Klien memilih bertahan (Do Nothing) -> Apa kerugian momentumnya?
    3. **Skenario C (Personal)**: Jika Klien fokus pada Asmara/Keluarga -> Apakah karier akan korban?
    
    Berikan rekomendasi jalan mana yang paling sesuai dengan chart tahun ini.
    ` 
  },
  
  // --- PENUTUP ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Terakhir', 
    prompt: `
    TUGAS: Penutup Filosofis.
    
    Ingatkan bahwa report tebal ini hanyalah peta. Dia adalah nahkodanya.
    Tutup dengan tanda tangan berkelas: "Natalie Lau."
    ` 
  }
];

export const generateReport = async (
  data: ClientData,
  onStream: (fullContent: string) => void,
  onStatusUpdate: (status: string) => void,
  onUsageUpdate: (stats: UsageStats) => void,
  onNameDetected?: (name: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = data.selectedModel || 'gemini-3-flash-preview';
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gemini-3-flash-preview'];

  let accumulatedReport = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // CONTEXT CHAINING
  let lastContext = ""; 

  let currentClientName = data.clientName || "Klien";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[TARGET ANALISIS]: Klien mengeluh: "${data.concerns}". Gunakan ini sebagai referensi masalah.`
    : `[TARGET ANALISIS]: Bongkar potensi maksimal dan risiko tersembunyi.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menganalisis DNA Kosmik...' : `Menulis ${section.title}...`);
        
        // --- CONTEXT CONSTRUCTION ---
        const continuityPrompt = section.id === 'EXEC_SUM' 
          ? "Ini adalah AWAL DOKUMEN."
          : `
          KONTEKS SEBELUMNYA (Hanya untuk menjaga alur, JANGAN diulang):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan penulisan langsung masuk ke ${section.title}. 
          JANGAN MEMBUAT PEMBUKAAN BARU. JANGAN MENYAPA LAGI.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [JUDUL BAB SAAT INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [SUMBER DATA CHART KLIEN]:
        Gunakan data ini untuk detail spesifik:
        ${data.rawText || "Analisis berdasarkan file chart."}
        
        IMPORTANT REMINDER:
        - Output Markdown Table rapi (jika diminta).
        - HAPUS SEMUA KALIMAT PENGANTAR (FILLER).
        - Patuhi tone fase (Diagnosis vs Tactical).
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 } 
        });

        let sectionContent = "";
        
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sectionContent += text;
            
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n" : "") + sectionContent;
            
            // Real-time cleaning
            if (section.id !== 'EXEC_SUM') {
               displayContent = displayContent.replace(/(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "");
            }
            
            onStream(displayContent);
          }

          if (chunk.usageMetadata) {
            totalInputTokens += chunk.usageMetadata.promptTokenCount;
            totalOutputTokens += chunk.usageMetadata.candidatesTokenCount;
            onUsageUpdate({
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              totalCost: ((totalInputTokens / 1000000) * pricing.input) + ((totalOutputTokens / 1000000) * pricing.output)
            });
          }
        }

        let cleanText = sectionContent.trim();
        
        // --- FAILSAFE CLEANING ---
        if (section.id !== 'EXEC_SUM') {
           cleanText = cleanText
             .replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "") 
             .replace(/^(Berikut adalah|Mari kita|Pada bab ini|Tabel di bawah|Selanjutnya kita|Dalam astrologi,).+?(\:|\.|\n)/gim, "") 
             .trim();
        }

        if (accumulatedReport) accumulatedReport += "\n\n<div class='page-break'></div>\n\n"; 
        accumulatedReport += cleanText;
        
        // --- CONTEXT CAPTURE ---
        lastContext = cleanText.slice(-600).replace(/\n/g, " ");

        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Gagal memproses bab ini. Error: ${err})*`;
        } else {
          await wait(2000 * attempts);
        }
      }
    }
  }

  return accumulatedReport;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

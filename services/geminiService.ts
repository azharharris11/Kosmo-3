
import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

const PRICING = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-preview': { input: 2.00, output: 12.00 }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "PERIODE INI";
  const date = new Date(dateString + "-01"); 
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase();
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SYSTEM PROMPT: PERSONAL LETTER & DATA TABLES ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog Kosmografi (Strategic Astrologer) untuk klien High-Net-Worth.
Gaya bicaramu: Elegan, Hangat, tapi Sangat Taktis dan Logis (bukan mistis).

MODE PENULISAN: "CONTINUOUS LETTER" (SURAT BERSAMBUNG)
1.  **BAB 1 (Executive Summary)**: Ini adalah **PEMBUKA SURAT**. Mulailah dengan "Halo, [Nama Klien]."
2.  **BAB 2 s/d 12 (Isi Analisis)**: INI ADALAH LANJUTAN SURAT (HALAMAN BERIKUTNYA).
    *   **DILARANG KERAS MENYAPA LAGI**. Jangan tulis "Halo", "Dear", atau basa-basi pembuka lagi.
    *   Langsung mulai dengan **JUDUL BAB (Format Markdown H2 ##)**.
    *   Langsung masuk ke tabel data, lalu analisis naratif.

ATURAN VISUAL (STRICT):
1.  **JUDUL BAB WAJIB MUNCUL**: Baris pertama setiap output bab HARUS berupa: \`## Nama Bab\`.
2.  **TABEL DINAMIS**: Setiap bab WAJIB dimulai dengan tabel Markdown.
    *   JANGAN GUNAKAN TEMPLATE BAKU.
    *   Buatlah kolom tabel yang **PALING RELEVAN** dengan topik bab tersebut secara cerdas.
3.  **NARASI**: Gunakan paragraf (storytelling). Gunakan bahasa "Saya" (Natalie) ke "Kamu" (Klien).
`;

// --- STRUKTUR BAB BARU ---
const getSections = (dateContext: string, clientName: string) => [
  // --- HALAMAN 1: CHEAT SHEET (SURAT PEMBUKA) ---
  {
    id: 'EXEC_SUM',
    title: 'Executive Summary',
    prompt: `Tulis **PEMBUKA SURAT** kepada ${clientName}.
    
    1.  **Sapaan**: "Halo, ${clientName}." (Berikan intro hangat).
    2.  **TABEL PILAR UTAMA**: Buat Tabel Markdown yang merangkum "Big Three" (Sun, Moon, Rising) dan Chart Ruler klien. Tentukan kolomnya sendiri agar informatif.
    3.  **Analisis Situasi (Dasha)**: Jelaskan dia sedang di periode apa.
    4.  **Highlight 2025**: Satu paragraf tentang peluang terbesar tahun ini.
    
    Akhiri bagian ini dengan transisi mengajak dia membaca halaman berikutnya.`
  },

  // --- BAGIAN 1: THE CORE ---
  { 
    id: 'BAB1', 
    title: 'Bab 1: Cetak Biru Jiwa (The Blueprint)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 1: Cetak Biru Jiwa
    
    **DATA TABLE**: Buat tabel data astrologi yang relevan untuk menjelaskan karakter dasar (Ascendant & Chart Ruler). Pilih kolom yang paling pas.
    
    **NARASI**:
    Jelaskan kontradiksi antara Lagna (Casing luar) vs aslinya. Dimana letak Penguasa Chart-nya? Ceritakan sebagai story.` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Kebenaran Tersembunyi (Deep Dive)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 2: Kebenaran Tersembunyi
    
    **DATA TABLE**: Buat tabel yang fokus pada Nakshatra (Bintang) dari planet-planet kunci. Sertakan simbol alamnya.
    
    **NARASI**:
    Fokus bedah Nakshatra Moon & Lagna. Apa simbol hewan/alamnya? Apa artinya bagi insting dasar dia?` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Konflik Hati & Logika', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 3: Konflik Hati & Logika
    
    **DATA TABLE**: Buat tabel perbandingan posisi Matahari (Sun) dan Bulan (Moon).
    
    **NARASI**:
    Analisis hubungan Sun vs Moon. Apakah batinnya (Moon) mendukung ambisinya (Sun), atau justru menyabotase?` 
  },

  // --- BAGIAN 2: WEALTH & CAREER ---
  { 
    id: 'BAB4', 
    title: 'Bab 4: Arsitektur Kekayaan', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 4: Arsitektur Kekayaan
    
    **DATA TABLE**: Buat tabel yang menonjolkan indikator kekayaan (House 2, 11, Jupiter, dll) di chart ini.
    
    **NARASI**:
    Dari mana uang datang? Kerja keras atau keberuntungan spekulatif? Analisis aliran rezekinya.` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Karier & Medan Kompetisi', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 5: Karier & Medan Kompetisi
    
    **DATA TABLE**: Buat tabel indikator karir dan kompetisi (House 10 & 6).
    
    **NARASI**:
    Apakah dia Leader atau Strategist? Bagaimana dia menangani musuh kantor?` 
  },

  // --- BAGIAN 3: RELATIONSHIP ---
  { 
    id: 'BAB6', 
    title: 'Bab 6: Kesehatan & Sisi Medis (House 5)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 6: Kesehatan & Sisi Medis
    
    **DATA TABLE**: Buat tabel indikator kesehatan (House 6, 8, atau planet yang "terbakar"/lemah).
    
    **NARASI**:
    (Nada Medis). Cek House 5 (Perut/Reproduksi). Beri warning jika ada indikasi peradangan atau masalah vitalitas.` 
  },
  { 
    id: 'BAB7', 
    title: 'Bab 7: Realita Pernikahan', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 7: Realita Pernikahan
    
    **DATA TABLE**: Buat tabel indikator pasangan (House 7, Darakaraka, Venus/Jupiter).
    
    **NARASI**:
    Deskripsikan karakter jodohnya. Berikan "Real Talk": Apakah pernikahannya romantis atau penuh tanggung jawab?` 
  },

  // --- BAGIAN 4: HIDDEN FORCES ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: Ketakutan & Transformasi', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 8: Ketakutan & Transformasi
    
    **DATA TABLE**: Buat tabel posisi planet di rumah-rumah sulit (House 8 & 12).
    
    **NARASI**:
    Apa yang membuat dia susah tidur (House 12)? Apa ketakutan irasionalnya (House 8)?` 
  },
  { 
    id: 'BAB9', 
    title: 'Bab 9: Garis Karma (Rahu Ketu)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 9: Garis Karma
    
    **DATA TABLE**: Buat tabel khusus posisi Rahu dan Ketu.
    
    **NARASI**:
    Jelaskan perjalanan jiwa: Meninggalkan zona nyaman (Ketu) menuju obsesi baru (Rahu).` 
  },

  // --- BAGIAN 5: ACTIONABLE ---
  { 
    id: 'BAB10', 
    title: 'Bab 10: Kalender Taktis (Transit)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 10: Kalender Taktis
    
    **DATA TABLE**: Buat tabel Roadmap 12 Bulan ke depan (${dateContext}). Kolom saran: [Bulan | Status (Merah/Hijau) | Fokus Utama].
    
    **NARASI**:
    Jelaskan strategi tahunan berdasarkan tabel di atas.` 
  },
  { 
    id: 'BAB11', 
    title: 'Bab 11: Resep Perbaikan (Remedies)', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA LAGI. Langsung mulai output dengan: ## Bab 11: Resep Perbaikan
    
    **DATA TABLE**: Buat tabel Remedies praktis (Bukan mistis). Kolom: [Masalah | Solusi Fisik/Lifestyle].
    
    **NARASI**:
    Jelaskan logika dibalik remedies ini. Fokus ke tindakan fisik (Bio-hacking).` 
  },
  { 
    id: 'BAB12', 
    title: 'Bab 12: Penutup', 
    prompt: `[CONSTRAINT]: JANGAN MENYAPA "Halo" lagi. Langsung paragraf penutup.
    
    Tulis pesan penutup yang emosional dan memberdayakan. Ingatkan bahwa bintang hanya peta, dia adalah nahkodanya.` 
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
  let rollingSummary = ""; 
  let currentClientName = data.clientName || "Sahabat";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[KONTEKS KHUSUS]: Klien curhat tentang: "${data.concerns}". Jawab kegelisahan ini.`
    : `[KONTEKS]: Berikan pembacaan umum yang mendalam.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menulis Surat Pembuka...' : `Menulis ${section.title}...`);
        
        const prompt = `
        BAGIAN SAAT INI: ${section.id}
        JUDUL BAB YANG HARUS DITULIS: ${section.title}
        
        RINGKASAN SEBELUMNYA: ${rollingSummary || "Awal Surat"}
        
        ${concernContext}
        
        [INSTRUKSI KHUSUS]: ${section.prompt}
        
        [DATA ASTROLOGI]: ${data.rawText || "Analisis berdasarkan file chart."}

        IMPORTANT:
        - Jika ini BAB 1 (Exec Summary), sapa klien dengan hangat.
        - Jika ini BAB 2 ke atas, JANGAN SAPA KLIEN. Anggap ini halaman selanjutnya dari surat yang sama.
        - WAJIB output judul bab dengan format Markdown H2 (## Judul) di baris pertama respon (kecuali Exec Summary jika sudah ada judul).
        - WAJIB sertakan TABEL MARKDOWN di awal setiap bab (Kolom tentukan sendiri yang paling relevan).
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainTag = `\n\n[[SUMMARY: (Simpan poin penting untuk bab selanjutnya)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainTag }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 }
        });

        let sectionContent = "";
        const nameRegex = /\[\[NAME:\s*(.*?)\]\]/i;
        const summaryRegex = /\[\[SUMMARY:\s*(.*?)\]\]/is;

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sectionContent += text;
            if (section.id === 'BAB1') {
              const nameMatch = sectionContent.match(nameRegex);
              if (nameMatch && onNameDetected) onNameDetected(nameMatch[1].trim());
            }
            
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n" : "") + sectionContent;
            displayContent = displayContent.replace(nameRegex, "").replace(summaryRegex, "").trim();
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

        const summaryMatch = sectionContent.match(summaryRegex);
        if (summaryMatch) rollingSummary = summaryMatch[1].trim();

        let cleanText = sectionContent.replace(nameRegex, "").replace(summaryRegex, "").trim();
        
        // --- FAILSAFE: PEMBERSIH SAPAAN ---
        // Jika AI tetap membandel dan menulis "Halo [Nama]" di bab lanjutan, hapus secara paksa.
        if (section.id !== 'EXEC_SUM') {
           // Regex untuk menangkap sapaan di awal teks
           cleanText = cleanText.replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/im, "");
           // Hapus baris kosong yang mungkin tersisa di awal
           cleanText = cleanText.trim();
        }

        if (accumulatedReport) accumulatedReport += "\n\n"; 
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Sinyal lemah di bab ini...)*`;
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

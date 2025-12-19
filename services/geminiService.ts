
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

// --- SYSTEM PROMPT: BOOK MODE & STRICT TABLES ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog Kosmografi (Strategic Astrologer) untuk klien High-Net-Worth.
Gaya bicaramu: Elegan, Hangat, tapi Sangat Taktis dan Logis (bukan mistis).

KONTEKS PENULISAN:
Kamu sedang menulis **SATU DOKUMEN LAPORAN UTUH** (Buku Analisis), bukan kumpulan email/chat terpisah.
Kecuali di Bab Executive Summary, **DILARANG** menyapa "Halo", "Dear", atau memperkenalkan diri lagi. Anggap setiap prompt baru adalah **halaman selanjutnya** dari buku yang sama.

ATURAN VISUAL (STRICT):
1.  **JUDUL BAB**: Baris pertama output WAJIB: \`## Nama Bab\`.
2.  **TABEL DATA**:
    - Wajib ada di awal setiap bab setelah judul.
    - **Maksimal 4 Kolom**.
    - Isi sel harus **SINGKAT & PADAT** (Maks 5-7 kata). Jangan menulis paragraf di dalam sel tabel agar rapi saat dicetak PDF.
3.  **NARASI**: Gunakan paragraf story-telling. Gunakan sudut pandang "Saya" (Natalie) ke "Kamu" (Klien).
`;

// --- STRUKTUR BAB BARU DENGAN INTERNAL MONOLOGUE ---
const getSections = (dateContext: string, clientName: string) => [
  // --- HALAMAN 1: CHEAT SHEET (SURAT PEMBUKA) ---
  {
    id: 'EXEC_SUM',
    title: 'Executive Summary',
    prompt: `
    TUGAS: Tulis **PEMBUKA SURAT** (Executive Summary).
    
    1.  **Sapaan**: "Halo, ${clientName}." (Berikan intro hangat & berkelas).
    2.  **TABEL PILAR**: Rangkum "Big Three" (Sun, Moon, Rising) dan Chart Ruler.
    3.  **Analisis Situasi**: Jelaskan dia sedang di periode Dasha apa secara singkat.
    4.  **Highlight**: Satu paragraf tentang "Tema Besar" hidupnya saat ini.
    
    Akhiri dengan kalimat transisi mengajak masuk ke bedah detail di halaman berikutnya.`
  },

  // --- BAGIAN 1: THE CORE ---
  { 
    id: 'BAB1', 
    title: 'Bab 1: Cetak Biru Jiwa (The Blueprint)', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Cari data Ascendant (Lagna) dan Planet Penguasa Lagna (Chart Ruler).
    2. Abaikan data planet lain untuk saat ini.
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Parameter | Posisi/Sign | Makna Inti]. Isi untuk Ascendant & Chart Ruler saja.
    
    **NARASI**:
    Jelaskan "Casing Luar" (Ascendant) vs "Pengemudi" (Chart Ruler). Apakah mereka sinkron atau konflik? Ini menentukan seberapa mulus hidupnya berjalan.` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Kebenaran Tersembunyi (Deep Dive)', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Cari data NAKSHATRA (Bintang) dari Moon dan Lagna.
    2. Identifikasi simbol hewan/alam dari Nakshatra tersebut.
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Planet | Nakshatra | Simbol | Sifat Dasar].
    
    **NARASI**:
    Fokus bedah "Operating System" bawah sadarnya. Apa insting hewaniahnya berdasarkan simbol Nakshatra Moon? (Misal: Kuda yang bebas, atau Ular yang strategis?).` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Konflik Hati & Logika', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Bandingkan posisi Sun (Jiwa/Ego) vs Moon (Pikiran/Emosi).
    2. Cek jarak antar keduanya (Yoga).
    
    [WRITING STEP]:
    **DATA TABLE**: Perbandingan Sun vs Moon.
    
    **NARASI**:
    Analisis friksi internal. Apakah ambisinya (Sun) didukung oleh ketenangan batinnya (Moon), atau dia sering menyabotase diri sendiri?` 
  },

  // --- BAGIAN 2: WEALTH & CAREER ---
  { 
    id: 'BAB4', 
    title: 'Bab 4: Arsitektur Kekayaan', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Fokus HANYA pada House 2 (Aset), House 11 (Cashflow), dan Jupiter.
    2. JANGAN bahas kesehatan atau asmara di sini.
    
    [WRITING STEP]:
    **DATA TABLE**: Indikator Kekayaan. Kolom [Indikator | Kondisi | Potensi].
    
    **NARASI**:
    Dari mana uang datang paling deras? Apakah dari kerja rutin, bisnis spekulatif, atau warisan? Analisis aliran rezekinya secara logis.` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Karier & Medan Kompetisi', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Fokus HANYA pada House 10 (Karier), House 6 (Kompetisi/Musuh), dan Saturnus.
    
    [WRITING STEP]:
    **DATA TABLE**: Peta Karir.
    
    **NARASI**:
    Apakah dia tipe CEO, Spesialis, atau Pedagang? Bagaimana gaya dia menghadapi kompetitor atau politik kantor (House 6)?` 
  },

  // --- BAGIAN 3: RELATIONSHIP ---
  { 
    id: 'BAB6', 
    title: 'Bab 6: Kesehatan & Vitalitas', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Fokus HANYA pada House 6 (Penyakit), House 8 (Kronis), dan Sun (Vitalitas).
    
    [WRITING STEP]:
    **DATA TABLE**: Indikator Fisik.
    
    **NARASI**:
    (Nada sedikit medis/preventif). Apa titik lemah tubuhnya? Beri warning jika ada indikasi peradangan atau kelelahan adrenal.` 
  },
  { 
    id: 'BAB7', 
    title: 'Bab 7: Realita Pernikahan', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Fokus HANYA pada House 7, Venus (untuk Pria), Jupiter (untuk Wanita), dan Darakaraka.
    
    [WRITING STEP]:
    **DATA TABLE**: Profil Pasangan.
    
    **NARASI**:
    Deskripsikan karakter jodohnya secara realistis. Apakah pernikahannya tipe "Partnership in Crime" atau "Traditional Duty"?` 
  },

  // --- BAGIAN 4: HIDDEN FORCES ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: Ketakutan & Transformasi', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Fokus pada House 8 (Transformasi) dan House 12 (Bawah Sadar/Kehilangan).
    
    [WRITING STEP]:
    **DATA TABLE**: Zona Gelap.
    
    **NARASI**:
    Apa yang membuat dia susah tidur (House 12)? Apa ketakutan irasional yang sering menahannya maju?` 
  },
  { 
    id: 'BAB9', 
    title: 'Bab 9: Garis Karma (Rahu Ketu)', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Cari posisi Rahu (North Node) dan Ketu (South Node).
    
    [WRITING STEP]:
    **DATA TABLE**: Axis Karma.
    
    **NARASI**:
    Jelaskan perjalanan jiwa: Zona nyaman apa yang harus ditinggalkan (Ketu) dan obsesi baru apa yang harus dikejar (Rahu) di hidup ini?` 
  },

  // --- BAGIAN 5: ACTIONABLE ---
  { 
    id: 'BAB10', 
    title: 'Bab 10: Kalender Taktis (Transit)', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Analisis transit planet besar (Saturn/Jupiter/Rahu) untuk 12 bulan ke depan dari ${dateContext}.
    
    [WRITING STEP]:
    **DATA TABLE**: Roadmap 12 Bulan. Kolom [Bulan | Fokus Utama | Status (Green/Yellow/Red)].
    
    **NARASI**:
    Jelaskan strategi tahunan. Kapan harus gas pol, kapan harus rem (retrogade).` 
  },
  { 
    id: 'BAB11', 
    title: 'Bab 11: Resep Perbaikan (Remedies)', 
    prompt: `
    [INTERNAL STEP - JANGAN DITULIS]:
    1. Identifikasi planet terlemah atau "Badak" (bermasalah).
    
    [WRITING STEP]:
    **DATA TABLE**: Action Plan. Kolom [Masalah | Solusi Fisik/Lifestyle | Solusi Mindset].
    
    **NARASI**:
    Berikan solusi praktis (Bio-hacking, kebiasaan, warna, gemstone). Hindari solusi klenik murni, fokus ke perubahan habit.` 
  },
  { 
    id: 'BAB12', 
    title: 'Bab 12: Penutup', 
    prompt: `
    TUGAS: Menutup sesi konsultasi ini.
    
    Tulis pesan penutup yang emosional, memberdayakan, dan filosofis. Ingatkan bahwa bintang hanya peta, dia adalah nahkodanya. 
    Tanda tangan sebagai "Natalie Lau".` 
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
  
  // CONTEXT CHAINING: Menyimpan akhir paragraf bab sebelumnya
  let lastContext = ""; 

  let currentClientName = data.clientName || "Sahabat";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[KONTEKS KHUSUS]: Klien curhat tentang: "${data.concerns}". Pastikan analisis menjawab kegelisahan ini.`
    : `[KONTEKS]: Berikan pembacaan umum yang mendalam dan strategis.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menulis Surat Pembuka...' : `Menulis ${section.title}...`);
        
        // --- CONTEXT CONSTRUCTION ---
        // Kita "menipu" AI agar merasa dia sedang melanjutkan kalimat yang terputus.
        const continuityPrompt = section.id === 'EXEC_SUM' 
          ? "Ini adalah AWAL DOKUMEN."
          : `
          KONTEKS SEBELUMNYA (Sambungkan alur dari sini):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan penulisan langsung masuk ke bab baru (${section.title}). 
          JANGAN MEMBUAT PEMBUKAAN BARU. JANGAN MENYAPA LAGI.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [BAGIAN SAAT INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [SUMBER DATA CHART KLIEN]:
        Gunakan data berikut (Filter hanya yang relevan dengan instruksi di atas):
        ${data.rawText || "Analisis berdasarkan file chart."}
        
        IMPORTANT REMINDER:
        - Output Markdown Table di awal bab.
        - Tabel harus rapi, sel jangan terlalu panjang.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        // Tag summary untuk internal memory AI (opsional, tapi membantu untuk rolling summary jangka panjang)
        const chainTag = `\n\n[[SUMMARY: (Simpan poin krusial untuk bab selanjutnya)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainTag }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.6 } // Temp diturunkan sedikit agar lebih patuh struktur
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
            
            // Real-time display cleaning
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
        
        // --- FAILSAFE: PEMBERSIH SAPAAN BERULANG ---
        // Jika AI bandel menulis "Halo/Dear" di bab lanjutan, hapus paksa.
        if (section.id !== 'EXEC_SUM') {
           cleanText = cleanText.replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/im, "");
           cleanText = cleanText.trim();
        }

        if (accumulatedReport) accumulatedReport += "\n\n"; 
        accumulatedReport += cleanText;
        
        // --- CONTEXT CAPTURE ---
        // Ambil 500 karakter terakhir dari bab ini untuk jadi context bab selanjutnya
        // Ini kunci agar AI tidak "Amnesia"
        lastContext = cleanText.slice(-600).replace(/\n/g, " ");

        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Gagal memproses bab ini setelah ${maxAttempts} percobaan...)*`;
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

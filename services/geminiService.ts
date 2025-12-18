import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

const PRICING = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-preview': { input: 2.00, output: 12.00 }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "SAAT INI";
  const date = new Date(dateString + "-01"); 
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }).toUpperCase();
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SYSTEM PROMPT: BAHASA MANUSIA & FORMAT STRICT ---
const NATALIE_SYSTEM_PROMPT = `

Kamu adalah Natalie Lau, seorang konsultan Cosmography yang cerdas, hangat, dan sangat praktis.

TARGET AUDIENCE: 
Orang modern awam yang ingin solusi nyata, bukan kuliah filsafat yang membingungkan.

GAYA BAHASA (TONE OF VOICE):
1.  **Bahasa Manusia Bumi**: Gunakan Bahasa Indonesia yang mengalir, populer, dan enak dibaca (seperti novel best-seller atau artikel majalah premium).
2.  **Anti-Ribet**: JANGAN gunakan kalimat bertingkat yang terlalu panjang. Pecah menjadi kalimat-kalimat pendek yang punchy.
3.  **Jelaskan Istilah**: Jika terpaksa menyebut istilah astrologi (misal: "Lagna" atau "Dasha"), WAJIB langsung jelaskan artinya dalam kurung atau analogi sederhana. Contoh: "House 2 (Sektor Keuangan)".
4.  **Analogi Nyata**: Gunakan perumpamaan dunia kerja, bisnis, atau percintaan sehari-hari agar klien langsung paham.

ATURAN FORMAT (WAJIB PATUH):
1.  **TABEL MARKDOWN**: 
    Setiap kali menampilkan data, GUNAKAN FORMAT INI:
    | Parameter | Detail | Makna |
    | :--- | :--- | :--- |
    | Sun | Leo | Ego Tinggi |
    
    JANGAN PERNAH gunakan format CSV ("A","B") atau List biasa.
2.  **Sub-Heading**: Gunakan ### untuk memecah paragraf panjang.
3.  **Sapaan**: HANYA sapa di Bab 1. Bab 2-18 langsung masuk materi.
`;

// --- STRUKTUR LENGKAP 18 BAB ---
const getSections = (dateContext: string, clientName: string) => [
  // IDENTITAS (Bab 1-2)
  { 
    id: 'BAB1', 
    title: 'Bab 1: Siapa Anda Sebenarnya? (Analisis Lagna)', 
    prompt: `Analisis karakter dasar [[NAME: ${clientName}]].
    1. [WAJIB] Buat Tabel Data Lahir (Markdown) berisi: Planet, Zodiak, House.
    2. Jelaskan "Lagna" sebagai filter kacamata mental mereka.
    3. Apa 1 Kekuatan Super & 1 Kelemahan Fatal mereka?` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Kepala vs Hati (Sun & Moon)', 
    prompt: `Analisis Matahari (Ego) & Bulan (Emosi).
    1. Buat Tabel Perbandingan: | Planet | Kebutuhan | Cara Memenuhi |.
    2. Apakah logika & perasaan mereka sinkron atau sering perang?` 
  },

  // MATERIAL (Bab 3-5)
  { 
    id: 'BAB3', 
    title: 'Bab 3: Sumber Uang (House 2)', 
    prompt: `Analisis Keuangan.
    1. Buat Tabel Sumber Rezeki: | Indikator | Potensi | Saran |.
    2. Dari mana uang datang paling mudah? (Kerja/Bisnis/Hoki).` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Gaya Komunikasi & Skill (House 3)', 
    prompt: `Analisis Komunikasi & Mental.
    - Apakah mereka tipe pemikir cepat atau overthinking?
    - Gaya bicara: Tajam, manis, atau diplomatis?` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Rutinitas & Kompetisi (House 6)', 
    prompt: `Analisis Kerja Harian & Musuh.
    - Cara menghadapi konflik kerja (Lawan atau Lari?).
    - Titik lemah kesehatan fisik yang wajib dijaga.` 
  },

  // EMOSIONAL (Bab 6-7)
  { 
    id: 'BAB6', 
    title: 'Bab 6: Ketenangan Batin (House 4)', 
    prompt: `Analisis Rumah & Ibu.
    - Definisi "Bahagia" bagi batin mereka.
    - Hubungan dengan Ibu & potensi aset properti.` 
  },
  { 
    id: 'BAB7', 
    title: 'Bab 7: Kreativitas & Hoki (House 5)', 
    prompt: `Analisis Kecerdasan & Cinta.
    - Bakat alami (Talenta) yang bisa diuangkan.
    - Gaya pacaran: Romantis, Dingin, atau Posesif?` 
  },

  // HUBUNGAN (Bab 8)
  { 
    id: 'BAB8', 
    title: 'Bab 8: Jodoh & Partner (House 7)', 
    prompt: `Analisis Pasangan Hidup.
    1. Buat Tabel Jodoh: | Tipe Ideal | Tipe Realita | Potensi Masalah |.
    2. Solusi konkret untuk hubungan langgeng.` 
  },

  // SPIRITUAL & KRISIS (Bab 9-10)
  { 
    id: 'BAB9', 
    title: 'Bab 9: Sisi Gelap & Transformasi (House 8)', 
    prompt: `Analisis Krisis.
    - Ketakutan terbesar yang disembunyikan.
    - Potensi warisan atau uang orang lain.` 
  },
  { 
    id: 'BAB10', 
    title: 'Bab 10: Keberuntungan (House 9)', 
    prompt: `Analisis House 9 (Luck Factor).
    - Di mana letak keberuntungan terbesar?
    - Hubungan dengan Ayah/Mentor.` 
  },

  // PENCAPAIAN (Bab 11-13)
  { 
    id: 'BAB11', 
    title: 'Bab 11: Puncak Karier (House 10)', 
    prompt: `Analisis Reputasi.
    1. Buat Tabel Profesi: | Bidang Cocok | Alasan Astrologi |.
    2. Citra diri di mata publik.` 
  },
  { 
    id: 'BAB12', 
    title: 'Bab 12: Network & Uang Besar (House 11)', 
    prompt: `Analisis Komunitas.
    - Lingkaran teman yang menguntungkan vs toxic.
    - Sumber "Uang Besar" (Liquid Cash).` 
  },
  { 
    id: 'BAB13', 
    title: 'Bab 13: Bawah Sadar (House 12)', 
    prompt: `Analisis Isolasi.
    - Penyebab susah tidur/cemas.
    - Potensi sukses di luar negeri.` 
  },

  // KARMA (Bab 14-15)
  { 
    id: 'BAB14', 
    title: 'Bab 14: Obsesi Masa Depan (Rahu)', 
    prompt: `Analisis Rahu (North Node).
    - Area kehidupan yang bikin "Lapar" & Ambisius.
    - Jebakan ilusi yang harus dihindari.` 
  },
  { 
    id: 'BAB15', 
    title: 'Bab 15: Pelepasan Masa Lalu (Ketu)', 
    prompt: `Analisis Ketu (South Node).
    - Bakat bawaan lahir (Zona Nyaman).
    - Area yang sering terasa hampa/ingin ditinggalkan.` 
  },

  // PREDIKSI (Bab 16-18)
  { 
    id: 'BAB16', 
    title: 'Bab 16: Periode Saat Ini (Dasha)', 
    prompt: `Analisis Periode Planet yang Aktif SEKARANG.
    - Tema utama hidup saat ini.
    - Fokus: Karier, Cinta, atau Kesehatan?` 
  },
  { 
    id: 'BAB17', 
    title: 'Bab 17: Roadmap 1 Tahun', 
    prompt: `Timeline Strategis 12 Bulan (${dateContext}).
    1. Buat Tabel Roadmap: | Kuartal | Fokus Utama | Saran Taktis |.
    2. Kapan waktu gas pol, kapan waktu rem.` 
  },
  { 
    id: 'BAB18', 
    title: 'Bab 18: Pesan Penutup', 
    prompt: `Rangkuman Eksekutif.
    1. 3 Kekuatan Utama.
    2. 3 Warning Utama.
    3. 1 Mantra Penguat.
    Tutup dengan pesan berkelas.` 
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
  
  // LOGIKA ANTI-REPETISI
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[BACKGROUND INFO]: Klien punya keresahan: "${data.concerns}".
       INSTRUKSI: Gunakan ini sebagai konteks batin saja. JANGAN SEBUT ULANG keresahan ini di teks bab kecuali sangat relevan.`
    : `[BACKGROUND INFO]: Klien ingin analisis potensi terbaik (General).`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(`Menulis ${section.title}...`);
        
        const prompt = `
        NOMOR BAB: ${section.id}
        JUDUL BAB: # ${section.title}
        
        RINGKASAN SEBELUMNYA: ${rollingSummary || "Awal Analisis"}
        
        ${concernContext}
        
        [INSTRUKSI]: ${section.prompt}
        
        [DATA ASTROLOGI]: ${data.rawText || "Lihat file"}

        ATURAN PENULISAN (STRICT):
        1. WAJIB ADA TABEL MARKDOWN (|...|) sesuai instruksi bab.
        2. Gunakan Sub-Heading & Bullet Points.
        3. Bahasa Manusia (Renyah).
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainTag = `\n\n[[SUMMARY: (Rangkum 1 kalimat inti bab ini)]]`;

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
        
        if (accumulatedReport) accumulatedReport += "\n\n"; 
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Gangguan sinyal di Bab ${section.id}. Melanjutkan...)*`;
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
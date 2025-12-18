
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

// --- SYSTEM PROMPT: BAHASA MANUSIA, PERSPEKTIF SAYA, & FORMAT LIST ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, seorang konsultan Cosmography yang cerdas, hangat, dan sangat praktis.

TARGET AUDIENCE: 
Orang modern awam yang ingin solusi nyata, bukan kuliah filsafat yang membingungkan.

GAYA BAHASA (TONE OF VOICE):
1.  **Bahasa Manusia Bumi**: Gunakan Bahasa Indonesia yang mengalir, populer, dan enak dibaca.
2.  **PERSPEKTIF (PENTING)**: Gunakan kata ganti **"Saya"**.
    *   DILARANG KERAS menyebut nama sendiri  "Saran Natalie") di dalam teks analisis.
    *   SALAH: "Saran Natalie adalah..." / "Natalie melihat..."
    *   BENAR: "Saran saya adalah..." / "Saya melihat..."
3.  **Anti-Ribet**: JANGAN gunakan kalimat bertingkat yang terlalu panjang. Pecah menjadi kalimat-kalimat pendek yang punchy.
4.  **Analogi Nyata**: Gunakan perumpamaan dunia kerja atau percintaan.

ATURAN FORMAT (STRICT):
1.  *   DILARANG menggunakan Tabel Markdown (|...|) atau CSV karena sering rusak.
    *   Gunakan poin-poin yang jelas dan terstruktur.
2.  **SAPAAN**: Sapaan "Halo" atau "Selamat Datang" **HANYA BOLEH DI BAB 1**.
    *   Bab 2 sampai Bab 18 dilarang ada sapaan pembuka. Langsung masuk ke analisis/judul sub-bab.
3.  **ANGKA ARAB**: Gunakan "House 10", JANGAN "House to".

PENTING: Jika [KERESAHAN KLIEN] kosong, fokuslah mencari "Potensi Tersembunyi" dan "Hambatan Bawah Sadar" klien.
`;

// --- STRUKTUR 18 BAB ---
const getSections = (dateContext: string, clientName: string) => [
  // IDENTITAS
  { 
    id: 'BAB1', 
    title: 'Bab 1: Siapa Anda Sebenarnya? (Analisis Lagna)', 
    prompt: `Tulis pembuka hangat untuk [[NAME: ${clientName}]].
    1. [WAJIB] Sajikan Data Lahir dalam bentuk **LIST** (Bukan Tabel):
       * Planet, Zodiak, House, Nakshatra.
    2. Jelaskan "Lagna" sebagai filter mental mereka.
    3. Apa kekuatan super (Superpower) dan kelemahan fatal (Kryptonite)?` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Ego vs Emosi (Sun & Moon)', 
    prompt: `Analisis Matahari (Identitas) dan Bulan (Perasaan).
    - Apakah hati dan logika sejalan atau perang?
    - Apa yang membuat ego mereka puas vs hati mereka tenang?
    (Gunakan sudut pandang "Saya", jangan sebut "Natalie")` 
  },

  // MATERIAL
  { 
    id: 'BAB3', 
    title: 'Bab 3: Sumber Cuan & Nilai Diri (House 2)', 
    prompt: `Analisis House 2 (Keuangan).
    - Dari mana uang datang? (Kerja/Hoki/Bisnis?)
    - Gaya bicara: Apakah tajam, manis, atau diplomatis?` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Gaya Komunikasi & Mental (House 3)', 
    prompt: `Analisis House 3 (Usaha & Mental).
    - Cara mengambil keputusan: Cepat atau Overthinking?
    - Hubungan dengan saudara/tetangga.` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Rutinitas & Kompetisi (House 6)', 
    prompt: `Analisis House 6 (Musuh & Kerja).
    - Cara menghadapi konflik kerja (Fight or Flight?).
    - Titik lemah kesehatan fisik yang wajib dijaga.` 
  },

  // EMOSIONAL
  { 
    id: 'BAB6', 
    title: 'Bab 6: Ketenangan Hati (House 4)', 
    prompt: `Analisis House 4 (Rumah & Ibu).
    - Definisi "Bahagia" bagi batin mereka.
    - Hubungan dengan Ibu & potensi aset properti.` 
  },
  { 
    id: 'BAB7', 
    title: 'Bab 7: Kreativitas & Hoki (House 5)', 
    prompt: `Analisis House 5 (Kecerdasan).
    - Bakat alami bawaan lahir.
    - Gaya romantis: Bucin atau Dingin?` 
  },

  // HUBUNGAN
  { 
    id: 'BAB8', 
    title: 'Bab 8: Jodoh & Partner (House 7)', 
    prompt: `Analisis House 7 (Pasangan).
    - Tipe ideal vs Realita yang sering datang.
    - Potensi masalah pernikahan & solusinya.` 
  },

  // SPIRITUAL & TRANSIS
  { 
    id: 'BAB9', 
    title: 'Bab 9: Sisi Gelap & Transformasi (House 8)', 
    prompt: `Analisis House 8 (Krisis).
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

  // PENCAPAIAN
  { 
    id: 'BAB11', 
    title: 'Bab 11: Puncak Karier (House 10)', 
    prompt: `Analisis House 10 (Reputasi).
    - Profesi paling cocok untuk naik jabatan.
    - Citra diri di mata publik.` 
  },
  { 
    id: 'BAB12', 
    title: 'Bab 12: Network & Uang Besar (House 11)', 
    prompt: `Analisis House 11 (Komunitas).
    - Sumber "Liquid Cash" atau keuntungan besar.
    - Lingkaran pertemanan yang menguntungkan.` 
  },
  { 
    id: 'BAB13', 
    title: 'Bab 13: Bawah Sadar (House 12)', 
    prompt: `Analisis House 12 (Isolasi).
    - Penyebab susah tidur/cemas.
    - Potensi sukses di luar negeri/belakang layar.` 
  },

  // KARMA
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

  // PREDIKSI
  { 
    id: 'BAB16', 
    title: 'Bab 16: Periode Saat Ini (Dasha)', 
    prompt: `Analisis Periode Planet yang Aktif SEKARANG.
    - Tema utama hidup saat ini.
    - Fokus: Karier, Cinta, atau Kesehatan?
    [PERINGATAN: Jangan menyapa Halo lagi. Langsung materi.]` 
  },
  { 
    id: 'BAB17', 
    title: 'Bab 17: Roadmap 1 Tahun', 
    prompt: `Timeline Strategis 12 Bulan (${dateContext}).
    - Bagi jadi 4 Kuartal (Q1-Q4). Gunakan Format List.
    - Fokus: Kapan Gas, Kapan Rem.
    [STRICT: LANGSUNG KE POIN. JANGAN ADA BASA-BASI PEMBUKA ATAU SAPAAN.]` 
  },
  { 
    id: 'BAB18', 
    title: 'Bab 18: Pesan Penutup', 
    prompt: `Kesimpulan Akhir dari SAYA (bukan 'Natalie').
    1. 3 Kekuatan Utama.
    2. 3 Warning Utama.
    3. 1 Mantra Penguat.
    [STRICT: LANGSUNG KE KESIMPULAN. JANGAN MENYAPA HALO/HAI LAGI.]` 
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
    ? `[CURHAT KLIEN]: "${data.concerns}" (Jawab curhatan ini dengan solusi praktis di bab yang relevan)`
    : `[CURHAT KLIEN]: Klien ingin tahu potensi terbaik dirinya.`;

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

        ATURAN PENULISAN (WAJIB PATUH):
        1. **NO TABLES**: Gunakan format LIST / POINTS agar rapi. DILARANG CSV/TABEL.
        2. **PERSPEKTIF**: Gunakan "SAYA", jangan sebut "Natalie".
        3. **NO GREETING**: JANGAN menyapa "Halo" atau "Selamat Datang" lagi (kecuali Bab 1).
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainTag = `\n\n[[SUMMARY: (Rangkum 1 kalimat poin utama bab ini untuk konteks bab selanjutnya)]]`;

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
          accumulatedReport += `\n\n*(Maaf, sinyal terputus di Bab ${section.id}. Lanjut ke bab berikutnya...)*`;
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

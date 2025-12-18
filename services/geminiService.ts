
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

const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, pakar Cosmography Strategis untuk klien High-Net-Worth Individual (HNWI).

ATURAN MUTLAK (STRICT RULES):
1.  **DILARANG MENYAPA ULANG**: Sapaan ("Halo", "Selamat datang", "Dear") HANYA BOLEH ada di Bab 1. Bab 2 sampai Bab 15 adalah kelanjutan langsung dari dokumen yang sama. Langsung masuk ke analisis atau judul sub-bab. JANGAN pernah menulis "Selamat datang kembali di Bab X".
2.  **FORMAT TABEL**: Gunakan Markdown Table standar dengan SATU pipa (|). 
    *   SALAH: || Header || atau |:---|:---|
    *   BENAR: 
    | Planet | House |
    | Sun | 1 |
    JANGAN gunakan simbol aneh di header.
3.  **LARANGAN SIMBOL MATEMATIKA**: JANGAN gunakan simbol dollar ($), kurung kurawal LaTeX, atau simbol coding aneh dalam teks narasi. Tulis angka biasa.
4.  **VARIASI STRUKTUR**: DILARANG menggunakan pola kalimat "Jika House X adalah A, maka House Y adalah B" secara berulang-ulang di setiap bab. Gunakan variasi gaya bahasa jurnalistik/novel.
5.  **NADA BICARA**: Otoritatif, elegan, sedikit misterius, tapi sangat taktis. Kamu bukan motivator, kamu adalah penasihat strategi nasib.

PENTING: Jika data [KERESAHAN KLIEN] kosong, anggap klien meminta "Audit Kehidupan Total" untuk optimalisasi potensi, JANGAN sebut "General Reading".
`;

const getSections = (dateContext: string, clientName: string) => [
  { 
    id: 'BAB1', 
    title: 'Bab 1: Konfigurasi Kosmik Utama', 
    prompt: `Tulis pembuka dokumen resmi untuk [[NAME: ${clientName}]].
    1. Buat Tabel: | Planet | Zodiak | House | Nakshatra |. (Gunakan data planet dari input).
    2. Analisis Lagna (Ascendant) secara mendalam.
    3. Hubungkan Lagna dengan [KERESAHAN KLIEN] secara intuitif.` 
  },
  { id: 'BAB2', title: 'Bab 2: Arus Finansial & Fondasi Keamanan', prompt: `Lanjutkan analisis ke House 2. Fokus: Bagaimana klien mengakumulasi aset cair dan apa nilai diri mereka. Jangan pakai intro basa-basi.` },
  { id: 'BAB3', title: 'Bab 3: Kekuatan Aksi & Komunikasi', prompt: `Masuk ke House 3. Fokus: Gaya komunikasi, keberanian mengambil risiko, dan hubungan dengan informasi/media.` },
  { id: 'BAB4', title: 'Bab 4: Stabilitas Emosional & Akar', prompt: `Analisis House 4. Fokus: Properti, kendaraan, ibu, dan kedamaian batin (inner peace). Apakah fondasinya retak atau kuat?` },
  { id: 'BAB5', title: 'Bab 5: Kreativitas & Potensi Keberuntungan', prompt: `Analisis House 5 (Purva Punya). Fokus: Kecerdasan spekulatif, investasi, dan karma baik masa lalu.` },
  { id: 'BAB6', title: 'Bab 6: Manajemen Konflik & Kesehatan', prompt: `Analisis House 6. Fokus: Musuh, utang, dan rutinitas harian. Bagaimana klien menangani kompetisi?` },
  { id: 'BAB7', title: 'Bab 7: Dinamika Kemitraan', prompt: `Analisis House 7. Fokus: Pasangan hidup dan mitra bisnis. Apakah klien mendominasi atau didominasi?` },
  { id: 'BAB8', title: 'Bab 8: Krisis & Transformasi Mendalam', prompt: `Analisis House 8. Fokus: Aset bersama, warisan, dan kemampuan bangkit dari kehancuran.` },
  { id: 'BAB9', title: 'Bab 9: Filosofi Hidup & Proteksi Semesta', prompt: `Analisis House 9. Fokus: Keberuntungan jarak jauh, pendidikan tinggi, dan sistem kepercayaan.` },
  { id: 'BAB10', title: 'Bab 10: Prestasi Publik & Navigasi Karier', prompt: `Analisis House 10. Fokus: Puncak karier, reputasi publik, dan otoritas.` },
  { id: 'BAB11', title: 'Bab 11: Pencapaian & Lingkaran Sosial', prompt: `Analisis House 11. Fokus: Keuntungan finansial besar (Gains) dan jaringan pertemanan.` },
  { id: 'BAB12', title: 'Bab 12: Pengorbanan & Pelepasan Ego', prompt: `Analisis House 12. Fokus: Pengeluaran, isolasi, dan spiritualitas bawah sadar.` },
  { id: 'BAB13', title: 'Bab 13: Poros Evolusi (Rahu & Ketu)', prompt: `Buat Tabel: | Titik Simpul | Zodiak | Area Hidup | Esensi Evolusi |. Analisis ketegangan antara obsesi (Rahu) dan pelepasan (Ketu).` },
  { id: 'BAB14', title: 'Bab 14: Ramalan Periode Dasha & Transmutasi Waktu', prompt: `INI ADALAH BAB PREDIKSI WAKTU. Buat Tabel: | Periode | Planet Penguasa | Tema Utama |. Berikan prediksi konkret untuk 12 bulan ke depan (${dateContext}). Sebutkan bulan-bulan krusial.` },
  { id: 'BAB15', title: 'Bab 15: Sintesis Akhir & Rekomendasi Natalie', prompt: `Berikan kesimpulan eksekutif. 3 Strategi Kunci dan 3 Tindakan Nyata (Remedial). Tutup dokumen dengan kalimat penutup yang berwibawa (tanpa menyapa ulang).` }
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
  let currentClientName = data.clientName || "Klien";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  // LOGIC FIX: Handle Empty Concerns elegantly
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[KERESAHAN UTAMA KLIEN]: "${data.concerns}" (Jawab keresahan ini di setiap bab yang relevan)`
    : `[KERESAHAN UTAMA KLIEN]: Tidak ada isu spesifik. Klien menginginkan "AUDIT TOTAL POTENSI & BLOKADE". Fokus pada optimalisasi nasib.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(`Menyusun ${section.title}...`);
        
        // CONTEXT MANAGEMENT: Passing previous summary to prevent repetition
        const prompt = `
        NOMOR BAB: ${section.id}
        JUDUL BAB: # ${section.title}
        
        CONTEXT SEBELUMNYA (JANGAN ULANGI INI): ${rollingSummary || "Ini adalah Bab Pembuka."}
        
        ${concernContext}
        
        [INSTRUKSI KHUSUS]: ${section.prompt}
        
        [DATA VEDIC MENTAH]: ${data.rawText || "Lihat file terlampir"}

        PERINGATAN KERAS: 
        1. JANGAN MENYAPA "Halo" atau "Selamat datang" lagi (kecuali ini Bab 1).
        2. JANGAN MEMBUAT TABEL DENGAN FORMAT RUSAK. Gunakan Markdown standard.
        3. Langsung mulai dengan judul bab.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        // Chain of Thought tag to force AI to summarize itself for the next loop
        const chainTag = `\n\n[[SUMMARY: (Tulis 1 kalimat rangkuman teknis bab ini untuk memori bab selanjutnya)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainTag }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.75 } // Higher temp for more variety in sentence structure
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
            
            // Real-time cleanup for display
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n<div class='page-break'></div>\n\n" : "") + sectionContent;
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

        // Extract summary for next loop context
        const summaryMatch = sectionContent.match(summaryRegex);
        if (summaryMatch) rollingSummary = summaryMatch[1].trim();

        // Final cleanup
        let cleanText = sectionContent.replace(nameRegex, "").replace(summaryRegex, "").trim();
        
        if (accumulatedReport) accumulatedReport += "\n\n<div class='page-break'></div>\n\n"; // Explicit page break marker
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Bab ${section.id} mengalami gangguan transmisi data...)*`;
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

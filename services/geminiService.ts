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

// REVISI TOTAL SYSTEM PROMPT: Fokus pada bahasa yang Jelas, Renyah, dan Manusiawi.
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, seorang konsultan Cosmography yang cerdas, hangat, dan sangat praktis.

TARGET AUDIENCE: 
Orang modern awam yang ingin solusi nyata, bukan kuliah filsafat yang membingungkan.

GAYA BAHASA (TONE OF VOICE):
1.  **Bahasa Manusia Bumi**: Gunakan Bahasa Indonesia yang mengalir, populer, dan enak dibaca (seperti novel best-seller atau artikel majalah premium).
2.  **Anti-Ribet**: JANGAN gunakan kalimat bertingkat yang terlalu panjang. Pecah menjadi kalimat-kalimat pendek yang punchy.
3.  **Jelaskan Istilah**: Jika terpaksa menyebut istilah astrologi (misal: "Lagna" atau "Dasha"), WAJIB langsung jelaskan artinya dalam kurung atau analogi sederhana. Contoh: "House 2 (Sektor Keuangan)".
4.  **Analogi Nyata**: Gunakan perumpamaan dunia kerja, bisnis, atau percintaan sehari-hari agar klien langsung paham.

ATURAN FORMAT (STRICT):
1.  **TABEL**: Wajib gunakan format Markdown Table standar dengan garis tegak lurus.
    CONTOH BENAR:
    | Planet | Posisi |
    | :--- | :--- |
    | Sun | House 1 |
    
    DILARANG format CSV atau list biasa.
2.  **SAPAAN**: Sapaan "Halo" atau "Selamat Datang" HANYA BOLEH di Bab 1. Bab selanjutnya langsung masuk pembahasan.
3.  **NO GHOST CODE**: JANGAN pernah menulis simbol coding seperti $kc-3$, {{var}}, atau LaTeX yang tidak perlu. Tulis angka biasa.
4.  **ANGKA ARAB**: Gunakan "House 10", JANGAN "House to" atau "House X".

PENTING: Jika [KERESAHAN KLIEN] kosong, fokuslah mencari "Potensi Tersembunyi" dan "Hambatan Bawah Sadar" klien.
`;

const getSections = (dateContext: string, clientName: string) => [
  { 
    id: 'BAB1', 
    title: 'Bab 1: Siapa Anda Sebenarnya? (Analisis Lagna)', 
    prompt: `Tulis pembuka hangat untuk [[NAME: ${clientName}]].
    1. Buat Tabel: | Planet | Zodiak | House | Nakshatra |.
    2. Jelaskan "Lagna" (Ascendant) sebagai "Karakter Dasar" mereka dengan bahasa yang sangat mudah dimengerti.
    3. Apa kekuatan super mereka dan apa kelemahan utamanya?` 
  },
  { id: 'BAB2', title: 'Bab 2: Potensi Rezeki & Keuangan', prompt: `Analisis House 2 & 11. Fokus: Dari mana uang mereka datang? Apakah dari kerja keras, keberuntungan, atau ide? Beri saran praktis cara mengatur uang sesuai pola bintang mereka.` },
  { id: 'BAB3', title: 'Bab 3: Gaya Komunikasi & Mental', prompt: `Analisis House 3. Fokus: Bagaimana cara mereka bicara? Apakah mereka tipe pemikir overthinking atau tipe eksekutor?` },
  { id: 'BAB4', title: 'Bab 4: Ketenangan Hati & Keluarga', prompt: `Analisis House 4. Fokus: Apa yang membuat hati mereka damai? Bagaimana hubungan dengan Ibu/Rumah?` },
  { id: 'BAB5', title: 'Bab 5: Bakat Kreatif & Hoki', prompt: `Analisis House 5 & 9. Fokus: Apa bakat alami yang mereka bawa lahir? Di mana letak faktor "hoki" mereka?` },
  { id: 'BAB6', title: 'Bab 6: Cara Menghadapi Masalah', prompt: `Analisis House 6. Fokus: Saat ada masalah atau konflik kerja, bagaimana cara terbaik mereka menyelesaikannya?` },
  { id: 'BAB7', title: 'Bab 7: Jodoh & Partner Bisnis', prompt: `Analisis House 7. Fokus: Tipe pasangan seperti apa yang cocok? Apakah mereka dominan atau penurut?` },
  { id: 'BAB8', title: 'Bab 8: Sisi Gelap & Transformasi', prompt: `Analisis House 8 & 12. Fokus: Apa ketakutan terbesar mereka? Bagaimana cara mereka bangkit dari kegagalan?` },
  { id: 'BAB9', title: 'Bab 9: Karier & Reputasi Publik', prompt: `Analisis House 10. Fokus: Pekerjaan apa yang paling cocok? Apakah cocok jadi bos, profesional, atau seniman?` },
  { id: 'BAB13', title: 'Bab 10: Misi Jiwa (Rahu & Ketu)', prompt: `Buat Tabel: | Titik | Fokus | Tantangan |. Jelaskan Rahu (Obsesi masa depan) dan Ketu (Beban masa lalu) dengan bahasa sederhana tanpa mistis berlebihan.` },
  { id: 'BAB14', title: 'Bab 11: Prediksi 1 Tahun Ke Depan', prompt: `Buat Tabel Timeline 12 Bulan (${dateContext}). Fokus: Kapan waktu gas pol? Kapan waktu rem? Berikan prediksi konkret dan saran tindakan nyata.` },
  { id: 'BAB15', title: 'Bab 12: Kesimpulan & Pesan Akhir', prompt: `Rangkum semua jadi 3 Poin Kunci yang mudah diingat. Berikan satu kalimat mantra penguat untuk mereka. Tutup dengan hangat.` }
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
    ? `[CURHAT KLIEN]: "${data.concerns}" (Jawab curhatan ini dengan solusi praktis)`
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

        INGAT: Gunakan bahasa populer, mudah dimengerti, paragraf pendek.
        JANGAN buat tabel rusak. JANGAN menyapa ulang.
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
            
            // REVISI LAYOUT: Menghapus "<div class='page-break'>" manual
            // Kita biarkan komponen ReportView menangani page break via Judul H1
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
        
        // Cukup tambahkan newlines, jangan tambah page break string manual
        // karena setiap Section dimulai dengan '# Judul' yang akan otomatis di-page break oleh ReportView
        if (accumulatedReport) accumulatedReport += "\n\n"; 
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Maaf, Natalie kehilangan sinyal saat menulis Bab ${section.id}. Kita lanjut ke bab berikutnya...)*`;
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
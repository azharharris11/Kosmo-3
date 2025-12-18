
import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

/**
 * PRICING 2025 (Per 1,000,000 Tokens)
 * Ref: https://ai.google.dev/gemini-api/docs/pricing
 */
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
Kamu adalah Natalie Lau, seorang konsultan Cosmography (Vedic Astrology) dengan gaya bicara "Wise & Grounded Counselor".
Pedoman bahasamu:
1. Jelas & Bermakna: Berikan insight yang dalam tapi langsung ke inti masalah. Jangan bertele-tele.
2. Hangat tapi Profesional: Puitis sewajarnya saja untuk memberi kenyamanan, jangan terlalu berbunga-bunga.
3. Struktur Narasi & Tabel: Selain narasi yang mengalir, kamu WAJIB menyajikan data teknis dalam bentuk TABEL Markdown pada bagian-bagian yang diinstruksikan agar klien mendapatkan ringkasan data yang rapi.
4. Edukatif: Jelaskan istilah teknis (Lagna, Houses, Dasha) dengan bahasa sehari-hari.
5. Fokus pada Solusi: Bantu klien memahami pola batin mereka.
6. Konsistensi: Hubungkan narasi antar bab dengan logis.
`;

const getSections = (dateContext: string, clientName: string) => [
  { 
    id: 'BAB1', 
    title: 'Bab 1: Lagna & Ringkasan Placements', 
    prompt: `Sapa klien dengan hangat. Cari Nama Klien di data, tulis [[NAME: Nama]]. 
    TUGAS KHUSUS: Buat tabel Markdown "Ringkasan Penempatan Planet" yang berisi kolom: Planet, Zodiak, House, dan Nakshatra (untuk 9 Planet + Lagna). 
    Lalu berikan narasi tentang Lagna sebagai filter utama hidup mereka.` 
  },
  { id: 'BAB2', title: 'Bab 2: Finansial & Nilai Diri', prompt: `Bahas House 2. Fokus pada cara mereka mencari keamanan finansial dan apa yang mereka hargai secara personal.` },
  { id: 'BAB3', title: 'Bab 3: Inisiatif & Komunikasi', prompt: `Bahas House 3. Kekuatan kemauan, cara bicara, dan bagaimana mereka mengeksekusi ide.` },
  { id: 'BAB4', title: 'Bab 4: Ketenangan Batin & Ibu', prompt: `Bahas House 4. Hubungan dengan keluarga dan apa yang membuat mereka merasa aman secara emosional.` },
  { id: 'BAB5', title: 'Bab 5: Talenta & Intuisi', prompt: `Bahas House 5. Kreativitas, kecerdasan bawaan, dan hal-hal yang mereka sukai secara murni.` },
  { id: 'BAB6', title: 'Bab 6: Disiplin & Hambatan', prompt: `Bahas House 6. Cara menghadapi konflik, rutinitas kesehatan, dan rintangan harian.` },
  { id: 'BAB7', title: 'Bab 7: Dinamika Hubungan', prompt: `Bahas House 7. Interaksi dengan orang lain, pasangan, dan kontrak sosial.` },
  { id: 'BAB8', title: 'Bab 8: Transformasi & Krisis', prompt: `Bahas House 8. Kejadian tak terduga, kedalaman batin, dan kebangkitan diri.` },
  { id: 'BAB9', title: 'Bab 9: Filosofi & Keberuntungan', prompt: `Bahas House 9. Pandangan spiritual, figur guru/ayah, dan faktor keberuntungan.` },
  { id: 'BAB10', title: 'Bab 10: Karier & Kontribusi Publik', prompt: `Bahas House 10. Peran di masyarakat, pencapaian profesional, dan tanggung jawab.` },
  { id: 'BAB11', title: 'Bab 11: Pencapaian & Koneksi', prompt: `Bahas House 11. Keuntungan finansial, pertemanan, dan ambisi jangka panjang.` },
  { id: 'BAB12', title: 'Bab 12: Refleksi & Pelepasan', prompt: `Bahas House 12. Hal-hal di balik layar, pengeluaran, dan kebutuhan untuk healing.` },
  { id: 'BAB13', title: 'Bab 13: Poros Rahu & Ketu (Shadow Work)', prompt: `TUGAS KHUSUS: Buat tabel singkat "Poros Evolusi Jiwa" (Rahu vs Ketu). Berikan narasi tentang obsesi dan area pelepasan mereka.` },
  { 
    id: 'BAB14', 
    title: 'Bab 14: Navigasi Waktu (Dasha)', 
    prompt: `TUGAS KHUSUS: Buat tabel "Urutan Dasha Saat Ini" yang menunjukkan periode planet penguasa saat ini dan sub-periodenya. 
    Lalu jelaskan energi yang mendominasi di bulan ${dateContext} secara praktis.` 
  },
  { id: 'BAB15', title: 'Bab 15: Natalie\'s Guidance & Remedy', prompt: `Berikan saran praktis (Remedy) untuk menyeimbangkan energi. Tutup surat dengan pesan penguat yang jelas.` }
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
  let rollingContext = ""; 
  let currentClientName = data.clientName || "Sahabat";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(`Natalie menganalisis ${section.title}... ${attempts > 0 ? `(Mencoba lagi ${attempts})` : ''}`);
        
        const prompt = `
        [KONTEKS SEBELUMNYA]: ${rollingContext || "Awal sesi."}
        [KERESAHAN KLIEN]: "${data.concerns || "Umum"}"
        [TUGAS]: ${section.prompt}
        [DATA VEDIC]: ${data.rawText || "Lihat file"}
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainPrompt = `\n\n[[CONTEXT_FOR_NEXT: (Rangkuman teknis singkat bab ini untuk memandu Natalie di bab berikutnya)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainPrompt }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 }
        });

        let sectionContent = "";
        const nameRegex = /\[\[NAME:\s*(.*?)\]\]/i;
        const contextRegex = /\[\[CONTEXT_FOR_NEXT:\s*(.*?)\]\]/is;

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sectionContent += text;
            if (section.id === 'BAB1') {
              const nameMatch = sectionContent.match(nameRegex);
              if (nameMatch && onNameDetected) onNameDetected(nameMatch[1].trim());
            }
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n" : "") + sectionContent;
            displayContent = displayContent.replace(nameRegex, "").replace(contextRegex, "").trim();
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

        const contextMatch = sectionContent.match(contextRegex);
        if (contextMatch) rollingContext = contextMatch[1].trim();

        let cleanText = sectionContent.replace(nameRegex, "").replace(contextRegex, "").trim();
        if (accumulatedReport) accumulatedReport += "\n\n";
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Natalie melewati analisis Bab ${section.id} karena gangguan energi, dilanjutkan ke bab berikutnya...)*`;
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

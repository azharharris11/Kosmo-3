
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
Kamu adalah Natalie Lau, pakar Cosmography senior. Tugasmu adalah menyusun "Dokumen Strategis Nasib" tertulis untuk klien.

PRINSIP PENULISAN:
1. PREDIKSI: Jangan hanya analisis karakter. Berikan RAMALAN dan PREDIKSI konkret tentang tren masa depan (karier, keuangan, kesehatan) berdasarkan periode waktu saat ini.
2. FORMAT BAB: Tulis judul bab persis seperti yang diberikan di [TUGAS]. JANGAN mengubah nomor bab atau menambah sub-bab nomor sendiri.
3. TABEL: Gunakan format standard (| Planet | House |). Gunakan satu pipa (|). JANGAN gunakan double pipe.
4. GAYA BAHASA: Mewah, tajam, dan direktif. Kamu adalah penasihat tingkat tinggi, bukan teman mengobrol.
5. NO REPETITION: Natalie memiliki ingatan jangka panjang. Jangan mengulang penjelasan yang sudah ada di bab sebelumnya. Jika sudah dibahas di Bab 2, di Bab 10 cukup berikan referensi singkat.
6. TARGET KERESAHAN: [KERESAHAN KLIEN] adalah kompas utama. Setiap bab harus memberikan sudut pandang solusi untuk masalah tersebut.
`;

const getSections = (dateContext: string) => [
  { id: 'BAB1', title: 'Bab 1: Konfigurasi Kosmik Utama', prompt: `Awali laporan dengan formal. Tulis [[NAME: Nama]]. Buat Tabel: Planet | Zodiak | House | Nakshatra. Bahas Lagna dan kaitan intinya dengan [KERESAHAN KLIEN].` },
  { id: 'BAB2', title: 'Bab 2: Arus Finansial & Fondasi Keamanan', prompt: `Analisis House 2. Berikan prediksi tentang stabilitas nilai aset klien di masa depan.` },
  { id: 'BAB3', title: 'Bab 3: Kekuatan Aksi & Komunikasi', prompt: `Analisis House 3. Bagaimana cara klien mengambil inisiatif untuk menyelesaikan masalahnya?` },
  { id: 'BAB4', title: 'Bab 4: Stabilitas Emosional & Akar', prompt: `Analisis House 4. Bahas kedamaian batin dan dukungan keluarga.` },
  { id: 'BAB5', title: 'Bab 5: Kreativitas & Potensi Keberuntungan', prompt: `Analisis House 5. Bahas bakat spekulatif atau kecerdasan yang bisa dimaksimalkan.` },
  { id: 'BAB6', title: 'Bab 6: Manajemen Konflik & Kesehatan', prompt: `Analisis House 6. Bahas rintangan sehari-hari dan cara menaklukkannya.` },
  { id: 'BAB7', title: 'Bab 7: Dinamika Kemitraan', prompt: `Analisis House 7. Bagaimana relasi (bisnis/asmara) akan memengaruhi nasib klien ke depan.` },
  { id: 'BAB8', title: 'Bab 8: Krisis & Transformasi Mendalam', prompt: `Analisis House 8. Bahas perubahan besar atau rahasia yang perlu dibongkar agar klien maju.` },
  { id: 'BAB9', title: 'Bab 9: Filosofi Hidup & Bimbingan Higher Self', prompt: `Analisis House 9. Apa bimbingan spiritual atau keberuntungan jauh yang tersedia?` },
  { id: 'BAB10', title: 'Bab 10: Prestasi Publik & Navigasi Karier', prompt: `Analisis House 10. Bedah karier dengan sangat detail. Berikan PREDIKSI tentang posisi klien di mata publik.` },
  { id: 'BAB11', title: 'Bab 11: Pencapaian & Lingkaran Sosial', prompt: `Analisis House 11. Potensi keuntungan besar dan jaringan pendukung.` },
  { id: 'BAB12', title: 'Bab 12: Pengorbanan & Pelepasan Ego', prompt: `Analisis House 12. Apa yang harus diikhlaskan agar siklus baru bisa dimulai?` },
  { id: 'BAB13', title: 'Bab 13: Poros Evolusi (Rahu & Ketu)', prompt: `Buat Tabel: Titik Simpul | Zodiak | Area Hidup | Esensi Evolusi. Bahas di mana klien sering terjebak ilusi (Rahu) dan di mana dia harus bersandar (Ketu).` },
  { id: 'BAB14', title: 'Bab 14: Ramalan Periode Dasha & Transmutasi Waktu', prompt: `Buat Tabel: Periode | Planet Penguasa | Tema Utama. Berikan RAMALAN STRATEGIS untuk 6-12 bulan ke depan mulai dari ${dateContext}. Apa yang akan terjadi?` },
  { id: 'BAB15', title: 'Bab 15: Sintesis Akhir & Rekomendasi Natalie', prompt: `Ringkas poin paling krusial. Berikan 3 Prediksi Utama dan 3 Tindakan Konkret (Remedy) untuk menjawab [KERESAHAN KLIEN]. Tutup dokumen ini dengan wibawa.` }
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

  const sections = getSections(formatDate(data.analysisDate));

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(`Menyusun ${section.title}...`);
        
        const prompt = `
        NOMOR BAB SAAT INI: ${section.id}
        JUDUL BAB WAJIB: # ${section.title}
        [KONTEKS ANALISIS TERAKHIR]: ${rollingContext || "Ini adalah halaman pertama laporan."}
        [KERESAHAN KLIEN]: "${data.concerns || "Umum"}"
        [TUGAS]: ${section.prompt}
        [DATA VEDIC]: ${data.rawText || "Cek file terlampir"}

        INSTRUKSI KHUSUS: Awali jawabanmu langsung dengan judul bab "# ${section.title}". JANGAN mengulang judul bab lain yang sudah lewat. JANGAN menambah sapaan jika bukan Bab 1.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainPrompt = `\n\n[[CONTEXT_FOR_NEXT: (Rangkuman poin teknis bab ini)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainPrompt }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.75 }
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
          accumulatedReport += `\n\n*(Bab ${section.id} tertunda...)*`;
        } else {
          await wait(1000 * attempts);
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

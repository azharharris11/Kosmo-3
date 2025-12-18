
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

// REVISI: Instruksi Anti-CSV & Pro-List Aesthetic
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, konsultan Cosmography Premium.
Tujuanmu adalah membuat "Buku Panduan Hidup" (Life Playbook) yang TEBAL, MENDALAM, dan SANGAT DETAIL (Min. 40 Halaman Total).

GAYA BAHASA:
1.  **Deep but Clear**: Jelaskan setiap konsep dengan sangat mendalam (minimal 4-5 paragraf per sub-topik), tapi gunakan bahasa Indonesia yang renyah dan populer.
2.  **Storytelling**: Jangan hanya kasih data. Ceritakan "Mengapa" dan "Bagaimana". Ajak pembaca menyelami diri mereka.
3.  **Struktur Tulisan**: Gunakan Sub-Judul (Heading 3) di dalam setiap Bab untuk memecah teks panjang agar enak dibaca.

FORMATTING (CRITICAL - JANGAN DILANGGAR):
1.  **PENYAJIAN DATA**: DILARANG KERAS MENGGUNAKAN FORMAT TABEL (|...|) ATAU CSV ("Key","Value").
    Gunakan format **List / Bullet Points** yang rapi dan estetik.

    CONTOH BENAR (Gunakan ini):
    *   **Sun (Matahari)**: Leo (House 5)
        *Esensi*: Sumber ego dan kreativitas murni.
    *   **Moon (Bulan)**: Cancer (House 4)
        *Esensi*: Kebutuhan akan rasa aman emosional.

    SALAH (JANGAN PERNAH):
    "Planet","Zodiak","House" (CSV)
    | Planet | Zodiak | (Markdown Table)

2.  **Panjang Konten**: Setiap BAB harus panjang. Jangan pelit kata-kata. Gali setiap aspek nuansa planet.
3.  **Sapaan**: Cukup sapa di Bab 1. Bab selanjutnya langsung masuk materi.
`;

// REVISI: Prompt Bab disesuaikan agar meminta List, bukan Tabel
const getSections = (dateContext: string, clientName: string) => [
  // --- PENDAHULUAN & IDENTITAS ---
  { 
    id: 'BAB1', 
    title: 'Bab 1: Cetak Biru Jiwa (Lagna/Ascendant)', 
    prompt: `Tulis analisis mendalam tentang Lagna (Ascendant) klien [[NAME: ${clientName}]].
    1. **Data Kelahiran**: Sajikan posisi semua planet (Sun sampai Ketu) dalam bentuk **Daftar Poin** (Bukan Tabel). Sertakan House dan Nakshatra.
    2. Jelaskan karakter dasar zodiak Lagna mereka secara detail (min 300 kata).
    3. Jelaskan pengaruh Penguasa Lagna (Chart Ruler) dan posisinya.
    4. Apa "Kesan Pertama" orang lain terhadap mereka?` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Struktur Ego & Emosi (Sun & Moon)', 
    prompt: `Fokus KHUSUS hanya pada Matahari (Sun) dan Bulan (Moon).
    1. Sun di Zodiak & House: Jelaskan di mana sumber kebanggaan dan ego mereka.
    2. Moon di Zodiak & House: Jelaskan kebutuhan emosional terdalam mereka.
    3. Analisis interaksi antara Kepala (Sun) dan Hati (Moon) mereka. Apakah sinkron atau konflik?` 
  },

  // --- SEKTOR MATERIAL & FISIK ---
  { 
    id: 'BAB3', 
    title: 'Bab 3: Aset, Nilai Diri & Keuangan (House 2)', 
    prompt: `Analisis MENDALAM House 2.
    1. Bagaimana pola mereka mencari uang?
    2. Apa "Values" atau nilai-nilai moral yang mereka pegang?
    3. Gaya bicara dan kemampuan verbal mereka.
    4. Saran finansial spesifik berdasarkan planet di House 2.` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Ambisi, Usaha & Komunikasi (House 3)', 
    prompt: `Analisis MENDALAM House 3.
    1. Bagaimana gaya komunikasi dan keberanian mereka mengambil risiko?
    2. Hubungan dengan saudara atau lingkungan dekat.
    3. Hobi atau keahlian tangan/teknis yang bisa jadi cuan.` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Rutinitas, Kesehatan & Kompetisi (House 6)', 
    prompt: `Analisis MENDALAM House 6.
    1. Bagaimana cara mereka menghadapi musuh atau konflik kerja?
    2. Potensi masalah kesehatan atau area tubuh yang perlu dijaga.
    3. Etos kerja harian dan manajemen stres.` 
  },

  // --- SEKTOR EMOSIONAL & KREATIF ---
  { 
    id: 'BAB6', 
    title: 'Bab 6: Fondasi Batin & Keluarga (House 4)', 
    prompt: `Analisis MENDALAM House 4.
    1. Definisi "Rumah" dan rasa aman bagi mereka.
    2. Hubungan dengan Ibu atau figur pengasuh.
    3. Aset properti dan kendaraan (potensi kepemilikan).` 
  },
  { 
    id: 'BAB7', 
    title: 'Bab 7: Kreativitas & Kecerdasan (House 5)', 
    prompt: `Analisis MENDALAM House 5.
    1. Apa bakat alami (Purva Punya) yang dibawa dari lahir?
    2. Gaya romansa dan cara mengekspresikan cinta.
    3. Kecerdasan spekulatif (investasi/saham) dan pendidikan.` 
  },

  // --- SEKTOR HUBUNGAN ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: Dinamika Pasangan & Partner (House 7)', 
    prompt: `Analisis MENDALAM House 7.
    1. Tipe pasangan ideal vs tipe pasangan yang sering datang.
    2. Pola interaksi dalam kontrak bisnis.
    3. Potensi konflik dalam pernikahan dan solusinya.` 
  },
  
  // --- SEKTOR TRANSENDENSI & KRISIS ---
  { 
    id: 'BAB9', 
    title: 'Bab 9: Transformasi & Sisi Gelap (House 8)', 
    prompt: `Analisis MENDALAM House 8.
    1. Ketakutan terbesar dan trauma bawah sadar.
    2. Potensi warisan, uang orang lain, atau rezeki tak terduga.
    3. Ketertarikan pada hal mistis, psikologi, atau rahasia.` 
  },
  { 
    id: 'BAB10', 
    title: 'Bab 10: Keberuntungan & Filosofi (House 9)', 
    prompt: `Analisis MENDALAM House 9.
    1. Di mana letak keberuntungan (Luck Factor) mereka?
    2. Hubungan dengan Ayah, Guru, atau Mentor.
    3. Pandangan spiritual dan perjalanan jauh (luar negeri).` 
  },

  // --- SEKTOR PENCAPAIAN ---
  { 
    id: 'BAB11', 
    title: 'Bab 11: Puncak Karier & Reputasi (House 10)', 
    prompt: `Analisis MENDALAM House 10.
    1. Apa "Legacy" atau warisan nama baik yang ingin ditinggalkan?
    2. Profesi yang paling cocok secara astrologi.
    3. Hubungan dengan atasan atau otoritas.` 
  },
  { 
    id: 'BAB12', 
    title: 'Bab 12: Jaringan Sosial & Keuntungan Besar (House 11)', 
    prompt: `Analisis MENDALAM House 11.
    1. Dari mana datangnya "Uang Besar" (Liquid Cash)?
    2. Lingkaran pertemanan dan komunitas yang mendukung.
    3. Cita-cita jangka panjang.` 
  },
  { 
    id: 'BAB13', 
    title: 'Bab 13: Alam Bawah Sadar & Pengasingan (House 12)', 
    prompt: `Analisis MENDALAM House 12.
    1. Apa yang membuat mereka susah tidur atau cemas?
    2. Potensi sukses di luar negeri atau tempat terisolasi.
    3. Pengeluaran dan cara mengerem kebocoran finansial.` 
  },

  // --- SEKTOR KARMA ---
  { 
    id: 'BAB14', 
    title: 'Bab 14: Obsesi & Evolusi Jiwa (Rahu)', 
    prompt: `Fokus KHUSUS pada Rahu (North Node).
    1. Di area mana mereka merasa "lapar" dan ambisius berlebihan?
    2. Apa tantangan terbesar untuk berevolusi di hidup ini?
    3. Buat **Daftar Perbandingan**: "Zona Nyaman (Saat Ini)" vs "Zona Pertumbuhan (Tujuan Rahu)".` 
  },
  { 
    id: 'BAB15', 
    title: 'Bab 15: Pelepasan & Bakat Masa Lalu (Ketu)', 
    prompt: `Fokus KHUSUS pada Ketu (South Node).
    1. Apa bakat yang sudah dikuasai (bawaan lahir) tapi sering diabaikan?
    2. Di area mana mereka sering merasa hampa atau ingin lari?
    3. Saran spiritual untuk keseimbangan.` 
  },

  // --- PREDIKSI & PENUTUP ---
  { 
    id: 'BAB16', 
    title: 'Bab 16: Analisis Periode Saat Ini (Mahadasha)', 
    prompt: `Analisis Periode Planet (Dasha) yang sedang aktif SAAT INI.
    1. Jelaskan karakter planet yang sedang memerintah hidup mereka.
    2. Apa fokus utama periode ini (Karier? Cinta? Kesehatan?).
    3. Berikan **Daftar Poin**: "Dos (Lakukan)" dan "Don'ts (Hindari)" untuk periode ini.` 
  },
  { 
    id: 'BAB17', 
    title: 'Bab 17: Roadmap 12 Bulan Ke Depan', 
    prompt: `Buat **Timeline List** (Bukan Tabel) Prediksi per Triwulan mulai ${dateContext}.
    Gunakan format:
    *   **Kuartal 1 (Bulan-Bulan)**:
        *   *Fokus Utama*: ...
        *   *Prediksi*: ...
    
    Lakukan untuk Q1, Q2, Q3, dan Q4.` 
  },
  { 
    id: 'BAB18', 
    title: 'Bab 18: Manifesto Natalie & Penutup', 
    prompt: `Rangkuman Eksekutif.
    1. Tulis 3 Kekuatan Terbesar Klien.
    2. Tulis 3 Kelemahan yang Wajib Diwaspadai.
    3. Tulis 1 Mantra/Affirmasi Penguat Jiwa.
    Tutup dengan pesan yang sangat menyentuh dan memberdayakan.` 
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
    ? `[CURHAT KLIEN]: "${data.concerns}" (Gunakan curhat ini sebagai konteks analisis di bab yang relevan)`
    : `[CURHAT KLIEN]: Klien ingin analisis mendalam (Deep Dive).`;

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
        
        RINGKASAN BAB SEBELUMNYA: ${rollingSummary || "Awal Analisis"}
        
        ${concernContext}
        
        [INSTRUKSI PENULISAN]: ${section.prompt}
        
        [DATA ASTROLOGI]: ${data.rawText || "Lihat file"}

        ATURAN UTAMA:
        1. **NO TABLES / NO CSV**: Dilarang menggunakan tabel atau format CSV. Gunakan **LIST / POINTS** untuk semua data.
        2. Tulis dengan PANJANG dan MENDALAM (Target: 2-3 Halaman per Bab).
        3. Gunakan bahasa populer yang mudah dimengerti (Bahasa Manusia).
        4. Pecah paragraf panjang, gunakan Sub-Heading.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const chainTag = `\n\n[[SUMMARY: (Rangkum 1 kalimat inti bab ini untuk Natalie ingat di bab selanjutnya)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainTag }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.75 } 
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
          accumulatedReport += `\n\n*(Sinyal kosmik terputus di Bab ${section.id}. Melanjutkan ke bab berikutnya...)*`;
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

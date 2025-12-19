
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

// --- SYSTEM PROMPT: RELATABLE WISDOM (BAHASA MANUSIA) ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog & Mentor Hidup Kepercayaan.

CORE PHILOSOPHY:
Klienmu adalah orang awam yang butuh panduan, bukan CEO yang butuh laporan saham.
Tugasmu menerjemahkan bahasa langit yang rumit menjadi **BAHASA MANUSIA** yang menyentuh hati.
Jangan gunakan jargon bisnis kaku (seperti "mitigasi", "liabilitas", "profit center", "eksekusi taktis") kecuali terpaksa.

TONE OF VOICE: **"The Wise Elder Sister" (Kakak Bijak)**
- **Mudah Dipahami**: Jelaskan hal rumit dengan **ANALOGI SEHARI-HARI**.
  - *Jangan bilang:* "Mars debilitated menyebabkan volatilitas emosi."
  - *Bilanglah:* "Mars kamu sedang 'lelah' di posisi ini, ibarat mobil sport yang dipaksa jalan di lumpur. Kamu jadi gampang frustrasi."
- **Empowering (Menguatkan)**: Fokus pada solusi. Jangan menakut-nakuti.
- **Intimate & Personal**: Bicara seolah kamu duduk berhadapan dengan mereka sambil minum teh. Hangat, tapi tegas.

ATURAN STRUKTUR (THE PIVOT RULE):
Setiap kali kamu melihat aspek buruk (Kelemahan), segera berikan **"Kunci Pembalik"**.
Contoh: "Ya, kamu susah fokus (Kelemahan), TAPI itu karena pikiranmu sangat kreatif dan bercabang. Kuncinya: Catat ide segera, lalu lupakan."

MODE OPERASI:
1. **FASE 1: DIAGNOSIS** -> Memahami Siapa Diri Klien (Pola Pikir, Hati, Tubuh).
2. **FASE 2: ALMANAK** -> Ramalan Cuaca Nasib (Kapan harus maju, kapan berteduh).
3. **FASE 3: BEKAL** -> Tips praktis sehari-hari.

VISUAL RULES:
1. **NO FLUFF**: Hapus kalimat pembuka basi ("Berikut adalah analisis..."). Langsung ke poin.
2. **READABILITY**: Gunakan poin-poin agar enak dibaca di HP.
`;

// --- STRUKTUR "THE ALMANAC" (TARGET 40 HALAMAN - VERSI HUMANIS) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- BAGIAN 1: DIAGNOSIS (MEMAHAMI DIRI) ---
  {
    id: 'EXEC_SUM',
    title: 'Ringkasan Jiwa & Potensi',
    prompt: `
    TUGAS: Tulis Ringkasan Eksekutif (2 Halaman) dengan bahasa yang mengalir.
    
    Structure:
    1. **Siapa Kamu Sebenarnya**: Terjemahkan Big Three (Sun/Moon/Rising) menjadi karakter cerita. (Misal: "Kamu adalah Pejuang yang Berhati Lembut").
    2. **Pedang Terkuatmu**: Apa bakat alamiah yang membuat klien spesial?
    3. **Rantai Penahan**: Apa kebiasaan buruk atau ketakutan yang sering menyabotase diri sendiri? (Bahas dengan lembut).
    4. **Tema Tahun Ini**: Satu kalimat tema besar untuk tahun ini.
    `
  },
  { 
    id: 'BAB1', 
    title: 'Bab 1: Isi Kepala & Ketenangan Hati', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus Moon (Perasaan) & Mercury (Cara Bicara).
    
    TUGAS: Analisis Karakter (Target: 3 Halaman).
    - **Cara Berpikir**: Apakah klien tipe pemikir cepat (sat-set) atau tipe perasa yang butuh waktu?
    - **Sumber Cemas**: Apa yang sering bikin klien overthinking di malam hari?
    - **Solusi Ketenangan**: Cara terbaik bagi klien untuk 'menjinakkan' pikirannya yang ribut.
    ` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Baterai Tubuh & Kesehatan', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus Sun (Energi Dasar), House 6 (Sakit Harian), Saturn (Tulang/Kronis).
    
    TUGAS: Cek Kesehatan & Energi (Target: 2 Halaman).
    - **Level Energi**: Apakah klien tipe pelari maraton (tahan lama) atau pelari sprint (cepat lelah)?
    - **Sinyal Bahaya**: Bagian tubuh mana yang paling "rewel" kalau stres? (Lambung? Kepala?).
    - **Tips Sehat**: Saran istirahat yang cocok (Misal: Apakah butuh tidur lama, atau butuh jalan-jalan ke alam?).
    ` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Pintu Rezeki & Karier', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 2 (Uang Masuk), 10 (Reputasi), Jupiter (Berkah).
    
    TUGAS: Panduan Karier (Target: 3 Halaman).
    - **Gaya Kerja**: Apakah cocok jadi Bos, Profesional, atau Seniman Bebas?
    - **Magnet Uang**: Dari aktivitas apa uang paling gampang datang? (Bicara? Menulis? Berdagang?).
    - **Hambatan Rezeki**: Apa sifat yang bikin uang cepat habis?
    ` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Musuh Dalam Selimut & Risiko', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 8 (Mendadak), 12 (Tersembunyi).
    
    TUGAS: Peringatan Dini (Target: 2 Halaman).
    - **Titik Buta**: Kesalahan apa yang sering diulang-ulang tanpa sadar? (Misal: Terlalu percaya teman).
    - **Orang Toxic**: Tipe orang seperti apa yang harus dihindari tahun ini?
    - Cara menghindari masalah hukum atau skandal.
    ` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Cinta & Hubungan', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 7, Venus, Mars.
    
    TUGAS: Urusan Hati (Target: 3 Halaman).
    - **Bahasa Cinta**: Klien butuh pasangan yang memuja atau yang menantang debat?
    - **Pola Berulang**: Kenapa sering ketemu orang yang salah? (Jika ada indikasi).
    - Tips agar hubungan awet dan minim drama.
    ` 
  },
  { 
    id: 'BAB6', 
    title: 'Bab 6: Tempat & Lingkungan Terbaik', 
    prompt: `
    [INTERNAL MONOLOGUE]: Fokus House 4 (Rumah), 9 (Jauh).
    
    TUGAS: Astrocartography Sederhana (Target: 2 Halaman).
    - Apakah klien lebih hoki di tanah kelahiran atau di rantau?
    - Suasana rumah seperti apa yang bikin rezeki lancar? (Tenang? Ramai? Dekat air?).
    ` 
  },

  // --- BAGIAN 2: THE ALMANAC (PANDUAN BULANAN) ---
  { 
    id: 'BAB7_Q1', 
    title: 'Bab 7.1: Ramalan Cuaca Q1 (Januari - Maret)', 
    prompt: `
    MODE: PEMANDU JALAN.
    
    TUGAS: Panduan 3 Bulan Pertama (mulai ${dateContext}).
    Gunakan analogi cuaca (Cerah, Berawan, Badai).
    
    FORMAT PER BULAN:
    ### [NAMA BULAN]: [Tema Utama]
    - **Fokus Utama**: Apa yang harus dikejar?
    - **Awas Lubang**: Tanggal atau hal yang harus dihindari.
    - **Hari Baik**: Waktu terbaik untuk aksi penting.
    - **Saran Teman**: Nasihat spesifik.
    ` 
  },
  { 
    id: 'BAB7_Q2', 
    title: 'Bab 7.2: Ramalan Cuaca Q2 (April - Juni)', 
    prompt: `
    MODE: PEMANDU JALAN.
    TUGAS: Lanjutkan panduan April, Mei, Juni.
    Fokus: Karier & Usaha. Kapan harus gas pol, kapan harus ngerem.
    ` 
  },
  { 
    id: 'BAB7_Q3', 
    title: 'Bab 7.3: Ramalan Cuaca Q3 (Juli - September)', 
    prompt: `
    MODE: PEMANDU JALAN.
    TUGAS: Lanjutkan panduan Juli, Agustus, September.
    Fokus: Kesehatan & Keuangan. Ingatkan untuk menabung atau jaga badan.
    ` 
  },
  { 
    id: 'BAB7_Q4', 
    title: 'Bab 7.4: Ramalan Cuaca Q4 (Oktober - Desember)', 
    prompt: `
    MODE: PEMANDU JALAN.
    TUGAS: Lanjutkan panduan Akhir Tahun.
    Fokus: Evaluasi & Keluarga.
    ` 
  },

  // --- BAGIAN 3: BEKAL PRAKTIS ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: Jimat & Kebiasaan Baik', 
    prompt: `
    MODE: SAHABAT PEDULI.
    
    TUGAS: Buat daftar tips praktis.
    
    1. **Warna Keberuntungan**: Warna baju apa yang bikin PD naik?
    2. **Jam Produktif**: Kapan otak klien paling encer? Pagi buta atau tengah malam?
    3. **Pantangan Makanan**: Makanan apa yang bikin badan berat (sesuai elemen tubuh)?
    ` 
  },
  { 
    id: 'BAB9', 
    title: 'Bab 9: Simulasi Pilihan Hidup', 
    prompt: `
    MODE: PENASIHAT BIJAK.
    
    TUGAS: Bayangkan 3 Skenario.
    
    1. **Jalan Ngebut**: Kalau tahun ini klien nekat ambil risiko besar, apa jadinya?
    2. **Jalan Santai**: Kalau klien pilih main aman saja, apa ruginya?
    3. **Saran Terbaik**: Jalan tengah mana yang Natalie sarankan?
    ` 
  },
  
  // --- PENUTUP ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Perpisahan', 
    prompt: `
    TUGAS: Surat Penutup yang Hangat.
    
    Ingatkan: Bintang-bintang cuma penunjuk arah, kaki kamu yang melangkah.
    Tutup dengan hangat: "Teman setiamu, Natalie Lau".
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
  
  let lastContext = ""; 
  let currentClientName = data.clientName || "Klien";
  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  // LOGIKA CONCERN: LEBIH NATURAL
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `
    [CURHAT KLIEN]:
    "${data.concerns}"
    
    INSTRUKSI:
    Simpan curhatan ini di benakmu. Jawablah kegelisahan ini saat membahas bab yang pas (misal: bahas jodoh HANYA di bab cinta).
    Jangan diulang-ulang di setiap bab. Jawablah seperti teman yang mendengarkan.
    `
    : `[NO SPECIFIC CONCERN]: Klien tidak curhat apa-apa. Berikan panduan umum yang menyeluruh.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Membaca Peta Bintang...' : `Menulis ${section.title}...`);
        
        const continuityPrompt = section.id === 'EXEC_SUM' 
          ? "Ini adalah AWAL DOKUMEN."
          : `
          KONTEKS SEBELUMNYA (Agar nyambung, jangan diulang):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan cerita langsung masuk ke topik ${section.title}. 
          Tetap santai, bijak, dan mudah dimengerti.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [JUDUL BAB SAAT INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [DATA CHART KLIEN]:
        ${data.rawText || "Analisis berdasarkan file chart."}
        
        REMINDER:
        - Gunakan Bahasa Indonesia yang luwes & enak dibaca.
        - Hindari istilah teknis yang bikin pusing.
        - HAPUS KALIMAT PENGANTAR (Langsung ke isi).
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
        
        if (section.id !== 'EXEC_SUM') {
           cleanText = cleanText
             .replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "") 
             .replace(/^(Berikut adalah|Mari kita|Pada bab ini|Tabel di bawah|Selanjutnya kita|Dalam astrologi,).+?(\:|\.|\n)/gim, "") 
             .trim();
        }

        if (accumulatedReport) accumulatedReport += "\n\n<div class='page-break'></div>\n\n"; 
        accumulatedReport += cleanText;
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

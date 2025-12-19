
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

// --- SYSTEM PROMPT: THE STRATEGIC CONSULTANT (UPDATED RULES) ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Konsultan Kosmografi Strategis untuk klien profesional.
Kamu BUKAN peramal nasib, tapi "Strategic Advisor" yang menggunakan data planet untuk memetakan peluang dan risiko.

ATURAN MUTLAK (STRICT RULES):
1. **TERMINOLOGI**: Gunakan istilah "KOSMOGRAFI", JANGAN gunakan kata "Astrologi".
2. **NO MISTIK/RELIGIUS**: DILARANG KERAS menyarankan Mantra, Doa, Ritual Menyembah, Sesajen, atau hal berbau agama/klenik. Fokus sepenuhnya pada strategi psikologis, pengambilan keputusan, dan tindakan nyata (actionable).
3. **KEJUJURAN BRUTAL (NO SUGARCOATING)**: Bongkar sisi gelap, kebiasaan buruk, dan kelemahan fatal klien dengan tajam dan jujur. Jangan hanya memuji. Klien butuh cermin realita untuk refleksi, bukan pujian palsu.
4. **LOKASI SPESIFIK**: Jangan gunakan arah mata angin abstrak (misal: "Pergi ke Utara"). Berikan nama **KOTA** atau **NEGARA** spesifik. Asumsikan klien saat ini tinggal di **INDONESIA**.
   - Contoh Salah: "Energi Anda bagus di Selatan."
   - Contoh Benar: "Energi Anda sangat kuat di kota seperti Yogyakarta atau negara Australia."
5. **WAKTU MANUSIA**: Jangan gunakan jargon transit planet untuk saran waktu (misal: "Saat Jupiter masuk Aquarius"). Gunakan **TANGGAL, BULAN, atau MINGGU KE-X**.
   - Contoh Salah: "Lakukan saat Bulan transit di Nakshatra X."
   - Contoh Benar: "Waktu terbaik Anda adalah Minggu ke-2 bulan Oktober."
6. **BAHASA**: Gunakan Bahasa Indonesia yang lugas, profesional, mengalir, dan mudah dimengerti orang awam.

JANGAN PERNAH MENULIS ULANG INSTRUKSI PROMPT DI HASIL OUTPUT.
`;

// --- STRUKTUR BAB (LOGIS & JELAS) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- BAGIAN 0: SURAT PENGANTAR ---
  {
    id: 'PREFACE',
    title: 'Surat Pengantar & Metodologi',
    prompt: `
    TUGAS: Tulis surat pembuka yang personal namun tegas untuk ${clientName}.
    
    POIN PENTING YANG HARUS ADA:
    1. Sambut klien di "Kosmografi Strategic Office".
    2. **DISCLAIMER METODE (WAJIB)**: Jelaskan secara eksplisit bahwa analisis ini menggunakan **Kosmografi Sidereal** dengan perhitungan **Ayanamsa Raman** (Metode Timur) yang mengutamakan akurasi astronomi.
    3. Tegaskan: "Jangan kaget jika 'Sun Sign' (Zodiak) Anda berbeda dengan yang Anda yakini selama ini (Western/Tropical). Tropical berbasis musim, Sidereal berbasis posisi bintang aktual di langit."
    4. Tujuan laporan: Membedah karakter dan potensi secara objektif tanpa bumbu manis.
    `
  },

  // --- BAGIAN 1: ANALISIS INTI ---
  {
    id: 'EXEC_SUM',
    title: 'Profil Utama & Karakter Dasar',
    prompt: `
    TUGAS: Jelaskan siapa klien ini sebenarnya (Big Three: Sun, Moon, Ascendant).
    
    Instruksi Penulisan:
    1. Ceritakan karakter aslinya secara utuh. Apa kekuatan terbesarnya?
    2. **REALITY CHECK**: Bongkar sisi manipulatif, malas, atau sifat buruk bawaan dari kombinasi planetnya. Jujurlah.
    3. Apa paradoks dalam dirinya? (Misal: Terlihat kuat padahal rapuh).
    4. Tutup dengan tema utama hidupnya tahun ini.
    `
  },
  { 
    id: 'BAB1', 
    title: 'Bab 1: Pola Pikir & Mentalitas', 
    prompt: `
    [Fokus: Moon & Mercury]
    TUGAS: Analisis cara kerja pikiran klien.
    
    Instruksi:
    - Bagaimana cara dia mengambil keputusan? Logis atau Emosional?
    - **KELEMAHAN MENTAL**: Apa kecenderungan berpikir buruknya? (Overthinking, paranoid, sulit fokus, atau plin-plan?). Katakan apa adanya.
    - Berikan solusi latihan mental (mindset) untuk memperbaiki kelemahan tersebut.
    ` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Stamina & Gaya Kerja', 
    prompt: `
    [Fokus: Sun & Mars & House 6]
    TUGAS: Analisis produktivitas.
    
    Instruksi:
    - Apakah dia tipe pekerja keras atau cenderung menunda-nunda (procrastinator)?
    - Apa **KEBIASAAN BURUK** yang merusak kesehatannya? (Misal: Begadang, pola makan buruk, malas gerak). Tegur dia.
    - Strategi mengatur jadwal harian yang realistis.
    ` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Potensi Karir & Keuangan', 
    prompt: `
    [Fokus: House 2, 10, Jupiter]
    TUGAS: Analisis rezeki dan profesi.
    
    Instruksi:
    - Bidang industri apa yang paling menghasilkan uang untuknya?
    - **BLINDSPOT KEUANGAN**: Kenapa dia mungkin sulit kaya atau uangnya cepat habis? (Boros, tertipu teman, pelit, atau takut ambil risiko?).
    - Berikan strategi bisnis/karir yang konkret.
    ` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Risiko & Tantangan Hidup', 
    prompt: `
    [Fokus: House 8, 12, Saturn]
    TUGAS: Manajemen risiko (Risk Assessment).
    
    Instruksi:
    - Identifikasi ancaman terbesar. Apakah musuhnya adalah orang lain (penipuan, persaingan) atau **DIRINYA SENDIRI** (sabotase diri)?
    - Peringatkan tentang periode atau situasi di mana dia sering jatuh.
    - Bagaimana cara mencegah kehancuran tersebut dengan tindakan logis (bukan ritual).
    ` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Hubungan & Relasi', 
    prompt: `
    [Fokus: House 7, Venus]
    TUGAS: Analisis hubungan (Asmara & Bisnis).
    
    Instruksi:
    - Tipe partner seperti apa yang cocok?
    - **POLA TOKSIK**: Kesalahan apa yang SELALU dia ulangi dalam hubungan? (Terlalu posesif, terlalu dingin, selalu memilih orang yang salah?). Kritiklah hal ini.
    - Saran untuk memperbaiki kualitas interaksi sosialnya.
    ` 
  },
  { 
    id: 'BAB6', 
    title: 'Bab 6: Geografi & Lingkungan', 
    prompt: `
    [Fokus: House 4, 9]
    TUGAS: Saran lokasi strategis.
    
    Instruksi:
    - Di lingkungan seperti apa dia akan produktif?
    - **LOKASI SPESIFIK**: Sebutkan nama **KOTA** (di Indonesia) atau **NEGARA** yang energinya cocok untuk klien. 
    - JANGAN gunakan "Utara/Selatan". Langsung sebut contoh: "Energi Anda cocok di Jakarta Selatan, Bali, atau negara seperti Jepang."
    ` 
  },

  // --- BAGIAN 2: TIMELINE (Per Bulan) ---
  { 
    id: 'BAB7_Q1', 
    title: 'Timeline Q1 (Januari - Maret)', 
    prompt: `
    TUGAS: Prediksi tren kehidupan 3 bulan pertama (Mulai ${dateContext}).
    
    Instruksi:
    - Jelaskan fokus utama di setiap bulan.
    - **WAKTU SPESIFIK**: Sebutkan minggu ke berapa atau tanggal kisaran untuk bertindak atau berdiam diri. Jangan sebut nama transit planet.
    ` 
  },
  { 
    id: 'BAB7_Q2', 
    title: 'Timeline Q2 (April - Juni)', 
    prompt: `
    TUGAS: Prediksi tren April - Juni.
    Jelaskan peluang dan tantangan. Kapan waktu terbaik untuk eksekusi ide?
    ` 
  },
  { 
    id: 'BAB7_Q3', 
    title: 'Timeline Q3 (Juli - September)', 
    prompt: `
    TUGAS: Prediksi tren Juli - September.
    Peringatan apa yang harus diwaspadai di periode ini?
    ` 
  },
  { 
    id: 'BAB7_Q4', 
    title: 'Timeline Q4 (Oktober - Desember)', 
    prompt: `
    TUGAS: Prediksi tren Oktober - Desember.
    Bagaimana menutup tahun dengan kemenangan?
    ` 
  },

  // --- BAGIAN 3: PENUTUP ---
  { 
    id: 'BAB8', 
    title: 'Action Plan (Tanpa Mistik)', 
    prompt: `
    TUGAS: Rangkuman saran gaya hidup praktis.
    
    Instruksi:
    Berikan tips yang bisa diterapkan besok pagi:
    - Jam produktif (Golden Hour) dalam format jam (misal: 08:00 - 10:00).
    - Gaya berpakaian atau warna yang meningkatkan wibawa (Psikologi Warna).
    - Kebiasaan kecil yang harus dimulai dan **Kebiasaan buruk yang harus dibuang**.
    - DILARANG menyarankan mantra/batu akik/jimat.
    ` 
  },
  
  // --- FINAL ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Penutup', 
    prompt: `
    TUGAS: Paragraf "Tamparan Realita" terakhir.
    
    Berikan kalimat penutup yang tegas. Ingatkan bahwa peta ini tidak berguna jika dia tidak bergerak. 
    Tantang klien untuk membuktikan potensinya.
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
  
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `
    [FOKUS MASALAH KLIEN]: "${data.concerns}"
    INSTRUKSI: Pastikan analisis ini menjawab kegelisahan tersebut secara langsung dan solutif.
    `
    : `[NO SPECIFIC CONCERN]: Lakukan analisis menyeluruh.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'PREFACE' ? 'Menulis Surat Pembuka...' : `Menganalisis ${section.title}...`);
        
        const continuityPrompt = section.id === 'PREFACE' 
          ? "TUGAS: Tulis surat pembuka yang menjelaskan metodologi Kosmografi Sidereal." 
          : `
          KONTEKS SEBELUMNYA (Agar nyambung):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan pembahasan ke topik: ${section.title}.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [TOPIK BAB INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [DATA KOSMOGRAFI]:
        ${data.rawText || "Analisis dari file chart terlampir."}
        
        REMINDER KHUSUS:
        1. GUNAKAN BAHASA INDONESIA YANG LUGAS, JUJUR, DAN TAJAM.
        2. BONGKAR KELEMAHAN TANPA RAGU.
        3. LOKASI HARUS SPESIFIK (KOTA/NEGARA).
        4. WAKTU HARUS SPESIFIK (TANGGAL/BULAN).
        5. NO MANTRA/MISTIK.
        6. JANGAN ULANGI INSTRUKSI PROMPT DALAM OUTPUT.
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
            
            let cleanChunk = sectionContent
                .replace(/\[TOPIK BAB INI\]:.*$/m, "") 
                .replace(/^TUGAS:.*$/m, "")
                .trimStart();

            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n" : "") + cleanChunk;
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

        // CLEANING
        let cleanText = sectionContent
             .replace(/^(\[TOPIK BAB INI\]|TUGAS|INSTRUKSI|KONTEKS):.*$/gm, "")
             .replace(/Ini adalah AWAL LAPORAN/gi, "")
             .replace(section.id === 'PREFACE' ? /xyz_never_match/ : /^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "")
             .trim();

        if (accumulatedReport) accumulatedReport += "\n\n<div class='page-break'></div>\n\n"; 
        accumulatedReport += cleanText;
        
        lastContext = cleanText.slice(-400).replace(/\n/g, " ");
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

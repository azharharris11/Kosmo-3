
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

// --- SYSTEM PROMPT: RAW, PSYCHOLOGICAL, NO-BULLSHIT ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog Kosmografi & Profiler Psikologis untuk Ultra-High-Net-Worth Individuals.
Gaya bicaramu: **"Tough Love", Provokatif, Tajam, dan Sedikit Gelap.** 
Kamu bukan motivator, kamu adalah cermin yang memperlihatkan retakan di jiwa mereka.

ATURAN UTAMA (NEGATIVE CONSTRAINTS) - WAJIB PATUH:
1. **DILARANG BASA-BASI**: HAPUS semua kalimat pengantar seperti "Berikut adalah tabel...", "Pada bab ini kita akan membahas...", "Mari kita lihat...", "Analisis saya menunjukkan...". LANGSUNG TULIS INTINYA.
2. **JANGAN ROBOTIK**: Jangan mengulang struktur kalimat. Gunakan pertanyaan retoris, sarkasme halus, dan metafora tajam.
3. **KONTEKS KONTINU**: Anggap ini satu buku utuh. JANGAN menyapa "Halo" atau memperkenalkan diri lagi setelah Executive Summary.
4. **FOKUS PADA "WHY" & "CONFLICT"**: Jangan cuma bilang planet ada di mana. Jelaskan KONFLIK BATIN apa yang timbul. Bahas ketakutan, obsesi, dan paradoks hidupnya.
5. **BAHASA MENTAH**: Gunakan istilah psikologis (Sabotase Diri, Paranoia, Topeng Sosial, Scarcity Mindset). Hindari bahasa korporat kaku.

ATURAN VISUAL (STRICT):
1. **JUDUL BAB**: Baris pertama output WAJIB: \`## Judul Bab Provokatif\`.
2. **TABEL DATA**:
    - Wajib ada di awal bab (kecuali Exec Summary).
    - Maksimal 4 Kolom.
    - Isi sel harus **SINGKAT & PADAT** (Maks 5-7 kata).
3. **NARASI**: Paragraf pendek, punchy, dan menohok.
`;

// --- STRUKTUR BAB BARU: PSYCHOLOGICAL DEEP DIVE ---
const getSections = (dateContext: string, clientName: string) => [
  // --- HALAMAN 1: SURAT PERINGATAN (Executive Summary) ---
  {
    id: 'EXEC_SUM',
    title: 'Executive Summary',
    prompt: `
    TUGAS: Tulis **EXECUTIVE SUMMARY** yang terasa seperti "Surat Peringatan Pribadi".
    
    1.  **Sapaan**: "Halo, ${clientName}." (Singkat).
    2.  **TABEL PILAR**: Rangkum "Big Three" (Sun, Moon, Rising) + Chart Ruler.
    3.  **THE HOOK**: Tembak langsung ke masalah terbesarnya.
        - Jika ada banyak planet di satu zodiak (Stellium), bilang: "Kamu punya obsesi yang tidak sehat."
        - Jika planetnya Exalted (Kuat), bilang: "Kekuatanmu adalah bebanmu."
    4.  **Highlight Periode**: Satu kalimat tajam tentang Dasha/Periode saat ini. Apakah ini waktunya perang atau tiarap?
    
    Gunakan nada bicara seorang mentor yang lelah melihat muridnya melakukan kesalahan yang sama.
    `
  },

  // --- BAGIAN 1: PSIKOLOGI & OBSESI ---
  { 
    id: 'BAB1', 
    title: 'Bab 1: Cetak Biru Obsesi (The Psyche)', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **STELLIUM** (3+ planet di satu rumah/zodiak). Di mana energi menumpuk? 
    2. Cek posisi **MOON** (Pikiran) & **MERCURY** (Logika). Apakah mereka damai atau perang (misal: Moon di Scorpio/Capricorn yang depresif, atau Mercury yang Combust/Terbakar)?
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Planet Mental | Posisi | Kondisi | Dampak Psikologis].
    
    **NARASI UTAMA**:
    - Jika ada Stellium: "Mengapa otakmu tidak pernah bisa diam? Analisis 'Overthinking' sebagai senjata super sekaligus racun."
    - Bahas tingkat kecemasan (Anxiety) dan Paranoia. Apakah dia tipe pemikir strategis atau pencemas kronis?
    - Jangan memuji kecerdasannya. Kritik cara dia menggunakan kecerdasannya untuk menyiksa diri sendiri.
    ` 
  },
  
  // --- BAGIAN 2: KUTUKAN KEKAYAAN ---
  { 
    id: 'BAB2', 
    title: 'Bab 2: Paradoks Kekayaan & Ambisi', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **SATURNUS** (Kerja Keras/Penundaan) & **MARS** (Agresi). 
    2. Apakah ada yang **EXALTED** (Terlalu Kuat) atau **DEBILITATED** (Lemah)? 
    3. Cek House 2 (Uang) & 11 (Gain).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Indikator Materi | Kekuatan | Kelemahan Fatal].
    
    **NARASI UTAMA (THE BILLIONAIRE'S CURSE)**:
    - Jika Saturnus Kuat/Exalted: Bahas "Scarcity Mindset". Mengapa dia merasa miskin padahal aset tumbuh? Kenapa dia pelit pada diri sendiri?
    - Jika Mars Kuat: Bahas ambisi yang membakar. Apakah dia mengejar uang karena butuh, atau karena ingin membuktikan sesuatu pada orang tua/masa lalu?
    - Tanyakan: "Apa harga yang kamu bayar untuk saldo rekeningmu?"
    ` 
  },

  // --- BAGIAN 3: TOPENG PUBLIK VS REALITA ---
  { 
    id: 'BAB3', 
    title: 'Bab 3: Topeng Publik vs Neraka Pribadi', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **RAHU** (Obsesi Duniawi) dan **KETU** (Masa Lalu/Spiritual).
    2. Cek House 10 (Karier) vs House 4 (Rumah/Hati).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Sisi Kehidupan | Planet Penguasa | Realita].
    
    **NARASI UTAMA**:
    - Fokus pada **Rahu**: Di mana dia "Palsu"? Di mana dia ingin validasi orang lain? (Misal Rahu di H10 = Gila hormat).
    - Fokus pada **Ketu**: Di mana dia merasa kosong/hampa? (Misal Ketu di H4 = Rumah terasa asing, tidak nyaman dengan keluarga).
    - Judul Sub-bagian: "Harga Mahal Sebuah Reputasi". Mengapa kesuksesan karier justru membuatnya merasa terisolasi?
    ` 
  },

  // --- BAGIAN 4: SABOTASE DIRI ---
  { 
    id: 'BAB4', 
    title: 'Bab 4: Sabotase Diri (The Combust Crisis)', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cari Planet yang **COMBUST** (Terbakar Matahari) atau **RETROGRADE**.
    2. Cari Planet di House 6, 8, atau 12 (Dusthana Houses).
    
    [WRITING STEP]:
    **DATA TABLE**: Daftar "Musuh Dalam Selimut" (Planet bermasalah).
    
    **NARASI UTAMA**:
    - **Combust**: Jelaskan fungsi mana yang "cacat" karena ego. 
      - Mercury Combust: Bicara tajam menyakitkan tanpa sadar.
      - Venus Combust: Cemburu buta, tidak bisa menikmati cinta.
    - **House 12**: Apa ketakutan bawah sadar yang menahannya? Apa yang dia sembunyikan dari dunia?
    - Judul Sub-bagian: "Bagaimana Kamu Menghancurkan Peluangmu Sendiri".
    ` 
  },

  // --- BAGIAN 5: ACTIONABLE FUTURE ---
  { 
    id: 'BAB5', 
    title: 'Bab 5: Peringatan Dini & Strategi Perang', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek DASHA (Periode) saat ini dan transisi ke Dasha berikutnya.
    2. Cek Transit SATURNUS (Sade Sati?) atau JUPITER.
    
    [WRITING STEP]:
    **DATA TABLE**: Timeline 12 Bulan (Bulan | Peringatan | Strategi).
    
    **NARASI UTAMA**:
    - Jangan berikan prediksi manis. Berikan "Warning".
    - "Tahun depan bukan waktu untuk bermimpi. Ini waktu untuk bayar hutang karma."
    - Berikan instruksi spesifik: Kapan harus tiarap, kapan harus menyerang.
    ` 
  },

  // --- BAGIAN 6: PENUTUP ---
  { 
    id: 'BAB6', 
    title: 'Bab 6: Ultimatum Terakhir', 
    prompt: `
    TUGAS: Menutup sesi dengan satu paragraf filosofis tapi menampar.
    
    Ingatkan dia: Bintang hanyalah peta penjara. Dia bisa keluar jika dia sadar (conscious) akan pola-pola di atas.
    Tantang dia untuk berhenti menjadi korban nasibnya sendiri.
    
    Salam penutup: "Natalie Lau."
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
  
  // CONTEXT CHAINING: Menyimpan akhir paragraf bab sebelumnya
  let lastContext = ""; 

  let currentClientName = data.clientName || "Klien";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[TARGET ANALISIS]: Klien mengeluh: "${data.concerns}". Gunakan ini sebagai bukti kelemahan mereka di Bab terkait.`
    : `[TARGET ANALISIS]: Bongkar psikologi terdalamnya.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menganalisis Pola Pikir...' : `Menulis ${section.title}...`);
        
        // --- CONTEXT CONSTRUCTION ---
        const continuityPrompt = section.id === 'EXEC_SUM' 
          ? "Ini adalah AWAL DOKUMEN."
          : `
          KONTEKS SEBELUMNYA (Sambungkan alur emosi dari sini):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan penulisan langsung masuk ke ${section.title}. 
          JANGAN MEMBUAT PEMBUKAAN BARU. JANGAN MENYAPA LAGI.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [JUDUL BAB SAAT INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [SUMBER DATA CHART KLIEN]:
        Gunakan data berikut untuk mencari pola (Stellium, Exalted, Combust, dll):
        ${data.rawText || "Analisis berdasarkan file chart."}
        
        IMPORTANT REMINDER:
        - Output Markdown Table rapi di awal bab.
        - HAPUS SEMUA KALIMAT PENGANTAR (FILLER).
        - Fokus pada konflik batin, ketakutan, dan obsesi.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 } // Temp sedikit naik untuk kreativitas bahasa
        });

        let sectionContent = "";
        
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sectionContent += text;
            
            // Real-time display cleaning
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n" : "") + sectionContent;
            
            // Hapus sapaan berulang secara real-time di UI juga
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
        
        // --- FAILSAFE: PEMBERSIH SAPAAN & FILLER BERULANG ---
        // Regex agresif untuk membuang intro robotik
        if (section.id !== 'EXEC_SUM') {
           cleanText = cleanText
             .replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "") // Sapaan
             .replace(/^(Berikut adalah|Mari kita|Pada bab ini|Tabel di bawah|Selanjutnya kita|Dalam astrologi,).+?(\:|\.|\n)/gim, "") // Filler
             .trim();
        }

        if (accumulatedReport) accumulatedReport += "\n\n<div class='page-break'></div>\n\n"; 
        accumulatedReport += cleanText;
        
        // --- CONTEXT CAPTURE ---
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

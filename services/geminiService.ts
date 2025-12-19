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

// --- SYSTEM PROMPT: THE STRATEGIC CONSULTANT (CLEAR & DIRECT) ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Konsultan Astrologi Weda (Vedic) untuk klien profesional.

PRINSIP UTAMA: **KEJELASAN ADALAH KEKUATAN.**

GAYA BAHASA:
1. **LUGAS & MENGALIR**: Gunakan Bahasa Indonesia yang baik, benar, dan enak dibaca. Hindari bahasa yang terlalu puitis, abstrak, atau "langit".
2. **JANGAN PAKAI ISTILAH ANEH**: Hindari istilah buatan sendiri seperti "The Saboteur", "Archetype", "Energy Vampires". Gunakan bahasa manusia: "Kelemahan", "Karakter Dasar", "Penguras Energi".
3. **FOKUS PADA SOLUSI**: Klien tidak butuh teka-teki. Mereka butuh diagnosis masalah dan solusi konkret.
4. **STRUKTUR NARASI**: Tulislah dalam bentuk paragraf yang rapi (seperti artikel majalah bisnis atau psikologi populer). Jangan gunakan bullet points jika bisa dijelaskan dengan kalimat.

JANGAN PERNAH MENULIS ULANG INSTRUKSI PROMPT DI HASIL OUTPUT.
`;

// --- STRUKTUR BAB (LOGIS & JELAS) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- BAGIAN 0: SURAT PENGANTAR ---
  {
    id: 'PREFACE',
    title: 'Surat Pengantar',
    prompt: `
    TUGAS: Tulis surat pembuka yang personal untuk ${clientName}.
    
    Isi Surat:
    - Sambut klien dengan hangat.
    - Jelaskan bahwa analisis ini bertujuan membedah potensi dan hambatan mereka secara objektif menggunakan data astrologi.
    - Tekankan bahwa astrologi adalah peta cuaca, tapi klienlah nakhodanya. Hasil akhir tetap di tangan usaha mereka.
    Terminologi: Mengganti "Astrologi" menjadi "Kosmografi".
    Disclaimer Awal: Menambahkan penjelasan tentang perbedaan sistem Sidereal (Raman Ayanamsa) vs Western (Tropical) di surat pengantar.

    Gaya: Profesional, Ramah, Membumi.
    `
  },

  // --- BAGIAN 1: ANALISIS INTI ---
  {
    id: 'EXEC_SUM',
    title: 'Profil Utama & Karakter Dasar',
    prompt: `
    TUGAS: Jelaskan siapa klien ini sebenarnya (Big Three: Sun, Moon, Ascendant).
    
    Instruksi Penulisan:
    1. Ceritakan karakter aslinya secara utuh. Apa kekuatan terbesarnya yang paling menonjol?
    2. Apa paradoks atau sisi unik dari kepribadiannya?
    3. Jelaskan juga "Blindspot" atau kelemahan fatal yang sering tidak dia sadari, tapi sering merusak rencananya sendiri.
    4. Tutup dengan misi atau tema utama hidupnya tahun ini.
    
    Gunakan bahasa yang deskriptif tapi mudah dipahami.
    `
  },
  { 
    id: 'BAB1', 
    title: 'Bab 1: Pola Pikir & Mentalitas', 
    prompt: `
    [Fokus: Moon & Mercury]
    TUGAS: Analisis cara kerja pikiran klien.
    
    Instruksi:
    - Bagaimana cara dia mengambil keputusan? (Logika vs Perasaan?)
    - Apa yang sering membuat pikirannya ruwet atau stres (overthinking)?
    - Berikan saran konkret bagaimana cara dia menenangkan pikiran agar bisa fokus.
    ` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Stamina & Produktivitas', 
    prompt: `
    [Fokus: Sun & Mars & House 6]
    TUGAS: Analisis gaya kerja dan energi.
    
    Instruksi:
    - Apakah dia tipe orang yang kerjanya cepat (sprint) atau tahan banting (marathon)?
    - Hal apa saja yang biasanya membuat energinya cepat habis (misal: rutinitas monoton, drama kantor, kurang tidur)?
    - Berikan strategi mengatur jadwal harian yang cocok dengan tubuh/energinya.
    ` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Potensi Karir & Keuangan', 
    prompt: `
    [Fokus: House 2, 10, Jupiter]
    TUGAS: Analisis rezeki dan pekerjaan.
    
    Instruksi:
    - Di bidang apa potensi kekayaan terbesarnya? (Komunikasi, dagang, jasa, teknologi, dll?)
    - Apa hambatan mental yang sering menghalangi rezekinya (misal: takut rugi, terlalu boros, kurang ambisi)?
    - Berikan strategi karir/bisnis yang praktis untuk dijalankan.
    ` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Risiko & Tantangan', 
    prompt: `
    [Fokus: House 8, 12, Saturn]
    TUGAS: Manajemen risiko hidup.
    
    Instruksi:
    - Identifikasi ancaman terbesar bagi klien. Apakah musuhnya datang dari luar (orang jahat, situasi mendadak) atau dari dalam diri sendiri (rasa takut, malas)?
    - Kapan atau dalam situasi apa dia harus ekstra hati-hati?
    - Bagaimana cara mencegah masalah-masalah ini terjadi?
    ` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Hubungan & Relasi', 
    prompt: `
    [Fokus: House 7, Venus]
    TUGAS: Analisis hubungan (Asmara & Bisnis).
    
    Instruksi:
    - Tipe pasangan atau rekan kerja seperti apa yang cocok untuknya?
    - kapan dan dimana jodohnya dengan detail
    - Pola buruk apa yang sering dia ulangi dalam hubungan? (Misal: terlalu dominan, terlalu pasrah, salah pilih orang?)
    - Saran untuk memperbaiki kualitas hubungannya.
    ` 
  },
  { 
    id: 'BAB6', 
    title: 'Bab 6: Lingkungan & Tempat Tinggal', 
    prompt: `
    [Fokus: House 4, 9]
    TUGAS: Saran lokasi dan suasana.
    
    Instruksi:
    - Di lingkungan seperti apa dia akan merasa damai dan produktif? (Kota sibuk, dekat alam, rumah minimalis, dll?) (jelaskan dengan spesifik jangan arah selatan, tp sebut kota atau negara, asumsi mereka tinggal di indonesia)
    - Saran penataan ruang sederhana untuk mendukung mood-nya.
    ` 
  },

  // --- BAGIAN 2: TIMELINE (Per Bulan) ---
  { 
    id: 'BAB7_Q1', 
    title: 'Timeline Q1 (Januari - Maret)', 
    prompt: `
    TUGAS: Prediksi tren kehidupan untuk 3 bulan pertama (Mulai ${dateContext}).
    
    Instruksi:
    Jelaskan fokus utama di setiap bulan. Apakah bulan untuk "Gas Pol", "Istirahat", atau "Hati-hati"?
    Gunakan bahasa yang prediktif namun realistis.sebut tanggal/Bulan, bukan "Transit Jupiter".
    ` 
  },
  { 
    id: 'BAB7_Q2', 
    title: 'Timeline Q2 (April - Juni)', 
    prompt: `
    TUGAS: Prediksi tren April - Juni.
    Jelaskan peluang dan tantangan di periode ini secara berurutan.sebut tanggal/Bulan, bukan "Transit Jupiter".
    ` 
  },
  { 
    id: 'BAB7_Q3', 
    title: 'Timeline Q3 (Juli - September)', 
    prompt: `
    TUGAS: Prediksi tren Juli - September.
    Fokus pada strategi yang harus dilakukan.sebut tanggal/Bulan, bukan "Transit Jupiter".
    ` 
  },
  { 
    id: 'BAB7_Q4', 
    title: 'Timeline Q4 (Oktober - Desember)', 
    prompt: `
    TUGAS: Prediksi tren Oktober - Desember.
    Bagaimana menutup tahun dengan baik berdasarkan chartnya?sebut tanggal/Bulan, bukan "Transit Jupiter".
    ` 
  },

  // --- BAGIAN 3: PENUTUP ---
  { 
    id: 'BAB8', 
    title: 'Saran Praktis (Action Plan)', 
    prompt: `
    TUGAS: Rangkuman saran gaya hidup.
    
    Instruksi:
    Berikan tips-tips praktis yang bisa langsung diterapkan besok:
    - Waktu terbaik untuk bekerja.
    - Warna atau gaya pakaian yang meningkatkan aura/percaya diri.
    - Kebiasaan kecil yang harus dimulai.
    ` 
  },
  
  // --- FINAL ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Penutup', 
    prompt: `
    TUGAS: Paragraf motivasi terakhir.
    
    Berikan dorongan semangat agar klien percaya diri menghadapi masa depan. Singkat, padat, berkesan.
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
  
  // --- LOGIC GATE PERBAIKAN: HANYA BAHAS JIKA RELEVAN ---
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `
    [INFO KELUHAN KLIEN]: "${data.concerns}"
    
    ATURAN INTEGRASI KELUHAN (PENTING):
    1. Cek apakah keluhan di atas **RELEVAN** dengan [TOPIK BAB INI].
    2. **JIKA RELEVAN**: Jadikan keluhan ini fokus utama analisis di bab ini. Berikan solusi spesifik.
    3. **JIKA TIDAK RELEVAN** (Misal: Keluhan 'Karir' di bab 'Cinta'): **ABAIKAN** keluhan ini sepenuhnya. Fokuslah murni pada topik bab tanpa memaksakan sambungan ke keluhan.
    `
    : ""; 

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'PREFACE' ? 'Menulis Surat Pembuka...' : `Menganalisis ${section.title}...`);
        
        const continuityPrompt = section.id === 'PREFACE' 
          ? "TUGAS: Tulis surat pembuka yang ramah dan profesional." 
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
        
        [DATA ASTROLOGI]:
        ${data.rawText || "Analisis dari file chart terlampir."}
        
        REMINDER KHUSUS:
        1. GUNAKAN BAHASA INDONESIA YANG LUGAS, JELAS, MUDAH DIMENGERTI.
        2. HINDARI ISTILAH METAFORA YANG MEMBINGUNGKAN (JANGAN PAKAI 'ARCHETYPE', 'SABOTEUR', DLL).
        3. JANGAN ULANGI INSTRUKSI PROMPT DALAM OUTPUT.
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
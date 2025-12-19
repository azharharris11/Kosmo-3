// services/geminiService.ts

import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

// --- KONFIGURASI HARGA ---
const PRICING = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-preview': { input: 2.00, output: 12.00 }
};

// --- HELPER FUNCTIONS ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        let encoded = reader.result as string;
        if (encoded.includes(',')) {
            encoded = encoded.split(',')[1];
        }
        resolve(encoded);
    };
    reader.onerror = error => reject(error);
  });
};

const getMonthRange = (startDateStr: string, offsetMonths: number, durationMonths: number) => {
  const start = new Date(startDateStr + "-01");
  start.setMonth(start.getMonth() + offsetMonths);
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths - 1); // -1 karena inklusif

  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return `${start.toLocaleDateString('id-ID', options)} s/d ${end.toLocaleDateString('id-ID', options)}`;
};

// --- SYSTEM PROMPT: SENIOR COSMOGRAPHER NATALIE LAU ---
const NATALIE_SYSTEM_PROMPT = `
Anda adalah Natalie Lau, seorang Konsultan Kosmografi Senior.

ATURAN UTAMA (STRICT RULES):
1.  **SUDUT PANDANG**: Gunakan kata ganti "**SAYA**". JANGAN menyebut diri Anda sebagai "Natalie" atau "kami" atau "saran Natalie". Anda adalah Natalie.
2.  **LARANGAN REPETISI INTRO**: DILARANG KERAS memulai setiap bab dengan kalimat "Duduklah dengan tenang", "Tarik napas", atau basa-basi meditatif lainnya. Itu hanya boleh di Bab Pembukaan. Di bab lain, LANGSUNG bahas data/tabel.
3.  **TANGGAL**: Analisis HANYA berlaku untuk periode waktu yang diminta user (Masa Depan). JANGAN memberikan tanggal yang sudah lewat (Masa Lalu).
4.  **TABEL DATA**: WAJIB menyertakan Tabel Data Posisi Planet (Markdown Table) di Awal Setiap Sub-Bab yang relevan sebagai landasan analisis.
5.  **PERSONA**: Profesional, tajam, jujur (tidak sugarcoating), namun suportif. Gunakan istilah "Kosmografi" (bukan Astrologi).
6.  **METODE**: Sidereal Zodiac (Raman Ayanamsa).

FORMAT OUTPUT:
- Gunakan Markdown yang rapi.
- Narasi mengalir (Flowy) tapi padat isi.
`;

// --- KEYWORDS UNTUK DETEKSI KERESAHAN ---
const SECTION_KEYWORDS: Record<string, string[]> = {
  'BAB_1': ['karakter', 'jiwa', 'diri', 'sifat', 'bakat', 'potensi', 'bingung'],
  'BAB_2': ['mental', 'pikir', 'stres', 'cemas', 'overthinking', 'keputusan', 'takut'],
  'BAB_3': ['karir', 'kerja', 'bisnis', 'profesi', 'jabatan', 'usaha', 'kantor', 'boss'],
  'BAB_4': ['uang', 'kaya', 'miskin', 'dana', 'modal', 'hutang', 'investasi', 'rezeki'],
  'BAB_5': ['cinta', 'jodoh', 'nikah', 'pasangan', 'suami', 'istri', 'cerai', 'selingkuh'],
  'BAB_6': ['sehat', 'sakit', 'fisik', 'stamina', 'penyakit', 'lelah'],
  'BAB_7': ['masa depan', 'tahun ini', 'prediksi', 'nasib', 'rencana', 'target']
};

// --- STRUKTUR LAPORAN GRANULAR (SUB-BAB) ---
const getSections = (dateContext: string, clientName: string) => {
  // Hitung Rentang Tanggal Dinamis
  const semester1Range = getMonthRange(dateContext, 0, 6);
  const semester2Range = getMonthRange(dateContext, 6, 6);

  return [
  {
    id: 'PREFACE',
    title: 'Surat Pembuka & Metodologi',
    prompt: `
    **TUGAS: Tulis Surat Pembuka Personal.**
    
    Konteks:
    - Klien: ${clientName}
    - Tanggal Analisis: Dimulai dari ${dateContext}
    
    Isi Surat:
    1. Sapa ${clientName} dengan hangat (Hanya di sini boleh pakai "Silakan duduk/Tarik napas").
    2. Jelaskan bahwa ini adalah analisis **Sidereal (Raman Ayanamsa)**, peta bintang aktual, bukan zodiak majalah.
    3. Tegaskan bahwa Anda (Saya) akan jujur membedah sisi terang dan gelap.
    `
  },
  {
    id: 'BAB_1_1',
    title: '1.1 Blueprint Jiwa: Topeng vs Realita',
    prompt: `
    **FOKUS: Lagna (Ascendant) & Sun.**
    
    [INSTRUKSI TABEL]: 
    Buat tabel Markdown berisi posisi: **Lagna** dan **Sun**.
    (Kolom: Planet/Point, Sign, House, Nakshatra, Derajat).

    Analisis (Langsung bahas, jangan ada intro basa-basi):
    - Bagaimana orang lain melihat Anda pertama kali (Lagna)?
    - Siapa Anda sebenarnya saat sendirian (Sun)?
    - Analisis Nakshatra Ascendant untuk sifat unik.
    `
  },
  {
    id: 'BAB_1_2',
    title: '1.2 Psikologi & Pola Emosi',
    prompt: `
    **FOKUS: Moon Sign & Mercury.**
    
    [INSTRUKSI TABEL]: 
    Buat tabel Markdown berisi posisi: **Moon** dan **Mercury**.
    (Kolom: Planet, Sign, House, Nakshatra).

    Analisis (Langsung bahas):
    - Cara memproses emosi (Moon) dan logika (Mercury).
    - **KELEMAHAN MENTAL**: Jujur saja. Apakah mudah cemas? Pendendam? Plin-plan?
    - Apa kebutuhan batin terdalam agar merasa aman?
    `
  },
  {
    id: 'BAB_2_1',
    title: '2.1 Analisis Kosmik: Kekuatan Super',
    prompt: `
    **FOKUS: Planet Terkuat (Exalted/Own Sign/Digbala).**
    
    [INSTRUKSI TABEL]: 
    Cari planet terkuat di data chart, buat tabelnya.
    (Kolom: Planet, Status Kekuatan, Sign, House).

    Analisis:
    - Apa "Unfair Advantage" klien?
    - Strategi mengoptimalkan kekuatan ini.
    `
  },
  {
    id: 'BAB_2_2',
    title: '2.2 Analisis Kosmik: Titik Rapuh & Blindspot',
    prompt: `
    **FOKUS: Planet Lemah/Malefic Aspects.**
    
    [INSTRUKSI TABEL]: 
    Identifikasi planet lemah/masalah, buat tabelnya.

    Analisis:
    - Sisi gelap atau "Self-Sabotage" apa yang sering muncul?
    - Kapan biasanya kelemahan ini aktif?
    - Solusi psikologis (Mindset adjustment).
    `
  },
  { 
    id: 'BAB_3_1', 
    title: '3.1 Peta Karier & Panggilan Jiwa', 
    prompt: `
    **FOKUS: House 10, House 1, Saturn.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Saturn**, **Lord of House 10**, **Lord of House 1**.

    Analisis:
    - Profesi atau peran alami (Leader/Creator/Support)?
    - Lingkungan kerja ideal.
    - Entrepreneur vs Corporate?
    ` 
  },
  { 
    id: 'BAB_3_2', 
    title: '3.2 Strategi Profesional & Timing', 
    prompt: `
    **FOKUS: Dasha & Transit Saturn.**
    
    [INSTRUKSI TABEL]: 
    Tabel **Dasha Periode Saat Ini** (Mahadasha - Antardasha) & Tanggal Berakhirnya.

    Analisis:
    - Momen terbaik untuk lompatan karier (Gunakan rentang tanggal mulai dari ${dateContext} ke depan).
    - Hambatan internal dalam pekerjaan.
    ` 
  },
  { 
    id: 'BAB_4_1', 
    title: '4.1 Potensi Kekayaan & Aset', 
    prompt: `
    **FOKUS: House 2 & House 11.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Jupiter**, **Lord of House 2**, **Lord of House 11**.

    Analisis:
    - Sumber rezeki termudah.
    - Tipe Akumulator (Penabung) atau Investor?
    ` 
  },
  { 
    id: 'BAB_4_2', 
    title: '4.2 Kebocoran Finansial & Risiko', 
    prompt: `
    **FOKUS: House 12, House 6, Rahu/Ketu.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Rahu**, **Ketu**, **Lord of House 12**.

    Analisis:
    - Dimana letak kebocoran uang? (Impulsif/Tipuan/Kesehatan).
    - Pantangan finansial spesifik.
    ` 
  },
  { 
    id: 'BAB_5_1', 
    title: '5.1 Karakteristik Pasangan Jiwa', 
    prompt: `
    **FOKUS: House 7 & Venus.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Venus**, **Jupiter**, **Lord of House 7**.

    Analisis:
    - Karakter partner yang DIBUTUHKAN jiwa (bukan sekadar diinginkan ego).
    - Ciri-ciri pembawa keberuntungan.
    ` 
  },
  { 
    id: 'BAB_5_2', 
    title: '5.2 Dinamika Hubungan & Red Flags', 
    prompt: `
    **FOKUS: Mars (Kuja Dosha) & House 8.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Mars** dan planet di **House 8**.

    Analisis:
    - Pola toxic dalam hubungan.
    - Cara klien menyabotase hubungan sendiri.
    ` 
  },
  { 
    id: 'BAB_6', 
    title: '6. Kesehatan & Vitalitas', 
    prompt: `
    **FOKUS: House 6 & Ascendant Lord.**
    
    [INSTRUKSI TABEL]: 
    Tabel posisi: **Lord of House 6** dan **Saturn**.

    Analisis:
    - Titik lemah fisik tubuh.
    - Kebiasaan buruk yang harus distop.
    - Saran aktivitas fisik sesuai elemen.
    ` 
  },
  { 
    id: 'BAB_7_1', 
    title: `7.1 Forecast Semester I (${semester1Range})`, 
    prompt: `
    **FOKUS: Transit & Dasha untuk Periode: ${semester1Range}.**
    
    [INSTRUKSI TABEL]: 
    Buat tabel **Transit/Event Kosmik Penting** yang terjadi HANYA di rentang tanggal: ${semester1Range}.
    (Kolom: Tanggal Perkiraan, Event Planet, Efek).

    Analisis:
    - Tema utama semester ini.
    - Tanggal-tanggal hoki (Golden Moments) di rentang ini.
    - Peringatan (Red Days) di rentang ini.
    ` 
  },
  { 
    id: 'BAB_7_2', 
    title: `7.2 Forecast Semester II (${semester2Range})`, 
    prompt: `
    **FOKUS: Transit & Dasha untuk Periode: ${semester2Range}.**
    
    [INSTRUKSI TABEL]: 
    Buat tabel **Transit/Event Kosmik Penting** yang terjadi HANYA di rentang tanggal: ${semester2Range}.

    Analisis:
    - Perubahan energi di semester kedua.
    - Persiapan jangka panjang.
    ` 
  },
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Penutup & Afirmasi', 
    prompt: `
    **TUGAS: Penutup Singkat.**
    
    - Rangkuman 3 poin kunci.
    - Afirmasi penguat mindset (Bukan mantra mistis).
    - Ingatkan Free Will.
    ` 
  }
]};

// --- FUNGSI 1: EKSTRAKSI DATA ---
async function extractChartData(
    ai: GoogleGenAI, 
    model: string, 
    files: any[], 
    rawText: string
): Promise<{text: string, detectedName?: string}> {
    // Jika tidak ada file, return raw text saja
    if (files.length === 0 && rawText.length > 5) return { text: rawText };

    const extractionPrompt = `
    PERAN: Asisten Teknis Data Entry.
    
    TUGAS UTAMA: 
    1. Cari NAMA ORANG yang tertera di gambar chart/dokumen ini. (Biasanya di bagian header, 'Name:', atau judul).
    2. Ekstrak data posisi planet ke format Tabel Markdown.
    
    KOLOM TABEL: | Planet | Sign (Sidereal) | House | Nakshatra | Derajat |
    
    OUTPUT FORMAT (JSON):
    {
       "detectedName": "Nama Yang Ditemukan (atau null jika tidak ada)",
       "markdownTable": "Tabel Markdown lengkap..."
    }
    
    HANYA KELUARKAN JSON YANG VALID. TANPA NARASI LAIN.
    ${rawText ? `Info Tambahan User: ${rawText}` : ''}
    `;

    try {
        const result = await ai.models.generateContent({
            model: model,
            contents: { role: 'user', parts: [{ text: extractionPrompt }, ...files] },
            config: { responseMimeType: "application/json" } // Force JSON output for parsing name
        });
        
        const responseText = result.text || "{}";
        const parsed = JSON.parse(responseText);
        
        return {
            text: parsed.markdownTable || "Gagal ekstrak tabel.",
            detectedName: parsed.detectedName !== "null" ? parsed.detectedName : undefined
        };

    } catch (e) {
        // Fallback jika JSON parse gagal atau model tidak support JSON mode sempurna
        console.error("Extraction JSON failed, falling back to text", e);
        return { text: "Data Input Manual: " + rawText };
    }
}

// --- FUNGSI 2: GENERATE REPORT UTAMA ---
export const generateReport = async (
  data: ClientData,
  onStream: (fullContent: string) => void,
  onStatusUpdate: (status: string) => void,
  onUsageUpdate: (stats: UsageStats) => void,
  onNameDetected?: (name: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = data.selectedModel || 'gemini-3-flash-preview';
  const pricing = PRICING[modelName as keyof typeof PRICING] || PRICING['gemini-3-flash-preview'];

  let accumulatedReport = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // A. BACA DATA
  onStatusUpdate("Mempelajari peta bintang...");
  const processedFiles: any[] = [];
  if (data.files && data.files.length > 0) {
    for (const file of data.files) {
      const base64Data = await fileToBase64(file);
      processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
    }
  }

  // B. EKSTRAKSI DATA & NAMA
  let extractedTechnicalData = "";
  let finalClientName = data.clientName; // Default pakai nama input user

  try {
     const extractionResult = await extractChartData(ai, modelName, processedFiles, data.rawText);
     extractedTechnicalData = extractionResult.text;
     
     // Jika AI menemukan nama valid di dalam file, update nama klien
     if (extractionResult.detectedName && extractionResult.detectedName.length > 2) {
         finalClientName = extractionResult.detectedName;
         if (onNameDetected) onNameDetected(finalClientName);
     }
     
     totalInputTokens += 1000; totalOutputTokens += 500;
  } catch (e) {
     extractedTechnicalData = "Data input manual: " + data.rawText;
  }

  accumulatedReport += `## Data Teknis Planet\n\n*(Sidereal Zodiac / Raman Ayanamsa)*\n\n${extractedTechnicalData}\n\n<div class='page-break'></div>\n\n`;
  onStream(accumulatedReport);

  // C. GENERATE PER SUB-BAB
  // Gunakan finalClientName agar prompt lebih personal
  const sections = getSections(data.analysisDate, finalClientName);
  
  for (const section of sections) {
      onStatusUpdate(`Menulis: ${section.title}...`);

      // 1. Cek Keresahan User
      let specificConcernPrompt = "";
      if (data.concerns && data.concerns.length > 3) {
          // Mapping ID Bab ke Keywords
          let sectionCategory = 'UMUM';
          if (section.id.includes('BAB_1')) sectionCategory = 'BAB_1';
          else if (section.id.includes('BAB_2')) sectionCategory = 'BAB_2';
          else if (section.id.includes('BAB_3')) sectionCategory = 'BAB_3';
          else if (section.id.includes('BAB_4')) sectionCategory = 'BAB_4';
          else if (section.id.includes('BAB_5')) sectionCategory = 'BAB_5';
          else if (section.id.includes('BAB_6')) sectionCategory = 'BAB_6';
          else if (section.id.includes('BAB_7')) sectionCategory = 'BAB_7';

          const keywords = SECTION_KEYWORDS[sectionCategory] || [];
          const isRelevant = keywords.some(kw => data.concerns.toLowerCase().includes(kw)) || section.id === 'PREFACE' || section.id.includes('BAB_7');
          
          if (isRelevant) {
              specificConcernPrompt = `
              [PERHATIAN KHUSUS - KERESAHAN KLIEN]:
              Klien mengeluhkan: "${data.concerns}"
              
              INSTRUKSI:
              Di sub-bab ini, Anda WAJIB mengaitkan analisis data dengan masalah tersebut.
              Berikan jawaban atau perspektif yang MENJAWAB keresahan ini secara langsung.
              `;
          }
      }

      // 2. Prompt Final
      const prompt = `
      [DATA POSISI PLANET CHART KLIEN]:
      ${extractedTechnicalData}

      [IDENTITAS KLIEN]: ${finalClientName}
      [SUB-BAB SAAT INI]: ${section.title}

      [INSTRUKSI KONTEN]:
      ${section.prompt}

      ${specificConcernPrompt}
      
      [GAYA BAHASA & ATURAN]:
      - Gunakan kata ganti "SAYA" untuk diri Anda.
      - JANGAN MEMULAI dengan "Duduklah/Tarik Napas" (Kecuali di Preface).
      - Langsung to the point ke tabel dan analisis.
      - Pastikan Tabel Data Teknis selalu ada di awal bab.
      `;

      // 3. Streaming
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.75 }
      });

      let sectionText = "";
      const header = `## ${section.title}\n\n`;
      
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          sectionText += text;
          onStream(accumulatedReport + header + sectionText); 
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

      accumulatedReport += header + sectionText + "\n\n<div class='page-break'></div>\n\n";
  }

  return accumulatedReport;
};

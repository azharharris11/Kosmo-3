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
Anda adalah Natalie Lau, Konsultan Kosmografi Premium.

CORE IDENTITY:
Anda bukan AI, bukan robot, bukan penulis artikel SEO. Anda adalah konsultan *High-End* yang berbicara dengan manusia (Klien).

STRICT GHOSTWRITING RULES (ANTI-ROBOT):
1.  **NO META-TALK**: DILARANG KERAS menulis kalimat pengantar teknis seperti:
    *   ❌ "Berikut adalah tabel..."
    *   ❌ "Dalam bab ini saya akan membahas..."
    *   ❌ "Tabel di bawah menunjukkan..."
    *   ❌ "Mari kita lihat analisis..."
    *   ✅ LANGSUNG bicara intinya: "Matahari Anda berada di posisi lemah, yang artinya..."

2.  **TABEL INTEGRATED**: Jika diminta membuat tabel, BUATLAH TABEL MARKDOWN LANGSUNG. Jangan beri judul atau kalimat pengantar "The following table:". Biarkan tabel itu berdiri sendiri secara visual.

3.  **CONNECTIVITY**: Ingat apa yang sudah Anda bahas. Jangan terdengar seperti penderita amnesia. Hubungkan masalah kesehatan dengan kondisi mental (Moon), hubungkan masalah uang dengan karakter impulsif (Mars/Rahu).

4.  **TONE**: Elegan, Dewasa, Tajam tapi Tidak Melodramatis. 
    *   ❌ "Saya akan brutal dan menghancurkan ego Anda." (Terlalu drama).
    *   ✅ "Kita perlu jujur: pola ini merugikan Anda." (Profesional).

5.  **FORMAT**: Markdown murni.

CONTEXT:
Waktu Sekarang: 2025.
Metode: Sidereal Zodiac (Raman Ayanamsa).
`;

// --- KEYWORDS UNTUK DETEKSI KERESAHAN ---
const SECTION_KEYWORDS: Record<string, string[]> = {
  'BAB_1': ['karakter', 'jiwa', 'diri', 'sifat', 'bakat', 'potensi', 'bingung', 'siapa saya', 'introvert', 'extrovert'],
  'BAB_2': ['mental', 'pikir', 'stres', 'cemas', 'overthinking', 'keputusan', 'takut', 'trauma', 'batin'],
  'BAB_3': ['karir', 'kerja', 'bisnis', 'profesi', 'jabatan', 'usaha', 'kantor', 'boss', 'resign', 'promosi'],
  'BAB_4': ['uang', 'kaya', 'miskin', 'dana', 'modal', 'hutang', 'investasi', 'rezeki', 'tabungan', 'bangkrut'],
  'BAB_5': ['cinta', 'jodoh', 'nikah', 'pasangan', 'suami', 'istri', 'cerai', 'selingkuh', 'pacar', 'menikah'],
  'BAB_6': ['sehat', 'sakit', 'fisik', 'stamina', 'penyakit', 'lelah', 'diet', 'medis'],
  'BAB_7': ['masa depan', 'tahun ini', 'prediksi', 'nasib', 'rencana', 'target', 'kapan', 'waktu']
};

// --- STRUKTUR LAPORAN GRANULAR (SUB-BAB) ---
const getSections = (dateContext: string, clientName: string, semester1Range: string, semester2Range: string) => {
  return [
  {
    id: 'PREFACE',
    title: 'Surat Pembuka',
    prompt: `
    **TUGAS: Tulis Surat Personal.**
    Sapa ${clientName}. Jelaskan secara singkat bahwa ini adalah analisis Sidereal (Peta Bintang Nyata). Ajak dia untuk melihat cermin diri. Gunakan bahasa yang hangat namun berwibawa.
    `
  },
  {
    id: 'BAB_1_1',
    title: '1.1 Blueprint Jiwa: Topeng vs Realita',
    prompt: `
    **DATA INPUT:** Lagna (Ascendant) & Sun.
    
    **OUTPUT TABEL:**
    Buat tabel Markdown (Tanpa teks pengantar) berisi: Planet/Point, Sign, House, Nakshatra.

    **NARASI:**
    Bandingkan "Siapa Anda di mata orang lain" (Lagna) vs "Siapa Anda saat sendirian" (Sun). Apakah ada konflik? Ceritakan seperti Anda menceritakan karakter novel.
    `
  },
  {
    id: 'BAB_1_2',
    title: '1.2 Psikologi & Pola Emosi',
    prompt: `
    **DATA INPUT:** Moon & Mercury.
    
    **OUTPUT TABEL:**
    Buat tabel Markdown (Tanpa teks pengantar) berisi: Moon, Mercury.

    **NARASI:**
    Bedah isi kepala klien. Bagaimana dia memproses luka batin? Apa kelemahan mental terbesarnya (Cemas/Dendam/Lari dari masalah)? 
    *Catatan: Analisis ini akan digunakan sebagai referensi bab selanjutnya, jadi buatlah sangat tajam.*
    `
  },
  {
    id: 'BAB_2_1',
    title: '2.1 Analisis Kosmik: Kekuatan Super',
    prompt: `
    **DATA INPUT:** Planet Terkuat (Exalted/Own Sign/Digbala).
    
    **OUTPUT TABEL:**
    Tabel Planet Terkuat (Tanpa teks pengantar).

    **NARASI:**
    Langsung sebutkan apa senjata terhebatnya. "Anda memiliki Mars yang luar biasa, ini artinya..." Jangan bertele-tele.
    `
  },
  {
    id: 'BAB_2_2',
    title: '2.2 Titik Rapuh & Blindspot',
    prompt: `
    **DATA INPUT:** Planet Lemah/Malefic.
    
    **OUTPUT TABEL:**
    Tabel Planet Lemah (Tanpa teks pengantar).

    **NARASI:**
    Identifikasi pola self-sabotage. Kapan biasanya "musuh dalam selimut" ini muncul merusak rencana? Berikan strategi mitigasi mental.
    `
  },
  { 
    id: 'BAB_3_1', 
    title: '3.1 Peta Karier & Panggilan Jiwa', 
    prompt: `
    **DATA INPUT:** House 10, Saturn.
    
    **OUTPUT TABEL:**
    Tabel Indikator Karir (Tanpa teks pengantar).

    **NARASI:**
    Berdasarkan profil psikologisnya tadi, lingkungan kerja apa yang membunuh jiwanya dan lingkungan apa yang menyuburkannya? Apakah dia cocok jadi Spesialis atau Generalis?
    ` 
  },
  { 
    id: 'BAB_3_2', 
    title: '3.2 Strategi Profesional & Timing', 
    prompt: `
    **DATA INPUT:** Dasha & Transit.
    
    **OUTPUT TABEL:**
    Tabel Periode Dasha Aktif (Tanpa teks pengantar).

    **NARASI:**
    Kapan momentum terbaik untuk promosi/pindah? Identifikasi hambatan yang mungkin muncul dari *karakter* klien sendiri (malas/takut/ragu).
    ` 
  },
  { 
    id: 'BAB_4_1', 
    title: '4.1 Potensi Kekayaan & Aset', 
    prompt: `
    **DATA INPUT:** House 2 & 11.
    
    **OUTPUT TABEL:**
    Tabel Indikator Keuangan (Tanpa teks pengantar).

    **NARASI:**
    Analisis gaya "money management" alamiahnya. Apakah dia tipe penimbun atau tipe yang uangnya 'panas' di tangan?
    ` 
  },
  { 
    id: 'BAB_4_2', 
    title: '4.2 Kebocoran Finansial', 
    prompt: `
    **DATA INPUT:** House 12 & 6.
    
    **OUTPUT TABEL:**
    Tabel Risiko Keuangan (Tanpa teks pengantar).

    **NARASI:**
    Dimana "lubang" di kantongnya? Peringatkan tentang jenis transaksi atau investasi yang berbahaya bagi chart spesifik ini.
    ` 
  },
  { 
    id: 'BAB_5_1', 
    title: '5.1 Karakteristik Pasangan Jiwa', 
    prompt: `
    **DATA INPUT:** House 7 & Venus.
    
    **OUTPUT TABEL:**
    Tabel Indikator Cinta (Tanpa teks pengantar).

    **NARASI:**
    Lupakan tipe ideal fisiknya. Jelaskan tipe karakter seperti apa yang sebenarnya *dibutuhkan* jiwanya untuk bertumbuh?
    ` 
  },
  { 
    id: 'BAB_5_2', 
    title: '5.2 Dinamika Hubungan', 
    prompt: `
    **DATA INPUT:** Mars (Kuja) & House 8.
    
    **OUTPUT TABEL:**
    Tabel Potensi Konflik (Tanpa teks pengantar).

    **NARASI:**
    Pola toxic apa yang sering dia bawa ke dalam hubungan? (Misal: Silent treatment atau posesif). Berikan solusi konkret.
    ` 
  },
  { 
    id: 'BAB_6', 
    title: '6. Kesehatan & Vitalitas', 
    prompt: `
    **DATA INPUT:** House 6 & Saturn.
    
    **OUTPUT TABEL:**
    Tabel Indikator Kesehatan (Tanpa teks pengantar).

    **NARASI:**
    Hubungkan dengan BAB PSIKOLOGI: Apakah stres mentalnya bermanifestasi jadi penyakit fisik tertentu? Apa sinyal tubuh yang sering dia abaikan?
    ` 
  },
  { 
    id: 'BAB_7_1', 
    title: `7.1 Forecast Semester I (${semester1Range})`, 
    prompt: `
    **FOKUS WAKTU:** ${semester1Range}.
    
    **OUTPUT TABEL:**
    Tabel Tanggal Penting (Tanpa teks pengantar). Kolom: Tanggal, Event, Potensi.

    **NARASI:**
    Jangan tulis "Berikut adalah prediksi". Langsung ceritakan alur cerita 6 bulan ini. Apa tema besarnya? Kapan harus injak gas, kapan harus rem?
    ` 
  },
  { 
    id: 'BAB_7_2', 
    title: `7.2 Forecast Semester II (${semester2Range})`, 
    prompt: `
    **FOKUS WAKTU:** ${semester2Range}.
    
    **OUTPUT TABEL:**
    Tabel Tanggal Penting Semester 2 (Tanpa teks pengantar).

    **NARASI:**
    Bagaimana plot twist tahun ini berakhir? Persiapan apa yang harus dilakukan untuk tahun depan?
    ` 
  },
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Penutup', 
    prompt: `
    **TUGAS:**
    Rangkum 3 poin vital. Berikan satu kalimat penutup yang kuat dan memberdayakan. Tanpa basa-basi "Demikian laporan ini".
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
    if (files.length === 0 && rawText.length > 5) return { text: rawText };

    const extractionPrompt = `
    PERAN: Data Entry Kosmografi.
    TUGAS: Ekstrak data planet.
    OUTPUT: JSON Valid.
    
    FORMAT JSON:
    {
       "detectedName": "Nama Klien (jika ada di gambar)",
       "markdownTable": "| Planet | Sign | House | Nakshatra | Degree |\n|---|---|---|---|---|\n..."
    }
    `;

    try {
        const result = await ai.models.generateContent({
            model: model,
            contents: { role: 'user', parts: [{ text: extractionPrompt }, ...files] },
            config: { responseMimeType: "application/json" }
        });
        
        const responseText = result.text || "{}";
        const parsed = JSON.parse(responseText);
        
        return {
            text: parsed.markdownTable || "Gagal ekstrak tabel.",
            detectedName: parsed.detectedName !== "null" ? parsed.detectedName : undefined
        };

    } catch (e) {
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
  
  // Variabel Memori untuk Konektivitas
  let psychologyContext = ""; 

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
  let finalClientName = data.clientName;

  try {
     const extractionResult = await extractChartData(ai, modelName, processedFiles, data.rawText);
     extractedTechnicalData = extractionResult.text;
     
     if (extractionResult.detectedName && extractionResult.detectedName.length > 2) {
         finalClientName = extractionResult.detectedName;
         if (onNameDetected) onNameDetected(finalClientName);
     }
     
     totalInputTokens += 1000; totalOutputTokens += 500;
  } catch (e) {
     extractedTechnicalData = "Data input manual: " + data.rawText;
  }

  // Header Data Teknis - REMOVE PAGE BREAK
  accumulatedReport += `## Data Teknis Planet\n\n${extractedTechnicalData}\n\n`;
  onStream(accumulatedReport);

  // C. GENERATE PER SUB-BAB
  const semester1Range = getMonthRange(data.analysisDate, 0, 6);
  const semester2Range = getMonthRange(data.analysisDate, 6, 6);
  const sections = getSections(data.analysisDate, finalClientName, semester1Range, semester2Range);
  
  for (const section of sections) {
      onStatusUpdate(`Menulis: ${section.title}...`);

      // 1. Cek Keresahan User (Logic Baru: Filter by Keywords)
      let specificConcernPrompt = "";
      if (data.concerns && data.concerns.length > 3) {
           let category = 'UMUM';
           if (section.id.startsWith('BAB_1')) category = 'BAB_1';
           else if (section.id.startsWith('BAB_2')) category = 'BAB_2';
           else if (section.id.startsWith('BAB_3')) category = 'BAB_3';
           else if (section.id.startsWith('BAB_4')) category = 'BAB_4';
           else if (section.id.startsWith('BAB_5')) category = 'BAB_5';
           else if (section.id.startsWith('BAB_6')) category = 'BAB_6';
           else if (section.id.startsWith('BAB_7')) category = 'BAB_7';

           const keywords = SECTION_KEYWORDS[category] || [];
           const isRelevant = keywords.some(kw => data.concerns.toLowerCase().includes(kw));
           const isClosing = section.id === 'BAB_CLOSE';

           if (isRelevant || isClosing) {
               specificConcernPrompt = `
               [KERESAHAN SPESIFIK KLIEN]: "${data.concerns}"
               INSTRUKSI KHUSUS: Kaitkan analisis bab ini dengan keresahan tersebut.
               `;
           }
      }

      // 2. Logic Konektivitas (Context Injection)
      let connectivityPrompt = "";
      if (['BAB_3_1', 'BAB_5_2', 'BAB_6'].includes(section.id) && psychologyContext.length > 10) {
          connectivityPrompt = `
          [CONTEXT PSIKOLOGIS KLIEN]: "${psychologyContext.substring(0, 500)}..."
          INSTRUKSI: Hubungkan analisis bab ini dengan profil psikologis di atas.
          `;
      }

      // 3. Prompt Final
      const prompt = `
      [DATA CHART]: ${extractedTechnicalData}
      [IDENTITAS]: ${finalClientName}
      [SUB-BAB]: ${section.title}
      [INSTRUKSI KONTEN]: ${section.prompt}
      ${connectivityPrompt}
      ${specificConcernPrompt}
      
      [REMINDER GAYA BAHASA]:
      - JANGAN GUNAKAN KATA PENGANTAR.
      - LANGSUNG ke inti analisis.
      - Gunakan "SAYA".
      `;

      // 4. Streaming
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 }
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

      if (section.id === 'BAB_1_2') {
          psychologyContext = sectionText;
      }

      // REMOVED: "\n\n<div class='page-break'></div>\n\n"
      // Biarkan H2 di bab berikutnya yang menangani page break secara CSS jika diperlukan.
      accumulatedReport += header + sectionText + "\n\n";
  }

  return accumulatedReport;
};

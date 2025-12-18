import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

// --- KONFIGURASI HARGA (ESTIMASI) ---
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

// --- SYSTEM PROMPT: KONSULTAN PREMIUM YANG "MEMBUMI" ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, konsultan Cosmography Premium (Strategic Astrologer).
Klienmu adalah orang cerdas yang awam astrologi. Tugasmu adalah membuat "Buku Panduan Hidup" setebal 40+ halaman yang enak dibaca seperti novel, tapi akurat seperti jurnal medis.

CORE WRITING RULES (WAJIB):
1.  **THE ANALOGY RULE**: DILARANG menyebut istilah teknis (Planet/House/Nakshatra) tanpa diikuti ANALOGI.
    * *Salah*: "Saturnus di House 2 menyebabkan penundaan."
    * *Benar*: "Saturnus di Sektor Keuanganmu ibarat 'Manager Bank yang Pelit'. Dia tidak akan memberi pinjaman cepat, tapi dia memaksamu menabung sedikit demi sedikit sampai jadi bukit."
    
2.  **EXPAND & EDUCATE**: Jangan menyingkat. Jelaskan filosofi di balik setiap aspek sebelum menganalisisnya. Anggap kamu sedang mengajar privat.
    
3.  **CONVERSATIONAL TONE**: Gunakan kata ganti "SAYA" dan "KAMU". Jadilah seperti kakak senior yang bijak, empatik, tapi tegas. Jangan kaku seperti robot.

4.  **MEDICAL & TACTICAL**: Jangan cuma motivasi. Berikan diagnosa fisik (kesehatan) dan strategi uang/karir yang konkret.

5.  **VOLUME HACK**: Gunakan banyak Studi Kasus ("Bayangkan jika...") untuk memperpanjang laporan dan memperjelas poin.
`;

// --- STRUKTUR BAB YANG DI-ATOMISASI (AGAR TEBAL & DETAIL) ---
const getSections = (dateContext: string, clientName: string) => {

  // Helper: Prompt khusus untuk gaya bercerita yang panjang
  const storytellerPrompt = (topic: string, analogyHint: string, instruction: string) => `
    Topik Utama: "${topic}"
    Analogi Wajib: Gunakan metafora tentang "${analogyHint}".
    
    Instruksi Detail:
    ${instruction}
    
    Struktur Penulisan (Min 800-1000 Kata):
    1.  **Filosofi & Analogi**: Jelaskan konsep ini dengan cerita yang menarik.
    2.  **Bedah Data Klien**: Apa yang terjadi di chart klien? Terjemahkan bahasa langit ke bahasa bumi.
    3.  **Deep Dive Psikologis**: Apa yang dirasakan batin klien tapi tak terucap?
    4.  **Skenario Nyata**: Berikan contoh kasus "Jika kamu melakukan A, hasilnya B".
    5.  **Action Plan**: Solusi konkret.
  `;

  return [
    // --- INTRO & EXECUTIVE SUMMARY ---
    {
      id: 'EXEC_SUM',
      title: 'Executive Summary (Rangkuman Awal)',
      prompt: 'Buat Rangkuman Eksekutif 2 halaman. Fokus: Big 3 Identity, Status Dasha Saat Ini, 3 Peluang Emas 2025, dan 1 Peringatan Fatal. Gunakan bahasa lugas ala CEO.'
    },
    {
      id: 'PHILOSOPHY',
      title: 'Pendahuluan: Membaca Peta Langit',
      prompt: 'Tulis esai pengantar. Jelaskan bahwa Cosmography bukan klenik, tapi "Analisis Data Cuaca Kehidupan". Ajak klien untuk rileks dan membuka pikiran.'
    },

    // --- BAB 1: IDENTITY (Dipecah 3 Bagian) ---
    { 
      id: 'BAB1_LAGNA', 
      title: 'Bab 1.1: Topeng Publik (The Ascendant)', 
      prompt: storytellerPrompt('Lagna / Rising Sign', 'Casing HP atau Baju Zirah', 'Jelaskan bagaimana orang lain melihat klien vs siapa klien sebenarnya. Apa kekuatan super dari zodiak ini?') 
    },
    { 
      id: 'BAB1_RULER', 
      title: 'Bab 1.2: Nahkoda Hidup (Chart Ruler)', 
      prompt: storytellerPrompt('Chart Ruler (Planet Penguasa Lagna)', 'Supir atau Kapten Kapal', 'Planet ini menyetir hidup klien ke arah mana? Ke karir, keluarga, atau spiritual?') 
    },
    { 
      id: 'BAB1_VITALITY', 
      title: 'Bab 1.3: Vitalitas & Aura Fisik', 
      prompt: 'Analisis kesehatan dasar dan aura. Apakah klien tipe yang mudah sakit atau tahan banting? Berikan tips bio-hacking sederhana untuk energi.' 
    },

    // --- BAB 2: MENTAL & EMOSI (Dipecah 2 Bagian) ---
    { 
      id: 'BAB2_SUN', 
      title: 'Bab 2.1: Ambisi & Ego (The Sun)', 
      prompt: storytellerPrompt('Matahari (Sun)', 'Raja atau CEO dalam Diri', 'Apa yang membuat ego klien merasa bangga? Apa bahan bakar motivasinya?') 
    },
    { 
      id: 'BAB2_MOON', 
      title: 'Bab 2.2: Batin & Emosi (The Moon)', 
      prompt: storytellerPrompt('Bulan (Moon) & Nakshatra', 'Lensa Kamera atau Filter Instagram', 'Jelaskan Nakshatra (Bintang) spesifik klien. Apakah instingnya seperti Ular, Rusa, atau Petir? Gali sisi gelap emosinya.') 
    },

    // --- BAB 3: KEKAYAAN (Dipecah 3 Bagian) ---
    { 
      id: 'BAB3_INCOME', 
      title: 'Bab 3.1: Keran Rezeki (House 2)', 
      prompt: storytellerPrompt('House 2', 'Gudang Makanan atau Dompet', 'Dari mana uang datang paling mudah? Keluarga, bicara, atau kerja keras?') 
    },
    { 
      id: 'BAB3_GAINS', 
      title: 'Bab 3.2: Uang Besar & Koneksi (House 11)', 
      prompt: storytellerPrompt('House 11', 'Jaring Nelayan atau Panen Raya', 'Apakah klien punya bakat kaya raya lewat jaringan teman? Atau investasi?') 
    },
    { 
      id: 'BAB3_STRATEGY', 
      title: 'Bab 3.3: Blueprint Kebebasan Finansial', 
      prompt: 'Berikan strategi keuangan konkret. Jangan pakai istilah planet. Gunakan istilah: Properti, Saham, Bisnis Jasa, atau Royalti sesuai indikasi chart.' 
    },

    // --- BAB 4: CINTA & KELUARGA (Dipecah 3 Bagian - SENSITIF) ---
    { 
      id: 'BAB4_PARTNER', 
      title: 'Bab 4.1: Sosok Jodoh Sejati (Darakaraka)', 
      prompt: storytellerPrompt('Darakaraka & House 7', 'Partner Sparring atau Co-Pilot', 'Deskripsikan fisik dan karakter jodoh sedetail mungkin. Apakah dia orang kantoran, seniman, atau pebisnis?') 
    },
    { 
      id: 'BAB4_CONFLICT', 
      title: 'Bab 4.2: Dinamika Rumah Tangga', 
      prompt: 'Jujur soal potensi konflik. Apakah masalahnya di komunikasi, uang, atau mertua? Berikan solusi "Rules of Engagement" agar langgeng.' 
    },
    { 
      id: 'BAB4_MEDICAL', 
      title: 'Bab 4.3: Seksualitas & Keturunan (Medis)', 
      prompt: 'Bahas House 5 secara elegan tapi medis. Apakah ada indikasi "Panas" (Mars/Sun) yang mempengaruhi organ reproduksi? Berikan saran kesehatan preventif.' 
    },

    // --- BAB 5: KALENDER TAKTIS (Dipecah 4 Kuartal - VOLUME MAKSIMAL) ---
    { 
      id: 'CALENDAR_Q1', 
      title: 'Roadmap Q1 (Januari - Maret)', 
      prompt: 'Analisis PER BULAN untuk Q1. Tentukan tanggal "Lampu Merah" (Bahaya) dan "Lampu Hijau" (Peluang). Jelaskan ALASANNYA dengan bahasa awam (misal: "Komunikasi macet total", bukan "Mercury Retrograde").' 
    },
    { 
      id: 'CALENDAR_Q2', 
      title: 'Roadmap Q2 (April - Juni)', 
      prompt: 'Analisis PER BULAN untuk Q2. Fokus pada peluang asmara dan karir. Berikan tanggal spesifik untuk aksi nyata.' 
    },
    { 
      id: 'CALENDAR_Q3', 
      title: 'Roadmap Q3 (Juli - September)', 
      prompt: 'Analisis PER BULAN untuk Q3. Fokus pada keuangan dan kesehatan. Peringatkan jika ada momen rawan sakit.' 
    },
    { 
      id: 'CALENDAR_Q4', 
      title: 'Roadmap Q4 (Oktober - Desember)', 
      prompt: 'Analisis PER BULAN untuk Q4. Penutup tahun dan persiapan tahun depan.' 
    },

    // --- PENUTUP ---
    { 
      id: 'REMEDIES', 
      title: 'Bab Terakhir: Bio-Hacking (Resep Obat)', 
      prompt: 'Berikan daftar "Obat" non-medis. Warna apa yang bawa hoki? Puasa hari apa? Donasi ke siapa? Berikan resep konkret.' 
    },
    { 
      id: 'CLOSING', 
      title: 'Pesan Sahabat', 
      prompt: 'Surat penutup yang hangat, memotivasi, dan personal dari Natalie untuk sahabat barunya.' 
    }
  ];
};

export const generateReport = async (
  data: ClientData,
  onStream: (fullContent: string) => void,
  onStatusUpdate: (status: string) => void,
  onUsageUpdate: (stats: UsageStats) => void,
  onNameDetected?: (name: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = data.selectedModel || 'gemini-3-flash-preview'; // Gunakan model konteks besar
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gemini-3-flash-preview'];

  let accumulatedReport = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let rollingSummary = ""; 
  let currentClientName = data.clientName || "Sahabat";

  const sections = getSections(formatDate(data.analysisDate), currentClientName);
  
  // CONTEXT KHUSUS: DIAGNOSA MIKRO
  const concernContext = data.concerns && data.concerns.trim().length > 3
    ? `[FOCUS AREA]: Klien curhat: "${data.concerns}". Jawab dengan DIAGNOSA TEKNIS & SOLUSI, bukan sekadar motivasi.`
    : `[FOCUS AREA]: Lakukan "General Check-up" menyeluruh. Cari potensi tersembunyi dan risiko fatal.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menyusun Rangkuman Eksekutif...' : `Menganalisis: ${section.title}...`);
        
        const prompt = `
        BAGIAN LAPORAN: ${section.title}
        
        RANGKUMAN BAB SEBELUMNYA: ${rollingSummary || "Awal Analisis"}
        
        ${concernContext}
        
        [INSTRUKSI KHUSUS BAB INI]: ${section.prompt}
        
        [DATA ASTROLOGI MENTAH KLIEN]: ${data.rawText || "Gunakan data file. Jika D9/Nakshatra tidak ada, estimasikan dari posisi derajat planet."}

        ATURAN PENULISAN (ABSOLUTE):
        1.  **GAYA BAHASA**: Storytelling, Renyah, Mudah Dipahami, Penuh Analogi.
        2.  **FORMAT**: Gunakan Heading, Sub-heading, dan Bullet points. JANGAN GUNAKAN TABEL (sulit dibaca di HP).
        3.  **PERSPEKTIF**: Gunakan "SAYA" (Natalie).
        4.  **PANJANG**: Tulis minimal 800 kata per bagian ini untuk kedalaman maksimal.
        `;

        const processedFiles: any[] = [];
        for (const file of data.files) {
          const base64Data = await fileToBase64(file);
          processedFiles.push({ inlineData: { mimeType: file.type, data: base64Data } });
        }

        // Chain of Thought Prompting untuk kontinuitas
        const chainTag = `\n\n[[SUMMARY: (Tuliskan poin data teknis penting dari bab ini untuk diingat di bab selanjutnya, jangan ditampilkan ke user)]]`;

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: { role: 'user', parts: [{ text: prompt + chainTag }, ...processedFiles] },
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 } // Agak kreatif untuk storytelling
        });

        let sectionContent = "";
        const nameRegex = /\[\[NAME:\s*(.*?)\]\]/i;
        const summaryRegex = /\[\[SUMMARY:\s*(.*?)\]\]/is;

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            sectionContent += text;
            
            // Deteksi Nama di Bab 1
            if (section.id === 'BAB1_LAGNA') {
              const nameMatch = sectionContent.match(nameRegex);
              if (nameMatch && onNameDetected) onNameDetected(nameMatch[1].trim());
            }
            
            // Bersihkan tag internal sebelum stream ke user
            let displayContent = (accumulatedReport ? accumulatedReport + "\n\n---\n\n" : "") + sectionContent;
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

        // Simpan Summary untuk Context Bab Berikutnya
        const summaryMatch = sectionContent.match(summaryRegex);
        if (summaryMatch) rollingSummary = summaryMatch[1].trim();

        // Final cleaning
        let cleanText = sectionContent.replace(nameRegex, "").replace(summaryRegex, "").trim();
        
        if (accumulatedReport) accumulatedReport += "\n\n---\n\n"; // Pemisah Halaman
        accumulatedReport += cleanText;
        sectionSuccess = true;

      } catch (err) {
        console.error(`Error generating section ${section.id}:`, err);
        attempts++;
        if (attempts >= maxAttempts) {
          accumulatedReport += `\n\n*(Maaf, sinyal terputus saat menulis Bab ${section.title}. Melanjutkan ke bab berikutnya...)*`;
        } else {
          await wait(2000 * attempts); // Backoff retry
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
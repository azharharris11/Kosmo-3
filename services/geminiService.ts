import { GoogleGenAI } from "@google/genai";
import { ClientData, UsageStats } from "../types";

// --- KONFIGURASI HARGA & MODEL ---
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

// --- SYSTEM PROMPT: RAW, PSYCHOLOGICAL, NO-BULLSHIT ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Astrolog Kosmografi & Profiler Psikologis untuk Ultra-High-Net-Worth Individuals.
Gaya bicaramu: **"Tough Love", Provokatif, Tajam, dan Sedikit Gelap.** Kamu bukan motivator, kamu adalah cermin yang memperlihatkan retakan di jiwa mereka.

ATURAN UTAMA (NEGATIVE CONSTRAINTS) - WAJIB PATUH:
1. **DILARANG BASA-BASI**: HAPUS semua kalimat pengantar seperti "Berikut adalah tabel...", "Pada bab ini kita akan membahas...", "Mari kita lihat...". LANGSUNG TULIS INTINYA.
2. **JANGAN ROBOTIK**: Jangan mengulang struktur kalimat. Gunakan pertanyaan retoris, sarkasme halus, dan metafora tajam.
3. **KONTEKS KONTINU**: Anggap ini satu buku utuh. JANGAN menyapa "Halo" atau memperkenalkan diri lagi setelah Executive Summary.
4. **FOKUS PADA "WHY" & "CONFLICT"**: Jangan cuma bilang planet ada di mana. Jelaskan KONFLIK BATIN apa yang timbul.
5. **BAHASA MENTAH**: Gunakan istilah psikologis (Sabotase Diri, Paranoia, Topeng Sosial, Scarcity Mindset). Hindari bahasa korporat kaku.

ATURAN VISUAL (STRICT):
1. **JUDUL BAB**: Baris pertama output WAJIB: \`## Judul Bab Provokatif\`.
2. **TABEL DATA**:
    - Wajib ada di awal bab (kecuali Exec Summary).
    - Maksimal 4 Kolom.
    - Isi sel harus **SINGKAT & PADAT** (Maks 5-7 kata).
3. **SUB-BAB**: Gunakan Heading 3 (###) untuk memecah topik.
`;

// --- STRUKTUR 7 BAB PREMIUM (EXTENDED OUTLINE) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- HALAMAN 1: EXECUTIVE SUMMARY ---
  {
    id: 'EXEC_SUM',
    title: 'Executive Summary: The Blueprint',
    prompt: `
    TUGAS: Tulis **EXECUTIVE SUMMARY** yang terasa seperti "Surat Peringatan Pribadi".
    
    1.  **Sapaan**: "Halo, ${clientName}." (Singkat).
    2.  **TABEL PILAR**: Rangkum "Big Three" (Sun, Moon, Rising) + Chart Ruler.
    3.  **THE HOOK**: Tembak langsung ke masalah terbesarnya.
        - Validasi kekuatan supernya (Pujian Strategis).
        - Bongkar kelemahan fatalnya (Kritik Tajam).
    4.  **Highlight Periode**: Satu kalimat tajam tentang Dasha/Periode saat ini. Apakah ini waktunya perang atau tiarap?
    `
  },

  // --- BAB 1: MENTAL (Mind) ---
  { 
    id: 'BAB1', 
    title: 'Bab 1: Analisis Psikologi & Mental (The Psyche)', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **MOON** (Pikiran/Emosi) & **MERCURY** (Logika).
    2. Cek **RAHU/KETU** (Obsesi & Ketakutan).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Planet | Posisi | Dampak Psikologis].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 1.1 Operating System Otakmu
    Bagaimana caramu memproses data? Apakah overthinker (Moon Afflicted) atau jenius taktis (Mercury Strong)?
    
    ### 1.2 Lubang Hitam Emosional
    Apa obsesi karmikmu (Rahu) dan di mana kamu merasa hampa (Ketu)? Bongkar ketakutan terbesarnya.
    
    ### 1.3 Mekanisme Pertahanan Diri
    Bagaimana reaksimu saat tertekan? Apakah meledak atau implosif?
    ` 
  },

  // --- BAB 2: FISIK (Body) ---
  { 
    id: 'BAB2', 
    title: 'Bab 2: Vitalitas & Kesehatan Fisik', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **House 6** (Penyakit Akut), **House 8** (Kronis).
    2. Cek **SUN** (Vitalitas Dasar).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Area Tubuh | Indikator Planet | Risiko].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 2.1 Titik Lemah Biologis
    Organ apa yang paling rawan "rusak" jika kamu stres? (Misal: Lambung, Jantung, atau Saraf).
    
    ### 2.2 Baterai Energimu
    Apakah kamu tipe sprinter (Mars) atau marathon runner (Saturn)? Kapan energimu habis?
    
    ### 2.3 Prediksi Medis Jangka Panjang
    Peringatan dini untuk penyakit di masa tua. Berikan saran preventif keras.
    ` 
  },
  
  // --- BAB 3: UANG & KARIER (Wealth) ---
  { 
    id: 'BAB3', 
    title: 'Bab 3: Arsitektur Kekayaan & Karier', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **House 2** (Aset), **House 10** (Karier), **House 11** (Keuntungan).
    2. Cek **KP Sub-Lord House 10** (Jalur Rezeki Spesifik).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Sektor | Planet Penguasa | Status Aliran Uang].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 3.1 Sumber Mata Air Rezeki
    Dari mana uang paling mudah datang? (Bisnis, Gaji, Warisan, atau Investasi?). Jelaskan jalurnya.
    
    ### 3.2 Gaya Kerjamu vs Realita
    Apakah kamu pemimpin (Sun/Mars) atau pelayan (Saturn)? Jangan memaksakan diri jadi CEO jika bakatmu adalah Specialist.
    
    ### 3.3 Potensi Puncak Karier
    Kapan momentum emasmu akan datang? (Berdasarkan Dasha periode besar).
    ` 
  },

  // --- BAB 4: RISIKO & MUSUH (The Dark Side) ---
  { 
    id: 'BAB4', 
    title: 'Bab 4: Musuh, Hutang & Risiko', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **House 6** (Musuh/Hutang), **House 8** (Krisis/Transformasi).
    2. Cek **House 12** (Pengeluaran/Musuh Tersembunyi).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Jenis Ancaman | Sumber Masalah | Level Bahaya].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 4.1 Siapa Musuhmu?
    Apakah musuhmu nyata (Kompetitor - H6) atau tersembunyi (Teman palsu/Skandal - H12)?
    
    ### 4.2 Jebakan Hutang & Kebangkrutan
    Apakah ada indikasi kehilangan uang besar? Peringatkan tentang spekulasi.
    
    ### 4.3 Reputasi & Skandal
    Apakah ada risiko aib terbongkar? (House 8). Bagaimana cara melindunginya?
    ` 
  },

  // --- BAB 5: CINTA (Love) ---
  { 
    id: 'BAB5', 
    title: 'Bab 5: Dinamika Cinta & Rumah Tangga', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **House 7** (Pasangan), **VENUS** (Romansa).
    2. Cek **MARS** (Gairah/Konflik) & **Dosha** (Manglik).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Aspek Cinta | Planet | Kondisi].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 5.1 Profil Jodoh Takdir
    Siapa yang akan melengkapimu (atau menghancurkanmu)? Jelaskan sifat pasangannya.
    
    ### 5.2 Bahasa Cinta & Red Flags
    Apakah kamu posesif, dingin, atau bucin? Apa sifat toxic-mu dalam hubungan?
    
    ### 5.3 Potensi Krisis & Perpisahan
    Apakah ada risiko perceraian atau LDR? (Cek House 7 Affliction).
    ` 
  },

  // --- BAB 6: LOKASI (Geography) ---
  { 
    id: 'BAB6', 
    title: 'Bab 6: Geografi Keberuntungan', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **House 3** (Perjalanan Pendek), **House 9** (Perjalanan Jauh).
    2. Cek **House 12** (Luar Negeri).
    
    [WRITING STEP]:
    **DATA TABLE**: Kolom [Lokasi | Potensi Sukses | Tantangan].
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 6.1 Energi Tempat Lahir
    Apakah kamu cocok tinggal di kota kelahiranmu? Atau energimu macet di sana?
    
    ### 6.2 Potensi Merantau
    Apakah rezekimu ada di seberang lautan? (House 9/12 Strong).
    
    ### 6.3 Arah Mata Angin
    Ke arah mana kamu harus bergerak untuk mencari peluang terbaik? (Utara/Selatan/Barat/Timur).
    ` 
  },

  // --- BAB 7: WAKTU (Timeline) ---
  { 
    id: 'BAB7', 
    title: 'Bab 7: Masterplan & Timeline Strategis', 
    prompt: `
    [INTERNAL MONOLOGUE - CARI DATA INI]:
    1. Cek **DASHA** (Periode Aktif) saat ini dan masa depan.
    2. Cek **Ghatak/Bad Days** (Pantangan).
    3. Cek **Remedies** (Solusi).
    
    [WRITING STEP]:
    **DATA TABLE**: Timeline 12 Bulan (Bulan | Fokus | Aksi Wajib).
    
    **SUB-BAB (Gunakan Heading ###):**
    ### 7.1 Tema Tahun Ini (${dateContext})
    Kamu sedang di musim apa? Perang, Panen, atau Hibernasi?
    
    ### 7.2 Kalender Pantangan (Ghatak)
    Hari apa atau bulan apa yang harus dihindari untuk keputusan besar?
    
    ### 7.3 Bio-Hacking (Remedies Logis)
    Terjemahkan ritual mistis menjadi habit nyata.
    (Contoh: "Puasa Senin" -> "Detoks Dopamin Hari Senin").
    ` 
  },

  // --- PENUTUP ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Pesan Terakhir', 
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
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Menganalisis DNA Kosmik...' : `Menulis ${section.title}...`);
        
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
        Gunakan data astrologi mentah ini untuk analisis mendalam (Cari keyword: Planet, House, Dasha, Sub-Lord, Dosha):
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
          config: { systemInstruction: NATALIE_SYSTEM_PROMPT, temperature: 0.7 } 
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
        if (section.id !== 'EXEC_SUM') {
           cleanText = cleanText
             .replace(/^(Halo|Hai|Dear|Kepada|Salam)\s+.*?(,|\.|\n)/gim, "") 
             .replace(/^(Berikut adalah|Mari kita|Pada bab ini|Tabel di bawah|Selanjutnya kita|Dalam astrologi,).+?(\:|\.|\n)/gim, "") 
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
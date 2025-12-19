
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

// --- SYSTEM PROMPT: NARRATIVE SOUL BIOGRAPHER (BAHASA PROFESIONAL & SASTRAWI) ---
const NATALIE_SYSTEM_PROMPT = `
Kamu adalah Natalie Lau, Penulis Biografi Jiwa & Konsultan Kosmografi Profesional.

HUBUNGAN DENGAN KLIEN:
- Klien adalah orang yang membayar jasa profesionalmu. Hormati mereka.
- Panggil klien dengan **Nama Depan mereka** atau **"Anda"**. 
- **DILARANG KERAS** menggunakan panggilan "Adik", "Kakak", "Bro", "Sis", atau bahasa gaul.
- Tone: Elegan, Mendalam (Deep), Puitis namun Logis, dan Sangat Personal. Bayangkan kamu sedang menulis surat eksklusif untuk seorang bangsawan.

ATURAN FORMAT (STRICTLY NARRATIVE):
1. **DILARANG MENGGUNAKAN BULLET POINTS ATAU NUMBERED LISTS.**
2. Tulislah dalam bentuk **PARAGRAF YANG MENGALIR** (Storytelling).
3. Jika ada poin-poin penting, *weave* (anyam) poin tersebut ke dalam kalimat yang utuh.
4. Gunakan **Bold** untuk menekankan kata kunci penting di dalam paragraf.
5. Gunakan subheading (###) hanya untuk memisahkan tema besar, bukan untuk membuat list.

FILOSOFI ANALISIS:
Jangan hanya membaca data, tapi ceritakan *kisah* di balik data itu.
- *Jangan tulis:* "Mars di House 1 menyebabkan sifat agresif."
- *Tulislah:* "Posisi Mars yang berdiri tegak di ruang identitas Anda menciptakan api alami dalam kepribadian Anda. Ini bukan sekadar agresivitas, melainkan sebuah dorongan purba untuk memimpin yang seringkali membuat orang lain merasa terintimidasi, namun sekaligus kagum pada keberanian Anda."

ATURAN "THE PIVOT":
Setiap kali membahas aspek sulit/negatif, akhiri paragraf tersebut dengan solusi atau sudut pandang yang memberdayakan. Jangan biarkan klien berhenti membaca dengan perasaan takut.
`;

// --- STRUKTUR "THE ALMANAC" (VERSI NARASI PENUH) ---
const getSections = (dateContext: string, clientName: string) => [
  // --- BAGIAN 1: DIAGNOSIS (MEMAHAMI DIRI) ---
  {
    id: 'EXEC_SUM',
    title: 'Ringkasan Jiwa & Potensi',
    prompt: `
    TUGAS: Tulis Esai Pembuka (Ringkasan Eksekutif) sepanjang 2 halaman.
    
    JANGAN GUNAKAN POIN-POIN. Ceritakan seperti sebuah prolog novel biografi.
    
    Alur Cerita:
    1. Mulailah dengan menyapa ${clientName} dengan hormat dan gambarkan "Archetype" (Karakter Utama) dia berdasarkan Big Three (Sun/Moon/Rising).
    2. Lanjutkan paragraf berikutnya dengan menceritakan kekuatan terbesarnya (Pedang).
    3. Masuk ke paragraf yang lebih kontemplatif tentang tantangan batinnya (Rantai).
    4. Tutup dengan paragraf tema besar tahun ini.
    `
  },
  { 
    id: 'BAB1', 
    title: 'Bab 1: Lanskap Pikiran & Ketenangan Batin', 
    prompt: `
    [Fokus: Moon & Mercury]
    
    TUGAS: Tulis esai mendalam tentang cara kerja pikiran klien (3 Halaman).
    
    Ceritakan bagaimana klien memproses dunia di sekitarnya. 
    - Apakah pikirannya seperti perpustakaan yang hening atau pasar yang ramai? 
    - Jelaskan nuansa kecemasan yang sering ia rasakan di paragraf tersendiri, lalu jahit solusinya di paragraf berikutnya.
    - Ingat: Tanpa bullet points. Gunakan transisi kalimat yang enak dibaca.
    ` 
  },
  { 
    id: 'BAB2', 
    title: 'Bab 2: Vitalitas Tubuh & Energi', 
    prompt: `
    [Fokus: Sun, House 6, Saturn]
    
    TUGAS: Narasi tentang Kesehatan dan Stamina (2 Halaman).
    
    Deskripsikan tubuh klien sebagai "Kendaraan Jiwa". 
    - Ceritakan tipe energi yang dimilikinya (Maraton vs Sprint).
    - Bahas sinyal-sinyal tubuh yang sering muncul saat stres dalam bentuk cerita peringatan.
    - Berikan saran gaya hidup yang diselipkan dalam kalimat saran yang bijak, bukan daftar instruksi medis.
    ` 
  },
  { 
    id: 'BAB3', 
    title: 'Bab 3: Peta Karier & Kekayaan', 
    prompt: `
    [Fokus: House 2, 10, Jupiter]
    
    TUGAS: Esai tentang Jalan Kesuksesan (3 Halaman).
    
    Analisis hubungan klien dengan materi dan ambisi.
    - Ceritakan peran apa yang paling cocok ia mainkan di panggung dunia (Pemimpin, Pencipta, atau Pelayan?).
    - Jelaskan aliran rezekinya: dari mana biasanya pintu terbuka lebar?
    - Bahas hambatan kariernya sebagai "ujian karakter" yang perlu ditaklukkan.
    ` 
  },
  { 
    id: 'BAB4', 
    title: 'Bab 4: Bayang-Bayang & Risiko', 
    prompt: `
    [Fokus: House 8, 12]
    
    TUGAS: Analisis Risiko dalam bentuk Narasi Peringatan (2 Halaman).
    
    Bicara tentang sisi gelap atau "Blind Spot" klien. 
    - Ceritakan pola kesalahan apa yang sering ia ulangi tanpa sadar.
    - Deskripsikan tipe orang atau situasi yang harus ia waspadai tahun ini.
    - Berikan "jimat" berupa nasihat kebijaksanaan untuk melindunginya.
    ` 
  },
  { 
    id: 'BAB5', 
    title: 'Bab 5: Dinamika Hati & Hubungan', 
    prompt: `
    [Fokus: House 7, Venus]
    
    TUGAS: Esai Romansa dan Kemitraan (3 Halaman).
    
    Bedah bahasa cinta dan pola relasinya.
    - Ceritakan apa yang sebenarnya jiwanya cari dari orang lain (bukan sekadar fisik).
    - Jika ada pola toxic, deskripsikan itu sebagai sebuah siklus yang harus diputus.
    - Tutup dengan gambaran hubungan ideal yang harmonis bagi chart ini.
    ` 
  },
  { 
    id: 'BAB6', 
    title: 'Bab 6: Geografi & Lingkungan', 
    prompt: `
    [Fokus: House 4, 9]
    
    TUGAS: Narasi tentang Tempat (2 Halaman).
    
    Jelaskan di mana klien akan merasa paling "hidup".
    - Apakah ia anak rumahan atau petualang?
    - Ceritakan atmosfer lingkungan yang dapat menyuburkan potensinya.
    ` 
  },

  // --- BAGIAN 2: THE ALMANAC (JURNAL PERJALANAN) ---
  { 
    id: 'BAB7_Q1', 
    title: 'Bab 7.1: Jurnal Kuartal Pertama (Januari - Maret)', 
    prompt: `
    MODE: JURNAL PERJALANAN (TRAVELOGUE).
    
    TUGAS: Ceritakan perjalanan nasib untuk 3 bulan pertama (mulai ${dateContext}).
    
    Alih-alih membuat list tanggal, tulislah per paragraf Bulan.
    
    Contoh gaya penulisan:
    "Memasuki **Januari**, langit meminta Anda untuk fokus pada... Tantangan mungkin muncul di pertengahan bulan, namun..."
    
    "Saat kalender berganti ke **Februari**, energi berubah menjadi..."
    ` 
  },
  { 
    id: 'BAB7_Q2', 
    title: 'Bab 7.2: Jurnal Kuartal Kedua (April - Juni)', 
    prompt: `
    MODE: JURNAL PERJALANAN.
    TUGAS: Lanjutkan cerita untuk April, Mei, Juni.
    Fokuskan narasi pada perkembangan Karier & Bisnis. Ceritakan plot twist yang mungkin terjadi.
    ` 
  },
  { 
    id: 'BAB7_Q3', 
    title: 'Bab 7.3: Jurnal Kuartal Ketiga (Juli - September)', 
    prompt: `
    MODE: JURNAL PERJALANAN.
    TUGAS: Lanjutkan cerita untuk Juli, Agustus, September.
    Fokuskan narasi pada Kesehatan & Kestabilan Keuangan.
    ` 
  },
  { 
    id: 'BAB7_Q4', 
    title: 'Bab 7.4: Jurnal Kuartal Keempat (Oktober - Desember)', 
    prompt: `
    MODE: JURNAL PERJALANAN.
    TUGAS: Lanjutkan cerita menuju akhir tahun.
    Ceritakan resolusi dan momen bersama keluarga/orang terdekat.
    ` 
  },

  // --- BAGIAN 3: BEKAL (DARI LIST JADI PARAGRAF) ---
  { 
    id: 'BAB8', 
    title: 'Bab 8: Ritual & Penyelarasan Diri', 
    prompt: `
    MODE: KONSULTAN SPIRITUAL.
    
    TUGAS: Jangan buat list. Tulislah paragraf-paragraf saran praktis.
    
    - Paragraf 1: Ceritakan tentang warna dan estetika yang memperkuat aura klien.
    - Paragraf 2: Ceritakan ritme waktu (pagi/malam) yang paling produktif baginya.
    - Paragraf 3: Ceritakan jenis asupan atau gaya hidup yang menyembuhkannya.
    ` 
  },
  { 
    id: 'BAB9', 
    title: 'Bab 9: Persimpangan Jalan (Simulasi)', 
    prompt: `
    MODE: PENASIHAT STRATEGIS.
    
    TUGAS: Ceritakan 3 kemungkinan masa depan dalam bentuk skenario naratif.
    
    "Bayangkan jika tahun ini Anda memilih jalur agresif (Skenario A), maka yang akan terjadi adalah..."
    
    "Namun, jika Anda memilih untuk bertahan (Skenario B), maka..."
    
    Akhiri dengan rekomendasi bijak Anda.
    ` 
  },
  
  // --- PENUTUP ---
  { 
    id: 'BAB_CLOSE', 
    title: 'Epilog', 
    prompt: `
    TUGAS: Surat Penutup Profesional namun Menyentuh.
    
    Ingatkan klien bahwa ia memegang kendali penuh atas takdirnya.
    Tanda tangan: "Natalie Lau".
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
    [KONTEKS KHUSUS DARI KLIEN]:
    "${data.concerns}"
    
    INSTRUKSI:
    Jadikan konteks ini sebagai benang merah cerita. Jika klien cemas soal X, bahas X secara mendalam di bab yang relevan dengan nada menenangkan dan solutif.
    `
    : `[NO SPECIFIC CONCERN]: Klien tidak memberikan konteks spesifik. Lakukan pembacaan menyeluruh.`;

  for (const section of sections) {
    let attempts = 0;
    const maxAttempts = 3;
    let sectionSuccess = false;

    while (attempts < maxAttempts && !sectionSuccess) {
      try {
        onStatusUpdate(section.id === 'EXEC_SUM' ? 'Membaca Kisah Bintang...' : `Menulis ${section.title}...`);
        
        const continuityPrompt = section.id === 'EXEC_SUM' 
          ? "Ini adalah AWAL DOKUMEN."
          : `
          KONTEKS SEBELUMNYA (Jaga alur cerita):
          "...${lastContext}"
          
          INSTRUKSI: Lanjutkan narasi langsung masuk ke topik ${section.title}. 
          Hindari pengulangan sapaan. Fokus pada konten.
          `;

        const prompt = `
        ${continuityPrompt}
        
        [JUDUL BAB SAAT INI]: ${section.title}
        
        ${concernContext}
        
        ${section.prompt}
        
        [DATA CHART KLIEN]:
        ${data.rawText || "Analisis berdasarkan file chart."}
        
        REMINDER UTAMA:
        - GUNAKAN FORMAT NARASI (PARAGRAF).
        - DILARANG PAKAI BULLET POINTS/LIST.
        - Tone: Profesional, Hangat, Mengalir.
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

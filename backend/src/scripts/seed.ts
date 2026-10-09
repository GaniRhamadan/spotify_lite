import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, getIsPostgresConnected, inMemoryStore, checkDatabaseConnection } from '../config/database';
import { ENV } from '../config/env';

/**
 * Membuat berkas WAV valid berisi nada melodi yang nyaman untuk pengujian audio
 */
function generateSampleWav(filePath: string, durationSeconds: number = 60, baseFrequency: number = 440, melodyPattern: number = 0) {
  const sampleRate = 44100;
  const numChannels = 2; // Stereo
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const numSamples = durationSeconds * sampleRate;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // Format Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // Data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate varied, musical, soothing waveforms with harmonic overtones and gentle chord progression
  let offset = 44;
  const chordNotes = [
    [1.0, 1.25, 1.5],     // Major chord (Root, 3rd, 5th)
    [1.0, 1.2, 1.5],      // Minor chord (Root, minor 3rd, 5th)
    [1.0, 1.333, 1.5],    // Sus4 chord
    [1.0, 1.2, 1.414],    // Diminished / jazzy chord
  ];
  const activeChords = chordNotes[melodyPattern % chordNotes.length];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Musical bar timing (4 beats per measure at 75-90 bpm)
    const beat = t * 1.3;
    const measure = Math.floor(beat / 4);
    const chordStep = (measure + melodyPattern) % activeChords.length;
    const chordRatio = activeChords[chordStep];

    // Smooth envelope attack / release per measure
    const envelope = Math.sin(Math.PI * (beat % 4) / 4);
    const softEnv = 0.5 + 0.5 * Math.max(0, envelope);

    // Arpeggiated melody line
    const arpeggioStep = Math.floor(beat * 2) % 3;
    const noteRatio = activeChords[arpeggioStep];
    const currentFreq = baseFrequency * chordRatio * noteRatio;

    // Rich harmonic synthesis (Fundamental + 2nd harmonic + sub bass)
    const fundamental = Math.sin(2 * Math.PI * currentFreq * t);
    const overtone = Math.sin(2 * Math.PI * (currentFreq * 2) * t) * 0.25;
    const subBass = Math.sin(2 * Math.PI * (baseFrequency * 0.5) * t) * 0.3;
    const ambientPad = Math.sin(2 * Math.PI * (baseFrequency * 0.75) * t) * 0.15;

    // Combined stereo audio signal
    const leftVal = (fundamental * 0.35 + overtone + subBass + ambientPad) * softEnv;
    const rightVal = (fundamental * 0.35 + overtone * 1.1 + subBass + ambientPad * 0.9) * softEnv;

    const sampleL = Math.max(-32768, Math.min(32767, Math.floor(leftVal * 28000)));
    const sampleR = Math.max(-32768, Math.min(32767, Math.floor(rightVal * 28000)));

    buffer.writeInt16LE(sampleL, offset);
    offset += 2;
    buffer.writeInt16LE(sampleR, offset);
    offset += 2;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function runSeed() {
  console.log('🌱 Menjalankan seeding data lengkap Spotify Lite...');

  const audioDir = path.join(ENV.STORAGE_PATH, 'audio');
  const coverDir = path.join(ENV.STORAGE_PATH, 'covers');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

  // 1. Data Artis Lengkap (Artis Populer Nyata & Artis Studio)
  const artistData = [
    {
      id: 'a0100000-0000-0000-0000-000000000001',
      name: 'Bernadya',
      bio: 'Penyanyi dan penulis lagu Indonesia peraih rekor streaming dengan lirik puitis menyentuh hati.',
      image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0200000-0000-0000-0000-000000000002',
      name: 'Sheila On 7',
      bio: 'Band pop rock legendaris Indonesia asal Yogyakarta dengan karya abadi sepanjang masa.',
      image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0300000-0000-0000-0000-000000000003',
      name: 'Tulus',
      bio: 'Solois pria legendaris Indonesia dengan vokal hangat dan aransemen megah memikat.',
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0400000-0000-0000-0000-000000000004',
      name: 'Hindia',
      bio: 'Musisi indie visioner Indonesia dengan lirik reflektif tentang kehidupan urban modern.',
      image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0500000-0000-0000-0000-000000000005',
      name: 'Coldplay',
      bio: 'Band rock legendaris asal Inggris pelopor musik stadium anthem yang mendunia.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0600000-0000-0000-0000-000000000006',
      name: 'Lady Gaga & Bruno Mars',
      bio: 'Kolaborasi duet spektakuler dua megabintang pop global dunia.',
      image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a1000000-0000-0000-0000-000000000001',
      name: 'Nusantara Chill Studio',
      bio: 'Produser musik lo-fi dan ambient santai bernuansa tropis Nusantara.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a2000000-0000-0000-0000-000000000002',
      name: 'Senja Akustik',
      bio: 'Duo gitaris akustik yang berfokus pada instrumental fokus kerja dan belajar.',
      image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a3000000-0000-0000-0000-000000000003',
      name: 'Electra Beats',
      bio: 'Eksplorasi synthwave retro dan electronic ambient hemat energi.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a4000000-0000-0000-0000-000000000004',
      name: 'Kunto Nada',
      bio: 'Solois indie pop dengan petikan gitar hangat dan lirik menyentuh rasa.',
      image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a5000000-0000-0000-0000-000000000005',
      name: 'Nada Sore',
      bio: 'Grup musik neo-klasikal dan piano instrumental untuk relaksasi mendalam.',
      image_url: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a6000000-0000-0000-0000-000000000006',
      name: 'Ombak Pantai Band',
      bio: 'Alunan tropical indie pop santai bernuansa liburan musim panas.',
      image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0700000-0000-0000-0000-000000000007',
      name: 'One Direction',
      bio: 'Boyband pop Inggris-Irlandia sensasional pencetak rekor global.',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'a0800000-0000-0000-0000-000000000008',
      name: 'Queen',
      bio: 'Band rock legendaris asal Inggris yang dipimpin Freddie Mercury.',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // 2. Data Album Lengkap
  const albumData = [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      artist_id: artistData[0].id,
      title: 'Hujan Sore di Kota',
      cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
      release_year: 2025,
    },
    {
      id: 'b2000000-0000-0000-0000-000000000002',
      artist_id: artistData[1].id,
      title: 'Kopi & Secarik Cerita',
      cover_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
      release_year: 2024,
    },
    {
      id: 'b3000000-0000-0000-0000-000000000003',
      artist_id: artistData[2].id,
      title: 'Neon Horizon',
      cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      release_year: 2025,
    },
    {
      id: 'b4000000-0000-0000-0000-000000000004',
      artist_id: artistData[3].id,
      title: 'Cerita Hari Ini',
      cover_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
      release_year: 2025,
    },
    {
      id: 'b5000000-0000-0000-0000-000000000005',
      artist_id: artistData[4].id,
      title: 'Melodi Hening',
      cover_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=80',
      release_year: 2024,
    },
    {
      id: 'b6000000-0000-0000-0000-000000000006',
      artist_id: 'a0700000-0000-0000-0000-000000000007',
      title: 'FOUR',
      cover_url: 'https://i.ytimg.com/vi/VRpzJabYlQQ/hqdefault.jpg',
      release_year: 2014,
    },
    {
      id: 'b7000000-0000-0000-0000-000000000007',
      artist_id: 'a0800000-0000-0000-0000-000000000008',
      title: 'A Night at the Opera',
      cover_url: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
      release_year: 1975,
    },
  ];

  // 3. Data Koleksi Lagu Lengkap (Lagu Nyata Populer & Koleksi Instrumen Studio)
  const songData = [
    // --- LAGU ASLI POPULER TERBARU ---
    {
      id: 'yt_yjnSX_iUFVo',
      title: 'Satu Bulan',
      artist_id: artistData[0].id,
      album_id: null,
      duration_seconds: 230,
      file_path: 'yt_yjnSX_iUFVo.m4a',
      freq: 440,
      pattern: 0,
      cover_url: 'https://i.ytimg.com/vi/yjnSX_iUFVo/hqdefault.jpg',
      lyrics: '[00:00.00] Sudah satu bulan ku tak mendengar kabarmu.\n[00:15.00] Apa kau baik-baik saja di sana?\n[00:30.00] Walau kita tak lagi bersama.\n[00:50.00] Namun hatiku masih selalu mendoakanmu.\n[01:15.00] Semoga engkau temukan bahagia yang kau cari.',
      play_count: 85200000,
    },
    {
      id: 'yt_dGcGbF4ex5o',
      title: 'Dan...',
      artist_id: artistData[1].id,
      album_id: null,
      duration_seconds: 284,
      file_path: 'yt_dGcGbF4ex5o.m4a',
      freq: 440,
      pattern: 1,
      cover_url: 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg',
      lyrics: '[00:00.00] Dan... bila esok datang kembali.\n[00:25.00] Seperti sedia kala di mana kau bisa bercanda.\n[00:50.00] Dan perlahan kaupun lupakan aku.\n[01:15.00] Bintang jangan terbit dulu... temani aku.',
      play_count: 64100000,
    },
    {
      id: 'yt__N6vSc_mT6I',
      title: 'Hati-Hati di Jalan',
      artist_id: artistData[2].id,
      album_id: null,
      duration_seconds: 242,
      file_path: 'yt__N6vSc_mT6I.m4a',
      freq: 440,
      pattern: 2,
      cover_url: 'https://i.ytimg.com/vi/_N6vSc_mT6I/hqdefault.jpg',
      lyrics: '[00:00.00] Perjalanan membawamu bertemu denganku.\n[00:20.00] Ku kira kita akan bersama selamanya.\n[00:45.00] Namun takdir berkehendak lain.\n[01:10.00] Hati-hati di jalan... kisah kita telah selesai.',
      play_count: 98400000,
    },
    {
      id: 'yt_pjhOjHDX0A8',
      title: 'Rumah Ke Rumah',
      artist_id: artistData[3].id,
      album_id: null,
      duration_seconds: 278,
      file_path: 'yt_pjhOjHDX0A8.m4a',
      freq: 440,
      pattern: 0,
      cover_url: 'https://i.ytimg.com/vi/pjhOjHDX0A8/hqdefault.jpg',
      lyrics: '[00:00.00] Menyesal tak kusampaikan, cinta monyet dahulu.\n[00:25.00] Berpindah dari satu rumah ke rumah lainnya.\n[00:50.00] Mencari tempat berteduh dari badai di kepala.\n[01:15.00] Terima kasih telah menjadi rumah sementara.',
      play_count: 52100000,
    },
    {
      id: 'yt_k4V3Mo61fJM',
      title: 'Fix You',
      artist_id: artistData[4].id,
      album_id: null,
      duration_seconds: 295,
      file_path: 'yt_k4V3Mo61fJM.m4a',
      freq: 440,
      pattern: 3,
      cover_url: 'https://i.ytimg.com/vi/k4V3Mo61fJM/hqdefault.jpg',
      lyrics: '[00:00.00] When you try your best, but you don\'t succeed.\n[00:25.00] When you get what you want, but not what you need.\n[00:55.00] Lights will guide you home.\n[01:20.00] And ignite your bones, and I will try to fix you.',
      play_count: 1420000000,
    },
    {
      id: 'yt_kPa7bsKwL-c',
      title: 'Die With A Smile',
      artist_id: artistData[5].id,
      album_id: null,
      duration_seconds: 252,
      file_path: 'yt_kPa7bsKwL-c.m4a',
      freq: 440,
      pattern: 1,
      cover_url: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg',
      lyrics: '[00:00.00] Ooh, if the world was ending, I\'d wanna be next to you.\n[00:25.00] If the party was over and our time on Earth was through.\n[00:50.00] I\'d wanna hold you just for a while.\n[01:15.00] And die with a smile.',
      play_count: 750000000,
    },
    {
      id: 'yt_VRpzJabYlQQ',
      title: '18',
      artist_id: 'a0700000-0000-0000-0000-000000000007',
      album_id: 'b6000000-0000-0000-0000-000000000006',
      duration_seconds: 248,
      file_path: 'yt_VRpzJabYlQQ.m4a',
      freq: 440,
      pattern: 0,
      cover_url: 'https://i.ytimg.com/vi/VRpzJabYlQQ/hqdefault.jpg',
      lyrics: '[00:00.00] I got a heart and I got a soul.\n[00:07.00] Believe me I will use them both.\n[00:15.00] We made a start, be made it damn far.\n[00:23.00] Our love will never turn to rust.\n[00:30.00] I have loved you since we were 18.\n[00:36.00] Long before we both thought the same thing.\n[00:43.00] To be loved, to be in love.\n[00:50.00] All I can do is say that these arms are made for holding you.',
      play_count: 580000000,
    },
    {
      id: 'yt_fJ9rUzIMcZQ',
      title: 'Bohemian Rhapsody',
      artist_id: 'a0800000-0000-0000-0000-000000000008',
      album_id: 'b7000000-0000-0000-0000-000000000007',
      duration_seconds: 359,
      file_path: 'yt_fJ9rUzIMcZQ.m4a',
      freq: 440,
      pattern: 1,
      cover_url: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
      lyrics: '[00:00.00] Is this the real life? Is this just fantasy?\n[00:15.00] Caught in a landslide, no escape from reality.\n[00:30.00] Open your eyes, look up to the skies and see.\n[00:50.00] Mama, just killed a man, put a gun against his head.\n[01:10.00] Pulled my trigger, now he\'s dead.\n[01:25.00] Mama, life had just begun, but now I\'ve gone and thrown it all away.',
      play_count: 1800000000,
    },
    // --- KOLEKSI MUSIK INSTRUMENTAL & RELAKSASI ---
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      title: 'Hujan Menenangkan (Ambient Rain)',
      artist_id: artistData[6].id,
      album_id: albumData[0].id,
      duration_seconds: 90,
      file_path: 'lofi_ambient_rain.wav',
      freq: 330,
      pattern: 0,
      cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Gemericik rintik hujan di luar jendela.\n[00:15.00] Menyiram rasa lelah setelah seharian berkelana.\n[00:30.00] Ketenangan perlahan menyelimuti sudut kamar.\n[00:45.00] Tarik nafas perlahan, hembuskan damai.\n[01:00.00] Selamat beristirahat dalam dekapan malam.',
      play_count: 8420,
    },
    {
      id: 'c2000000-0000-0000-0000-000000000002',
      title: 'Kopi Hangat di Sudut Kafe',
      artist_id: artistData[6].id,
      album_id: albumData[1].id,
      duration_seconds: 120,
      file_path: 'chill_coffee_vibes.wav',
      freq: 440,
      pattern: 1,
      cover_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Secangkir kopi hangat mengepul pelan.\n[00:18.00] Aroma arabika menyapa pagi yang tenang.\n[00:36.00] Menatap jalanan kota yang mulai menggeliat.\n[00:54.00] Di sudut kafe ini semua mimpi dirajut kembali.\n[01:12.00] Menikmati momen sederhana penuh makna.',
      play_count: 12820,
    },
    {
      id: 'c3000000-0000-0000-0000-000000000003',
      title: 'Fokus Kerja Siang Hari',
      artist_id: artistData[7].id,
      album_id: albumData[1].id,
      duration_seconds: 150,
      file_path: 'focus_acoustic_guitar.wav',
      freq: 523.25,
      pattern: 2,
      cover_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Ritme petikan senar yang teratur dan fokus.\n[00:20.00] Baris demi baris kode dan kata tersusun rapi.\n[00:40.00] Tiada distraksi yang mengganggu konsentrasi.\n[01:05.00] Mengalir bersama ide dan solusi brilian.\n[01:30.00] Terus melangkah hingga tugas selesai sempurna.',
      play_count: 15400,
    },
    {
      id: 'c4000000-0000-0000-0000-000000000004',
      title: 'Lampu Kota Tengah Malam',
      artist_id: artistData[8].id,
      album_id: albumData[2].id,
      duration_seconds: 105,
      file_path: 'midnight_city_lights.wav',
      freq: 392,
      pattern: 3,
      cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Neon kota menyala dalam temaram jalanan.\n[00:15.00] Kendaraan melaju membelah malam yang sunyi.\n[00:30.00] Di balik gedung pencakar langit ada harapan.\n[00:50.00] Melodi synthesizer menemani lamunan panjang.\n[01:05.00] Kota ini tak pernah tidur bagi sang pemimpi.',
      play_count: 9650,
    },
    {
      id: 'c5000000-0000-0000-0000-000000000005',
      title: 'Gelombang Elektronik Tenang',
      artist_id: artistData[8].id,
      album_id: albumData[2].id,
      duration_seconds: 140,
      file_path: 'deep_electronic_flow.wav',
      freq: 261.63,
      pattern: 0,
      cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Getaran frekuensi rendah meresap ke dalam sukma.\n[00:25.00] Gelombang suara futuristik membebaskan penat.\n[00:50.00] Mengambang di atas samudra energi digital.\n[01:15.00] Menemukan keseimbangan antara teknologi dan jiwa.',
      play_count: 7380,
    },
    {
      id: 'c6000000-0000-0000-0000-000000000006',
      title: 'Senja di Kota Kembang',
      artist_id: artistData[7].id,
      album_id: albumData[1].id,
      duration_seconds: 135,
      file_path: 'senja_kota_kembang.wav',
      freq: 349.23,
      pattern: 1,
      cover_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Angin sejuk Dago menyentuh lembut wajah.\n[00:20.00] Langit jingga tembaga perlahan menyapa bukit.\n[00:40.00] Kenangan masa lalu berkelebat seperti film usang.\n[01:00.00] Selalu ada rindu di setiap sudut Bandung.\n[01:20.00] Tempat di mana rasa selalu menemukan pulang.',
      play_count: 11200,
    },
    {
      id: 'c7000000-0000-0000-0000-000000000007',
      title: 'Rintik Kenangan Senja',
      artist_id: artistData[6].id,
      album_id: albumData[0].id,
      duration_seconds: 110,
      file_path: 'rintik_kenangan.wav',
      freq: 293.66,
      pattern: 2,
      cover_url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Rintik demi rintik jatuh di dedaunan.\n[00:18.00] Menghidupkan kembali nostalgia yang tersimpan.\n[00:36.00] Nada melo-fi yang mengayunkan kenangan indah.\n[00:54.00] Hujan tak pernah salah dalam membawa cerita.',
      play_count: 6740,
    },
    {
      id: 'c8000000-0000-0000-0000-000000000008',
      title: 'Langkah Menuju Cita',
      artist_id: artistData[9].id,
      album_id: albumData[3].id,
      duration_seconds: 145,
      file_path: 'langkah_menuju_cita.wav',
      freq: 440,
      pattern: 0,
      cover_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Setiap fajar adalah awal kisah yang baru.\n[00:22.00] Kuayunkan langkah penuh percaya diri.\n[00:44.00] Meski jalan berliku penuh rintangan menghadang.\n[01:06.00] Keyakinan di dada takkan pernah pudar.\n[01:28.00] Cita-cita kan terwujud bersama waktu.',
      play_count: 14120,
    },
    {
      id: 'c9000000-0000-0000-0000-000000000009',
      title: 'Kisah Klasik Teman Lama',
      artist_id: artistData[9].id,
      album_id: albumData[3].id,
      duration_seconds: 160,
      file_path: 'kisah_klasik_teman_lama.wav',
      freq: 392,
      pattern: 1,
      cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Teringat tawa saat kita masih bersama.\n[00:25.00] Berbagi mimpi tanpa beban di pundak.\n[00:50.00] Waktu berlalu cepat memisahkan raga kita.\n[01:15.00] Namun persahabatan sejati tak lekang oleh jarak.\n[01:40.00] Semoga engkau bahagia di mana pun berada.',
      play_count: 18900,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000010',
      title: 'Bintang di Langit Malam',
      artist_id: artistData[10].id,
      album_id: albumData[4].id,
      duration_seconds: 125,
      file_path: 'bintang_langit_malam.wav',
      freq: 523.25,
      pattern: 3,
      cover_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Denting piano mengalun di malam gulita.\n[00:20.00] Menatap milyaran bintang yang berkelip indah.\n[00:40.00] Setiap bintang seperti menyimpan sebuah rahasia semesta.\n[01:00.00] Keheningan yang membawa kedamaian batin terdalam.\n[01:15.00] Tidurlah lelap bersama cahaya galaksi.',
      play_count: 9810,
    },
    {
      id: 'c1100000-0000-0000-0000-000000000011',
      title: 'Pelangi Selepas Badai',
      artist_id: artistData[10].id,
      album_id: albumData[4].id,
      duration_seconds: 115,
      file_path: 'pelangi_selepas_badai.wav',
      freq: 440,
      pattern: 0,
      cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Badai yang kelam kini telah berlalu.\n[00:18.00] Cahaya mentari menembus awan kelabu.\n[00:36.00] Warna-warni pelangi melengkung agung di cakrawala.\n[00:55.00] Tanda harapan baru selalu ada di balik ujian.\n[01:05.00] Sambutlah hari baru dengan senyum tulus.',
      play_count: 8320,
    },
    {
      id: 'c1200000-0000-0000-0000-000000000012',
      title: 'Detak Energi Pagi',
      artist_id: artistData[8].id,
      album_id: albumData[2].id,
      duration_seconds: 130,
      file_path: 'detak_energi_pagi.wav',
      freq: 330,
      pattern: 2,
      cover_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Sambut sinar mentari dengan semangat baru.\n[00:20.00] Dentuman beat memompa energi ke seluruh tubuh.\n[00:40.00] Bergerak aktif menghadapi tantangan dunia.\n[01:00.00] Hari ini adalah panggung untuk berkarya nyata!\n[01:15.00] Tak ada kata mundur untuk mimpi besar!',
      play_count: 10450,
    },
    {
      id: 'c1300000-0000-0000-0000-000000000013',
      title: 'Secangkir Teh Melati',
      artist_id: artistData[7].id,
      album_id: albumData[1].id,
      duration_seconds: 100,
      file_path: 'secangkir_teh_melati.wav',
      freq: 392,
      pattern: 1,
      cover_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Harum melati merebak dari cangkir porselen tua.\n[00:16.00] Duduk di beranda membaca buku kesukaan.\n[00:32.00] Detik jam dinding berdetak pelan tanpa terburu.\n[00:50.00] Ketenangan sejati ada dalam kesederhanaan.\n[01:02.00] Hangatnya melati menenteramkan sanubari.',
      play_count: 5930,
    },
    {
      id: 'c1400000-0000-0000-0000-000000000014',
      title: 'Perjalanan Tanpa Arah',
      artist_id: artistData[6].id,
      album_id: albumData[0].id,
      duration_seconds: 140,
      file_path: 'perjalanan_tanpa_arah.wav',
      freq: 293.66,
      pattern: 0,
      cover_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Menyetir mobil menyusuri pesisir pantai.\n[00:22.00] Kaca jendela terbuka, angin laut membelai rambut.\n[00:45.00] Tanpa tujuan pasti, hanya menikmati perjalanan.\n[01:10.00] Karena terkadang tersesat adalah cara menemukan diri.\n[01:30.00] Hidup adalah petualangan yang layak disyukuri.',
      play_count: 13200,
    },
    {
      id: 'c1500000-0000-0000-0000-000000000015',
      title: 'Hening di Ujung Malam',
      artist_id: artistData[10].id,
      album_id: albumData[4].id,
      duration_seconds: 120,
      file_path: 'hening_ujung_malam.wav',
      freq: 261.63,
      pattern: 3,
      cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Sunyi merayap di kala jarum jam menunjuk angka tiga.\n[00:20.00] Dunia terlelap dalam mimpi-mimpi indah.\n[00:40.00] Hanya ada aku, nada ini, dan hening yang syahdu.\n[01:00.00] Momen terbaik untuk bermeditasi dan bersyukur.',
      play_count: 7200,
    },
    {
      id: 'c1600000-0000-0000-0000-000000000016',
      title: 'Ruang Rindu & Damai',
      artist_id: artistData[11].id,
      album_id: albumData[3].id,
      duration_seconds: 150,
      file_path: 'ruang_rindu_damai.wav',
      freq: 349.23,
      pattern: 1,
      cover_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
      lyrics: '[00:00.00] Ombak berbisik pelan di tepian karang pasir putih.\n[00:25.00] Bayang-bayang rindu terlukis di langit lembayung.\n[00:50.00] Rasa damai ini kupersembahkan untukmu yang jauh.\n[01:15.00] Semoga lagu ini sampai memeluk hatimu.\n[01:35.00] Damailah jiwa dalam lantunan nada kasih.',
      play_count: 16500,
    },
  ];

  // 4. Generate Berkas Audio Sampel untuk Semua Lagu yang belum ada (lewati berkas .m4a YouTube)
  for (const s of songData) {
    if (s.file_path.endsWith('.m4a')) continue;
    const fullP = path.join(audioDir, s.file_path);
    if (!fs.existsSync(fullP)) {
      console.log(`🎶 Menghasilkan berkas audio: ${s.file_path} (${s.title})...`);
      generateSampleWav(fullP, s.duration_seconds, s.freq, s.pattern);
    }
  }

  // 5. Data Pengguna Bawaan (Admin & User)
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', passwordSalt);
  const userPasswordHash = await bcrypt.hash('user123', passwordSalt);

  const usersData = [
    {
      id: 'u1000000-0000-0000-0000-000000000001',
      name: 'Administrator',
      email: 'admin@spotifylite.com',
      password_hash: adminPasswordHash,
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      id: 'u2000000-0000-0000-0000-000000000002',
      name: 'Gani Musisi',
      email: 'user@spotifylite.com',
      password_hash: userPasswordHash,
      role: 'user',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  ];

  // 6. Data Playlist Unggulan Lengkap
  const playlistData = [
    {
      id: 'p1000000-0000-0000-0000-000000000001',
      user_id: usersData[0].id,
      title: 'Pilihan Editor: Musik Fokus & Koding',
      description: 'Koleksi instrumen audio bebas distraksi untuk mendongkrak produktivitas koding dan belajar.',
      cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
      is_public: true,
    },
    {
      id: 'p2000000-0000-0000-0000-000000000002',
      user_id: usersData[0].id,
      title: 'Senja Santai di Teras',
      description: 'Petikan akustik dan lo-fi hangat untuk menemani kopi dan obrolan sore hari.',
      cover_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
      is_public: true,
    },
    {
      id: 'p3000000-0000-0000-0000-000000000003',
      user_id: usersData[0].id,
      title: 'Night Drive: Lampu Kota & Synth',
      description: 'Dentuman synthwave dan ambient elektronik mengiringi perjalanan malam temaram.',
      cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      is_public: true,
    },
  ];

  if (getIsPostgresConnected()) {
    try {
      for (const u of usersData) {
        await pool.query(
          `INSERT INTO users (id, name, email, password_hash, role, avatar_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING`,
          [u.id, u.name, u.email, u.password_hash, u.role, u.avatar_url]
        );
      }
      for (const a of artistData) {
        await pool.query(
          `INSERT INTO artists (id, name, bio, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.name, a.bio, a.image_url]
        );
      }
      for (const alb of albumData) {
        await pool.query(
          `INSERT INTO albums (id, artist_id, title, cover_url, release_year)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [alb.id, alb.artist_id, alb.title, alb.cover_url, alb.release_year]
        );
      }
      for (const s of songData) {
        const fullAudioPath = path.join(audioDir, s.file_path);
        const stats = fs.existsSync(fullAudioPath) ? fs.statSync(fullAudioPath) : { size: 15000000 };
        await pool.query(
          `INSERT INTO songs (
            id, title, artist_id, album_id, duration_seconds,
            file_path, file_size, mime_type, bitrate, cover_url, lyrics, play_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            lyrics = EXCLUDED.lyrics,
            cover_url = EXCLUDED.cover_url,
            play_count = EXCLUDED.play_count`,
          [s.id, s.title, s.artist_id, s.album_id, s.duration_seconds, s.file_path, stats.size, s.file_path.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav', 1411200, s.cover_url, s.lyrics, s.play_count]
        );
      }
      for (const p of playlistData) {
        await pool.query(
          `INSERT INTO playlists (id, user_id, title, description, cover_url, is_public)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.user_id, p.title, p.description, p.cover_url, p.is_public]
        );
      }
      console.log('✅ Seeding database PostgreSQL selesai dengan sukses!');
    } catch (e: any) {
      console.warn('Catatan seeding SQL:', e.message);
    }
  }

  // Isi ke InMemoryStore sebagai jaminan kelancaran aplikasi (fallback otomatis)
  inMemoryStore.users.clear();
  inMemoryStore.artists.clear();
  inMemoryStore.albums.clear();
  inMemoryStore.songs.clear();
  inMemoryStore.playlists.clear();

  usersData.forEach(u => inMemoryStore.users.set(u.id, u));
  artistData.forEach(a => inMemoryStore.artists.set(a.id, a));
  albumData.forEach(alb => inMemoryStore.albums.set(alb.id, alb));

  songData.forEach(s => {
    const fullAudioPath = path.join(audioDir, s.file_path);
    const stats = fs.existsSync(fullAudioPath) ? fs.statSync(fullAudioPath) : { size: 15000000 };
    inMemoryStore.songs.set(s.id, {
      id: s.id,
      title: s.title,
      artist_id: s.artist_id,
      album_id: s.album_id,
      duration_seconds: s.duration_seconds,
      file_path: s.file_path,
      file_size: stats.size,
      mime_type: s.file_path.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav',
      bitrate: 1411200,
      cover_url: s.cover_url,
      lyrics: s.lyrics,
      play_count: s.play_count,
      is_public: true,
      created_at: new Date().toISOString(),
    });
  });

  playlistData.forEach(p => inMemoryStore.playlists.set(p.id, p));

  inMemoryStore.playlist_songs = [
    { id: uuidv4(), playlist_id: playlistData[0].id, song_id: songData[0].id, order_index: 0 },
    { id: uuidv4(), playlist_id: playlistData[0].id, song_id: songData[1].id, order_index: 1 },
    { id: uuidv4(), playlist_id: playlistData[0].id, song_id: songData[2].id, order_index: 2 },
    { id: uuidv4(), playlist_id: playlistData[0].id, song_id: songData[3].id, order_index: 3 },
    { id: uuidv4(), playlist_id: playlistData[1].id, song_id: songData[1].id, order_index: 0 },
    { id: uuidv4(), playlist_id: playlistData[1].id, song_id: songData[5].id, order_index: 1 },
    { id: uuidv4(), playlist_id: playlistData[1].id, song_id: songData[6].id, order_index: 2 },
    { id: uuidv4(), playlist_id: playlistData[2].id, song_id: songData[3].id, order_index: 0 },
    { id: uuidv4(), playlist_id: playlistData[2].id, song_id: songData[4].id, order_index: 1 },
    { id: uuidv4(), playlist_id: playlistData[2].id, song_id: songData[11].id, order_index: 2 },
  ];

  console.log(`✅ Data lagu, artis, dan album awal berhasil dimuat (Total ${songData.length} lagu lengkap siap streaming!).`);
}

if (require.main === module) {
  (async () => {
    await checkDatabaseConnection();
    await runSeed();
    process.exit(0);
  })().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}


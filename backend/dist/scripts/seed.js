"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
/**
 * Membuat berkas WAV valid berisi nada melodi yang nyaman untuk pengujian audio
 */
function generateSampleWav(filePath, durationSeconds = 60, baseFrequency = 440) {
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
    // Generate nada melodi lo-fi santai (gelombang sinusoidal dengan envelope lembut)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Harmoni santai: kombinasi frekuensi pokok dan nada ketiga/kelima
        const melodyFreq = baseFrequency * (1 + 0.25 * Math.sin(2 * Math.PI * 0.1 * t));
        const sampleVal = Math.sin(2 * Math.PI * melodyFreq * t) * 0.4 +
            Math.sin(2 * Math.PI * (melodyFreq * 1.5) * t) * 0.2;
        const sample16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
        // Channel Kiri
        buffer.writeInt16LE(sample16, offset);
        offset += 2;
        // Channel Kanan
        buffer.writeInt16LE(sample16, offset);
        offset += 2;
    }
    const dir = path_1.default.dirname(filePath);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(filePath, buffer);
    return filePath;
}
async function runSeed() {
    console.log('🌱 Menjalankan seeding data awal Spotify Lite...');
    const audioDir = path_1.default.join(env_1.ENV.STORAGE_PATH, 'audio');
    const coverDir = path_1.default.join(env_1.ENV.STORAGE_PATH, 'covers');
    if (!fs_1.default.existsSync(audioDir))
        fs_1.default.mkdirSync(audioDir, { recursive: true });
    if (!fs_1.default.existsSync(coverDir))
        fs_1.default.mkdirSync(coverDir, { recursive: true });
    // 1. Buat Berkas Audio Sampel
    const songFiles = [
        { filename: 'lofi_ambient_rain.wav', duration: 90, freq: 330 },
        { filename: 'chill_coffee_vibes.wav', duration: 120, freq: 440 },
        { filename: 'focus_acoustic_guitar.wav', duration: 150, freq: 523.25 },
        { filename: 'midnight_city_lights.wav', duration: 105, freq: 392 },
        { filename: 'deep_electronic_flow.wav', duration: 140, freq: 261.63 },
    ];
    for (const s of songFiles) {
        const fullP = path_1.default.join(audioDir, s.filename);
        if (!fs_1.default.existsSync(fullP)) {
            generateSampleWav(fullP, s.duration, s.freq);
        }
    }
    // 2. Data Artis
    const artistData = [
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
    ];
    // 3. Data Album
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
    ];
    // 4. Data Lagu
    const songData = [
        {
            id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Hujan Menenangkan (Ambient Rain)',
            artist_id: artistData[0].id,
            album_id: albumData[0].id,
            duration_seconds: 90,
            file_path: 'lofi_ambient_rain.wav',
            file_size: 15876044,
            mime_type: 'audio/wav',
            bitrate: 1411200,
            cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
            lyrics: '[00:00.00] Instrumentalia Musik Pengantar Tidur dan Relaksasi.\n[00:15.00] Nikmati ketenangan dan rintik suara damai.',
            play_count: 1420,
        },
        {
            id: 'c2000000-0000-0000-0000-000000000002',
            title: 'Kopi Hangat di Sudut Kafe',
            artist_id: artistData[0].id,
            album_id: albumData[0].id,
            duration_seconds: 120,
            file_path: 'chill_coffee_vibes.wav',
            file_size: 21168044,
            mime_type: 'audio/wav',
            bitrate: 1411200,
            cover_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
            lyrics: '[00:00.00] Petikan melodi hangat di saat hujan turun.',
            play_count: 3820,
        },
        {
            id: 'c3000000-0000-0000-0000-000000000003',
            title: 'Fokus Kerja Siang Hari',
            artist_id: artistData[1].id,
            album_id: albumData[1].id,
            duration_seconds: 150,
            file_path: 'focus_acoustic_guitar.wav',
            file_size: 26460044,
            mime_type: 'audio/wav',
            bitrate: 1411200,
            cover_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
            lyrics: '[00:00.00] Ritme yang meningkatkan konsentrasi koding dan membaca.',
            play_count: 5120,
        },
        {
            id: 'c4000000-0000-0000-0000-000000000004',
            title: 'Lampu Kota Tengah Malam',
            artist_id: artistData[2].id,
            album_id: null,
            duration_seconds: 105,
            file_path: 'midnight_city_lights.wav',
            file_size: 18522044,
            mime_type: 'audio/wav',
            bitrate: 1411200,
            cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
            lyrics: '[00:00.00] Mengiringi perjalanan malam yang hening.',
            play_count: 2450,
        },
        {
            id: 'c5000000-0000-0000-0000-000000000005',
            title: 'Gelombang Elektronik Tenang',
            artist_id: artistData[2].id,
            album_id: null,
            duration_seconds: 140,
            file_path: 'deep_electronic_flow.wav',
            file_size: 24696044,
            mime_type: 'audio/wav',
            bitrate: 1411200,
            cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
            lyrics: '[00:00.00] Suasana futuristik minimalis untuk beristirahat.',
            play_count: 1980,
        },
    ];
    // 5. Data Pengguna Bawaan (Admin & User)
    const passwordSalt = await bcryptjs_1.default.genSalt(10);
    const adminPasswordHash = await bcryptjs_1.default.hash('admin123', passwordSalt);
    const userPasswordHash = await bcryptjs_1.default.hash('user123', passwordSalt);
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
    // 6. Data Playlist Unggulan
    const playlistData = [
        {
            id: 'p1000000-0000-0000-0000-000000000001',
            user_id: usersData[0].id,
            title: 'Pilihan Editor: Musik Fokus & Koding',
            description: 'Koleksi instrumen audio bebas distraksi untuk mendongkrak produktivitas.',
            cover_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
            is_public: true,
        },
    ];
    if ((0, database_1.getIsPostgresConnected)()) {
        try {
            // Simpan User
            for (const u of usersData) {
                await database_1.pool.query(`INSERT INTO users (id, name, email, password_hash, role, avatar_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING`, [u.id, u.name, u.email, u.password_hash, u.role, u.avatar_url]);
            }
            // Simpan Artis
            for (const a of artistData) {
                await database_1.pool.query(`INSERT INTO artists (id, name, bio, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`, [a.id, a.name, a.bio, a.image_url]);
            }
            // Simpan Album
            for (const alb of albumData) {
                await database_1.pool.query(`INSERT INTO albums (id, artist_id, title, cover_url, release_year)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`, [alb.id, alb.artist_id, alb.title, alb.cover_url, alb.release_year]);
            }
            // Simpan Lagu
            for (const s of songData) {
                await database_1.pool.query(`INSERT INTO songs (
            id, title, artist_id, album_id, duration_seconds,
            file_path, file_size, mime_type, bitrate, cover_url, lyrics, play_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING`, [s.id, s.title, s.artist_id, s.album_id, s.duration_seconds, s.file_path, s.file_size, s.mime_type, s.bitrate, s.cover_url, s.lyrics, s.play_count]);
            }
            // Simpan Playlist
            for (const p of playlistData) {
                await database_1.pool.query(`INSERT INTO playlists (id, user_id, title, description, cover_url, is_public)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`, [p.id, p.user_id, p.title, p.description, p.cover_url, p.is_public]);
                // Masukkan lagu ke playlist
                await database_1.pool.query(`INSERT INTO playlist_songs (playlist_id, song_id, order_index)
           VALUES ($1, $2, 0), ($1, $3, 1), ($1, $4, 2)
           ON CONFLICT DO NOTHING`, [p.id, songData[0].id, songData[1].id, songData[2].id]);
            }
            console.log('✅ Seeding database PostgreSQL selesai dengan sukses!');
        }
        catch (e) {
            console.warn('Catatan seeding SQL:', e.message);
        }
    }
    // Isi juga ke InMemoryStore sebagai jaminan kelancaran
    usersData.forEach(u => database_1.inMemoryStore.users.set(u.id, u));
    artistData.forEach(a => database_1.inMemoryStore.artists.set(a.id, a));
    albumData.forEach(alb => database_1.inMemoryStore.albums.set(alb.id, alb));
    songData.forEach(s => database_1.inMemoryStore.songs.set(s.id, s));
    playlistData.forEach(p => database_1.inMemoryStore.playlists.set(p.id, p));
    database_1.inMemoryStore.playlist_songs = [
        { id: (0, uuid_1.v4)(), playlist_id: playlistData[0].id, song_id: songData[0].id, order_index: 0 },
        { id: (0, uuid_1.v4)(), playlist_id: playlistData[0].id, song_id: songData[1].id, order_index: 1 },
        { id: (0, uuid_1.v4)(), playlist_id: playlistData[0].id, song_id: songData[2].id, order_index: 2 },
    ];
    console.log(`✅ Data lagu, artis, dan album awal berhasil dimuat (Total ${songData.length} lagu siap streaming).`);
}

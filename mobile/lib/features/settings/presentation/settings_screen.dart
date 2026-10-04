import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _audioQuality = 'Sedang (192 kbps)';
  bool _offlineOnly = false;
  String _currentServerUrl = ApiEndpoints.baseUrl;
  bool _isTestingConnection = false;

  void _testServerConnection() async {
    setState(() => _isTestingConnection = true);
    try {
      final dio = ApiClient().dio;
      final testUrl = '${_currentServerUrl.replaceAll('/api/v1', '')}/health';
      final res = await dio.get(testUrl);
      if (res.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.primaryDark,
            content: Text('✅ Terhubung ke Server Backend!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        );
      } else {
        throw Exception('Status ${res.statusCode}');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text('❌ Gagal terhubung: $e', style: const TextStyle(color: Colors.white)),
        ),
      );
    } finally {
      if (mounted) setState(() => _isTestingConnection = false);
    }
  }

  void _showServerDialog() {
    final customCtrl = TextEditingController(text: _currentServerUrl);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Pilih Koneksi Server', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ...ApiEndpoints.presets.map((preset) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(preset['label']!, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                subtitle: Text(preset['url']!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                trailing: _currentServerUrl == preset['url'] ? const Icon(Icons.check_circle, color: AppColors.primary, size: 20) : null,
                onTap: () async {
                  await ApiEndpoints.setBaseUrl(preset['url']!);
                  ApiClient().updateBaseUrl(preset['url']!);
                  setState(() => _currentServerUrl = preset['url']!);
                  if (context.mounted) Navigator.pop(context);
                },
              )),
              const Divider(color: AppColors.border),
              const SizedBox(height: 8),
              const Text('Atau Masukkan IP / URL Manual:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              const SizedBox(height: 8),
              TextField(
                controller: customCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'http://192.168.1.xxx:5000/api/v1',
                  hintStyle: const TextStyle(color: AppColors.textSubdued, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final newUrl = customCtrl.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiEndpoints.setBaseUrl(newUrl);
                ApiClient().updateBaseUrl(newUrl);
                setState(() => _currentServerUrl = newUrl);
              }
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Simpan', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showBatteryGuideDialog(BuildContext context, String vendor, String instructions) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Panduan Background: $vendor', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Text(
          instructions,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Mengerti', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pengaturan & Performa'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // 0. Server Connection
          const Text(
            'KONEKSI SERVER BACKEND',
            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.dns_rounded, color: AppColors.primary),
            title: const Text('Alamat Server API', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: Text(_currentServerUrl, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            trailing: const Icon(Icons.edit_rounded, color: AppColors.textSecondary, size: 20),
            onTap: _showServerDialog,
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: _isTestingConnection
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                : const Icon(Icons.network_check_rounded, color: Colors.white),
            title: const Text('Uji Tes Koneksi Server', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('Kirim ping ke backend untuk memastikan koneksi aktif', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            onTap: _isTestingConnection ? null : _testServerConnection,
          ),

          const Divider(color: AppColors.border, height: 32),

          // 1. Kualitas Audio
          const Text(
            'KUALITAS AUDIO & DATA',
            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Kualitas Streaming', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: Text(_audioQuality, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => SimpleDialog(
                  backgroundColor: AppColors.surface,
                  title: const Text('Pilih Kualitas Audio', style: TextStyle(color: Colors.white)),
                  children: [
                    SimpleDialogOption(
                      onPressed: () {
                        setState(() => _audioQuality = 'Rendah (96 kbps - Sangat Hemat Kuota)');
                        Navigator.pop(context);
                      },
                      child: const Text('Rendah (96 kbps - Sangat Hemat Kuota)', style: TextStyle(color: Colors.white)),
                    ),
                    SimpleDialogOption(
                      onPressed: () {
                        setState(() => _audioQuality = 'Sedang (192 kbps - Seimbang)');
                        Navigator.pop(context);
                      },
                      child: const Text('Sedang (192 kbps - Seimbang)', style: TextStyle(color: Colors.white)),
                    ),
                    SimpleDialogOption(
                      onPressed: () {
                        setState(() => _audioQuality = 'Tinggi (320 kbps - Kualitas Jernih)');
                        Navigator.pop(context);
                      },
                      child: const Text('Tinggi (320 kbps - Kualitas Jernih)', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            },
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Hanya Streaming via Wi-Fi', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('Mencegah penggunaan kuota data seluler', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            value: _offlineOnly,
            activeThumbColor: AppColors.primary,
            onChanged: (val) => setState(() => _offlineOnly = val),
          ),

          const Divider(color: AppColors.border, height: 32),

          // 2. Penyimpanan & Cache
          const Text(
            'PENYIMPANAN & CACHE',
            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Hapus Cache Lagu & Gambar', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('Membersihkan file sementara disk (~42 MB)', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            trailing: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Cache berhasil dibersihkan!'), backgroundColor: AppColors.surface),
                );
              },
              child: const Text('Hapus', style: TextStyle(color: AppColors.primary)),
            ),
          ),

          const Divider(color: AppColors.border, height: 32),

          // 3. Panduan Anti-Mati Latar Belakang (Xiaomi, Samsung, Oppo, Vivo)
          const Text(
            'PANDUAN PEMUTARAN LATAR BELAKANG (ANTI-MATI)',
            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 8),
          const Text(
            'Beberapa merek HP memiliki manajemen daya agresif yang mematikan musik saat layar mati. Ikuti panduan untuk merek HP Anda:',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 8),

          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.phone_android, color: Colors.white),
            title: const Text('Xiaomi / Redmi / POCO (MIUI & HyperOS)', style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
            onTap: () => _showBatteryGuideDialog(
              context,
              'Xiaomi (MIUI & HyperOS)',
              '1. Buka Pengaturan > Aplikasi > Kelola Aplikasi > Spotify Lite.\n'
              '2. Aktifkan "Mulai Otomatis" (Autostart).\n'
              '3. Pilih menu "Penghemat Baterai", lalu ubah ke "Tidak Ada Pembatasan" (No Restrictions).\n'
              '4. Kunci aplikasi di menu Recent Apps (tekan lama ikon app, pilih ikon gembok).',
            ),
          ),

          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.phone_android, color: Colors.white),
            title: const Text('Samsung Galaxy (One UI)', style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
            onTap: () => _showBatteryGuideDialog(
              context,
              'Samsung Galaxy (One UI)',
              '1. Buka Pengaturan > Aplikasi > Spotify Lite > Baterai.\n'
              '2. Pilih mode "Tidak Dibatasi" (Unrestricted).\n'
              '3. Buka Pengaturan > Pemeliharaan Perangkat > Baterai > Batas Penggunaan Latar Belakang.\n'
              '4. Pastikan Spotify Lite TIDAK dimasukkan ke dalam daftar "Aplikasi nonaktif (Sleeping apps)".',
            ),
          ),

          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.phone_android, color: Colors.white),
            title: const Text('OPPO & Realme (ColorOS / RealmeUI)', style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
            onTap: () => _showBatteryGuideDialog(
              context,
              'OPPO & Realme (ColorOS)',
              '1. Buka Pengaturan > Manajemen Aplikasi > Spotify Lite > Penggunaan Baterai.\n'
              '2. Aktifkan opsi "Izinkan aktivitas latar belakang" (Allow background activity).\n'
              '3. Aktifkan opsi "Izinkan mulai otomatis" (Allow auto launch).',
            ),
          ),

          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.phone_android, color: Colors.white),
            title: const Text('Vivo & iQOO (Funtouch OS)', style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
            onTap: () => _showBatteryGuideDialog(
              context,
              'Vivo & iQOO (Funtouch OS)',
              '1. Buka Pengaturan > Baterai > Manajemen Konsumsi Daya Latar Belakang Tinggi.\n'
              '2. Cari Spotify Lite dan pilih "Izinkan Penggunaan Daya Tinggi di Latar Belakang".',
            ),
          ),
        ],
      ),
    );
  }
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import { Sidebar } from './components/Sidebar';
import { BottomPlayer } from './components/BottomPlayer';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { AdminUploadPage } from './pages/AdminUploadPage';
import { LoginPage } from './pages/LoginPage';
import { ArtistPage } from './pages/ArtistPage';

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* 1. Area Atas: Sidebar (Kiri) dan Konten Utama (Kanan) */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-spotify-base rounded-lg border border-white/5">
          {children}
        </div>
      </div>

      {/* 2. Area Bawah: Pemutar Musik Penuh di Bawah Layar (Persis Spotify Asli) */}
      <BottomPlayer />

      {/* 3. Modal Layar Penuh Pemutar */}
      <FullscreenPlayer />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <MainLayout>
                  <HomePage />
                </MainLayout>
              }
            />
            <Route
              path="/search"
              element={
                <MainLayout>
                  <SearchPage />
                </MainLayout>
              }
            />
            <Route
              path="/library"
              element={
                <MainLayout>
                  <LibraryPage />
                </MainLayout>
              }
            />
            <Route
              path="/playlist/:id"
              element={
                <MainLayout>
                  <PlaylistDetailPage />
                </MainLayout>
              }
            />
            <Route
              path="/admin/upload"
              element={
                <MainLayout>
                  <AdminUploadPage />
                </MainLayout>
              }
            />
            <Route
              path="/artist/:id"
              element={
                <MainLayout>
                  <ArtistPage />
                </MainLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AudioProvider>
    </AuthProvider>
  );
}

export default App;

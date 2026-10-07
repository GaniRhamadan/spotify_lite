import React, { createContext, useContext, useState } from 'react';
import { getApkDownloadUrl } from '../services/api';

interface DownloadContextType {
  isModalOpen: boolean;
  openDownloadModal: () => void;
  closeDownloadModal: () => void;
  downloadUrl: string;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const downloadUrl = getApkDownloadUrl();

  const openDownloadModal = () => setIsModalOpen(true);
  const closeDownloadModal = () => setIsModalOpen(false);

  return (
    <DownloadContext.Provider
      value={{
        isModalOpen,
        openDownloadModal,
        closeDownloadModal,
        downloadUrl,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = (): DownloadContextType => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};

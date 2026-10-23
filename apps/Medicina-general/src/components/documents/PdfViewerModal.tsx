import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

export interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
  title?: string;
}

/**
 * Detecta si el archivo es una imagen según su nombre o MIME type en Base64
 */
export const isImageFile = (url: string, filename: string = ''): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const lowerName = filename.toLowerCase();

  if (
    lowerUrl.startsWith('data:image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.svg')
  ) {
    return true;
  }
  return false;
};

/**
 * Convierte un Data URL o Base64 a un Blob URL seguro nativo.
 */
export const getSafePdfUrl = (url: string, filename: string = 'documento.pdf'): string => {
  if (!url) return '';

  // Si ya es un blob o URL http(s), devolver directamente
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Si es un data URL o base64
  if (url.startsWith('data:') || /^[A-Za-z0-9+/=]+$/.test(url.slice(0, 100))) {
    try {
      let mimeType = 'application/pdf';
      let base64Data = url;

      if (url.startsWith('data:')) {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
        base64Data = parts[1] || '';
      } else if (isImageFile(url, filename)) {
        mimeType = 'image/jpeg';
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Error al generar Blob URL desde base64:', e);
      return url;
    }
  }

  return url;
};

/**
 * Descarga confiable de cualquier archivo (Base64, Blob o URL remota).
 */
export const downloadPdfFile = async (url: string, filename: string = 'documento.pdf') => {
  if (!url) return;

  try {
    let downloadUrl = url;
    let shouldRevoke = false;

    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const binaryString = atob(parts[1] || '');
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          downloadUrl = URL.createObjectURL(blob);
          shouldRevoke = true;
        }
      } catch {
        // En caso de CORS estricto, fallback directo al link
        downloadUrl = url;
      }
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename.toLowerCase().endsWith('.pdf') || filename.includes('.')
      ? filename
      : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    }
  } catch (err) {
    console.error('Error al descargar archivo:', err);
    window.open(url, '_blank');
  }
};

/**
 * Abre el archivo de forma segura en una nueva pestaña
 */
export const openPdfInTab = (url: string, filename: string = 'documento.pdf') => {
  if (!url) return;

  if (url.startsWith('data:')) {
    const safeBlobUrl = getSafePdfUrl(url, filename);
    window.open(safeBlobUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName = 'documento.pdf',
  title = 'Visualizador de Documento',
}) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [hasError, setHasError] = useState(false);
  const createdBlobRef = useRef<string | null>(null);

  const isImage = isImageFile(fileUrl || '', fileName);

  useEffect(() => {
    if (isOpen && fileUrl) {
      setHasError(false);
      setZoom(100);

      // Limpiar blob anterior si existía
      if (createdBlobRef.current && createdBlobRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(createdBlobRef.current);
        createdBlobRef.current = null;
      }

      const safe = getSafePdfUrl(fileUrl, fileName);
      if (safe.startsWith('blob:')) {
        createdBlobRef.current = safe;
      }
      setDisplayUrl(safe);
    } else {
      setDisplayUrl(null);
      if (createdBlobRef.current && createdBlobRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(createdBlobRef.current);
        createdBlobRef.current = null;
      }
    }

    return () => {
      // Limpieza al desmontar
      if (createdBlobRef.current && createdBlobRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(createdBlobRef.current);
        createdBlobRef.current = null;
      }
    };
  }, [isOpen, fileUrl, fileName]);

  if (!isOpen || !fileUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{title}</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">{fileName}</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 mr-2 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(40, z - 15))}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-300 font-bold">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 15))}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 ml-1 transition"
                title="Restablecer zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Abrir en Pestaña Nueva */}
            <button
              type="button"
              onClick={() => openPdfInTab(fileUrl, fileName)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nueva Pestaña</span>
            </button>

            {/* Descargar */}
            <button
              type="button"
              onClick={() => downloadPdfFile(fileUrl, fileName)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Descargar documento"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Descargar</span>
            </button>

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 ml-2 transition"
              title="Cerrar visualizador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Visor */}
        <div className="flex-1 bg-slate-100 relative overflow-auto flex items-center justify-center p-3">
          {hasError ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Visualización directa restringida</h4>
              <p className="text-xs text-slate-500">
                El navegador no permitió renderizar el visor incrustado. Puede abrir el archivo en una nueva pestaña o descargarlo directamente.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openPdfInTab(fileUrl, fileName)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs hover:bg-sky-500 flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir en nueva pestaña
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdfFile(fileUrl, fileName)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Descargar
                </button>
              </div>
            </div>
          ) : displayUrl ? (
            isImage ? (
              /* Visor de Imágenes con Zoom */
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={displayUrl}
                  alt={fileName}
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg transition-transform duration-150 bg-white"
                  onError={() => setHasError(true)}
                />
              </div>
            ) : (
              /* Visor de PDF mediante Iframe Directo */
              <div
                className="w-full h-full flex justify-center transition-transform duration-150"
                style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, transformOrigin: 'top center' }}
              >
                <iframe
                  src={displayUrl}
                  className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-md"
                  title={fileName}
                  onError={() => setHasError(true)}
                />
              </div>
            )
          ) : (
            <div className="text-xs text-slate-400 font-medium">Cargando documento...</div>
          )}
        </div>
      </div>
    </div>
  );
};

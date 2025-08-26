import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  RiCloseLine, 
  RiShareLine, 
  RiQrCodeLine,
  RiLinkM,
  RiCheckLine,
  RiFileCopyLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';

interface VideoShareModalProps {
  videoId: number;
  videoTitle: string;
  isInteractive?: boolean;
  onClose: () => void;
}

export default function VideoShareModal({ 
  videoId, 
  videoTitle, 
  isInteractive = false,
  onClose 
}: VideoShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Get the public URL for the video
  const getPublicUrl = () => {
    const baseUrl = window.location.origin;
    return isInteractive 
      ? `${baseUrl}/videos/${videoId}/public-interactive`
      : `${baseUrl}/videos/${videoId}/public`;
  };
  
  const publicUrl = getPublicUrl();
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector('#qr-canvas canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-video-${videoId}.png`;
      link.click();
      toast.success('Código QR descargado');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RiCloseLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RiQrCodeLine className="text-orange-500" />
            Compartir Video
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isInteractive ? 'Video Interactivo' : 'Video'}: {videoTitle}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white p-4 rounded-lg shadow-lg" id="qr-canvas">
            <QRCodeCanvas
              value={publicUrl}
              size={250}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: '/logo.png',
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
            {isInteractive 
              ? 'Los estudiantes pueden escanear este código para ver el video interactivo'
              : 'Los estudiantes pueden escanear este código para ver el video'}
          </p>
        </div>

        {/* URL Display */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Enlace directo:
          </label>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
            <RiLinkM className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <RiCheckLine /> : <RiFileCopyLine />}
            {copied ? 'Copiado' : 'Copiar enlace'}
          </button>
          
          <button
            onClick={handleDownloadQR}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RiQrCodeLine />
            Descargar QR
          </button>
        </div>

        {/* Instructions */}
        {isInteractive && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
              ℹ️ Video Interactivo
            </p>
            <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
              <li>• El video pausará automáticamente para mostrar preguntas</li>
              <li>• Los estudiantes deben responder para continuar</li>
              <li>• Se registrarán los resultados de cada participante</li>
              <li>• Se solicitará identificación antes de comenzar</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
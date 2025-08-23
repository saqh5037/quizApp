import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import Button from '../common/Button';
import { FiCopy, FiCheck, FiShare2, FiLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface PublicQuizShareProps {
  quizId: number;
  quizTitle: string;
}

export default function PublicQuizShare({ quizId, quizTitle }: PublicQuizShareProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  
  // Get the public URL for the quiz
  const getPublicUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quiz/${quizId}/public`;
  };
  
  const publicUrl = getPublicUrl();
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success(t('publicQuiz.linkCopied'));
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: quizTitle,
          text: `Take the quiz: ${quizTitle}`,
          url: publicUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };
  
  return (
    <div className="bg-background rounded-lg p-6">
      <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
        <FiShare2 />
        {t('publicQuiz.shareLink')}
      </h3>
      
      {/* QR Code */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <QRCodeCanvas
            value={publicUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-sm text-text-secondary mt-2">
          {t('publicQuiz.scanQR')}
        </p>
      </div>
      
      {/* URL Display */}
      <div className="mb-4">
        <p className="text-sm text-text-secondary mb-2">
          {t('publicQuiz.orUseLink')}:
        </p>
        <div className="flex items-center gap-2 bg-surface p-3 rounded-lg">
          <FiLink className="text-text-secondary flex-shrink-0" />
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 bg-transparent text-sm text-text-primary outline-none"
            onClick={(e) => e.currentTarget.select()}
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          leftIcon={copied ? <FiCheck /> : <FiCopy />}
          onClick={handleCopyLink}
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
        
        {navigator.share && (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={<FiShare2 />}
            onClick={handleShare}
          >
            {t('common.share')}
          </Button>
        )}
      </div>
    </div>
  );
}
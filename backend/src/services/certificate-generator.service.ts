/**
 * certificate-generator.service.ts — Generates AristoTest training certificates as PDF.
 *
 * Layout: A4 landscape, decorative side band, "CERTIFICADO DE RECONOCIMIENTO" title,
 * trainee name in script font, training description body, issued date in Spanish,
 * two signature blocks (one with embedded signature image, one text-only),
 * and a verification code footer.
 *
 * Assets are loaded from backend/storage/certificates/. Missing assets degrade
 * gracefully — the certificate still generates without them.
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const ASSETS_DIR = path.resolve(__dirname, '../../storage/certificates');

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatSpanishDate = (date: Date): string =>
  `${SPANISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export interface CertificateData {
  traineeName: string;
  trainingTitle: string;
  issuedDate: Date;
  verificationCode: string;
  primarySignatory: {
    name: string;       // e.g. "QSP. Merced de la Graziña"
    role: string;       // e.g. "Gerente de Operaciones"
    signatureFile?: string; // filename inside ASSETS_DIR, e.g. "firma-samuel.png"
  };
  secondarySignatory?: {
    name: string;       // e.g. "Ing. Carlos Ángel Rendón"
    role: string;       // e.g. "Capacitador"
    signatureFile?: string;
  };
  logoFile?: string; // filename inside ASSETS_DIR, e.g. "logo-labsis.png"
}

const tryLoadAsset = (filename?: string): string | null => {
  if (!filename) return null;
  const fullPath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    logger.warn(`Certificate asset not found: ${fullPath}`);
    return null;
  }
  return fullPath;
};

export const generateCertificatePDF = (data: CertificateData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      const NAVY = '#1a2332';
      const GOLD = '#c9a961';
      const TEXT_DARK = '#2c2c2c';
      const TEXT_GRAY = '#666666';

      doc.rect(0, 0, W, H).fill('#fafafa');

      const bandWidth = 180;
      doc.polygon(
        [0, 0],
        [bandWidth, 0],
        [bandWidth - 60, H / 2],
        [bandWidth, H],
        [0, H]
      ).fill(NAVY);

      const sealCx = bandWidth / 2 - 30;
      const sealCy = 180;
      doc.circle(sealCx, sealCy, 55).fill(GOLD);
      doc.circle(sealCx, sealCy, 42).fillAndStroke(NAVY, GOLD);
      doc.circle(sealCx, sealCy, 32).fillAndStroke(GOLD, NAVY);
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const x1 = sealCx + Math.cos(angle) * 55;
        const y1 = sealCy + Math.sin(angle) * 55;
        const x2 = sealCx + Math.cos(angle) * 65;
        const y2 = sealCy + Math.sin(angle) * 65;
        doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1.2).stroke(GOLD);
      }

      const contentX = bandWidth + 40;
      const contentW = W - contentX - 50;

      const logoPath = tryLoadAsset(data.logoFile);
      if (logoPath) {
        try {
          doc.image(logoPath, contentX, 50, { fit: [120, 50] });
        } catch (e) {
          logger.warn('Failed to embed logo', { error: e });
        }
      }

      doc.font('Helvetica-Bold')
        .fontSize(36)
        .fillColor(TEXT_DARK)
        .text('CERTIFICADO', contentX, 110, { width: contentW, align: 'right' });

      doc.font('Helvetica')
        .fontSize(20)
        .fillColor(TEXT_GRAY)
        .text('DE RECONOCIMIENTO', contentX, 155, { width: contentW, align: 'right' });

      doc.font('Helvetica')
        .fontSize(12)
        .fillColor(TEXT_GRAY)
        .text('OTORGADO A', contentX, 215, { width: contentW, align: 'right' });

      doc.font('Helvetica-BoldOblique')
        .fontSize(34)
        .fillColor(TEXT_DARK)
        .text(data.traineeName, contentX, 240, { width: contentW, align: 'right' });

      doc.moveTo(contentX + contentW / 2, 295)
        .lineTo(contentX + contentW, 295)
        .lineWidth(1)
        .stroke(GOLD);

      doc.font('Helvetica')
        .fontSize(11)
        .fillColor(TEXT_GRAY)
        .text(
          `Por haber realizado el entrenamiento completo en el manejo de la herramienta\n"${data.trainingTitle}"`,
          contentX,
          315,
          { width: contentW, align: 'right', lineGap: 4 }
        );

      doc.font('Helvetica-Oblique')
        .fontSize(12)
        .fillColor(GOLD)
        .text(formatSpanishDate(data.issuedDate), contentX, 365, {
          width: contentW,
          align: 'right',
        });

      const sigY = 440;
      const sigBlockW = (contentW - 40) / 2;

      const drawSignatory = (
        x: number,
        signatory: { name: string; role: string; signatureFile?: string }
      ) => {
        const sigPath = tryLoadAsset(signatory.signatureFile);
        if (sigPath) {
          try {
            doc.image(sigPath, x, sigY - 40, { fit: [sigBlockW, 40], align: 'center' });
          } catch (e) {
            logger.warn('Failed to embed signature', { error: e });
          }
        }
        doc.moveTo(x + 20, sigY)
          .lineTo(x + sigBlockW - 20, sigY)
          .lineWidth(0.8)
          .stroke(TEXT_DARK);
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(TEXT_DARK)
          .text(signatory.name, x, sigY + 8, { width: sigBlockW, align: 'center' });
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(TEXT_GRAY)
          .text(signatory.role, x, sigY + 24, { width: sigBlockW, align: 'center' });
      };

      drawSignatory(contentX, data.primarySignatory);

      if (data.secondarySignatory) {
        drawSignatory(contentX + sigBlockW + 40, data.secondarySignatory);
      }

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#999999')
        .text(
          `Código de verificación: ${data.verificationCode}`,
          contentX,
          H - 40,
          { width: contentW, align: 'right' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

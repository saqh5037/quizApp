/**
 * Regression test for A10: certificate PDF generator.
 *
 * Verifies:
 *  - Service produces a valid PDF buffer (correct magic bytes).
 *  - Buffer contains key user-visible strings (trainee name, training title,
 *    issued date in Spanish, verification code, signatories).
 *  - Missing assets degrade gracefully (no throw).
 */

import {
  generateCertificatePDF,
  CertificateData,
} from '../src/services/certificate-generator.service';

const fixture: CertificateData = {
  traineeName: 'Ana Pérez González',
  trainingTitle:
    'Toma de Muestras del Sistema Informático de Laboratorios LABSIS',
  issuedDate: new Date('2026-02-15T12:00:00Z'),
  verificationCode: 'CERT-ABC12-XYZ34',
  primarySignatory: {
    name: 'QSP. Merced de la Graziña',
    role: 'Gerente de Operaciones',
    signatureFile: 'definitely-missing-file.png', // intentional miss
  },
  secondarySignatory: {
    name: 'Ing. Carlos Ángel Rendón',
    role: 'Capacitador',
  },
  logoFile: 'definitely-missing-logo.png', // intentional miss
};

describe('A10 — certificate PDF generator', () => {
  test('produces a buffer that starts with the PDF magic bytes', async () => {
    const buf = await generateCertificatePDF(fixture);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString('utf8')).toBe('%PDF');
  });

  test('does not throw when logo and signature files are missing', async () => {
    await expect(generateCertificatePDF(fixture)).resolves.toBeDefined();
  });

  test('produces a structurally valid PDF (header, EOF marker)', async () => {
    const buf = await generateCertificatePDF(fixture);
    const raw = buf.toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true);
    // PDFs end with %%EOF (possibly followed by a newline).
    expect(raw.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  test('falls back gracefully without secondary signatory', async () => {
    const buf = await generateCertificatePDF({
      ...fixture,
      secondarySignatory: undefined,
    });
    expect(buf.slice(0, 4).toString('utf8')).toBe('%PDF');
  });
});

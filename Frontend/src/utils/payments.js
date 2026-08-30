import axios from 'axios';

export const EVIDENCE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const EVIDENCE_TYPES = new Set(EVIDENCE_ACCEPT.split(','));

export const formatMoney = (amount, currency = 'MXN', locale = 'es-MX') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export const validateEvidenceFile = (file) => {
  if (!file) return 'Selecciona un archivo de evidencia.';
  if (!EVIDENCE_TYPES.has(file.type)) return 'La evidencia debe ser JPG, PNG, WebP o PDF.';
  if (file.size > MAX_EVIDENCE_BYTES) return 'La evidencia no puede superar 2 MiB.';
  return '';
};

export const getPaymentConfig = async () => {
  const { data } = await axios.get('/api/payments/config');
  return data;
};

// Obtiene evidencia protegida con Axios para conservar el JWT del interceptor.
export const getEvidenceBlob = async (orderId) => {
  const { data } = await axios.get(`/api/payments/orders/${orderId}/evidence`, {
    responseType: 'blob',
  });
  return data;
};

export const openEvidence = async (orderId) => {
  const blob = await getEvidenceBlob(orderId);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = blob.type === 'application/pdf' ? 'evidencia.pdf' : 'evidencia';
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

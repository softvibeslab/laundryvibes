import { useState } from 'react';
import { FileSearch } from 'lucide-react';
import { apiMessageEs } from '../utils/localization';
import { openEvidence } from '../utils/payments';

export default function PaymentEvidenceButton({ orderId, className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const viewEvidence = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await openEvidence(orderId);
    } catch (requestError) {
      setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo abrir la evidencia.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={viewEvidence}
        disabled={loading}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
      >
        <FileSearch className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Abriendo…' : 'Ver evidencia'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

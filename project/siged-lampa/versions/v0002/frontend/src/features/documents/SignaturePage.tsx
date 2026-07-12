import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResource, mutateResource } from '../../api/resources';
import { ErrorState, LoadingState } from '../../components/feedback';
import { DetailSection, PageHeader } from '../../components/domain';
import { StatusBadge } from '../../components/tables';
import type { Signature } from './types';

export function SignaturePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);

  const load = () => {
    if (!documentId) return;
    setLoading(true);
    setError(undefined);
    Promise.all([getResource<Signature[]>('API-SUP-038', { documentId }), getResource<{ signature_profile_id?: number }>('API-004')])
      .then(([response, profile]) => {
        setSignatures((response as unknown as { data: Signature[] }).data || []);
        setProfileId((profile as unknown as { data: { signature_profile_id?: number } }).data.signature_profile_id || null);
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [documentId]);

  const handleSign = async () => {
    if (!documentId || !profileId || signing) return;
    setSigning(true);
    setError(undefined);
    try {
      await mutateResource('API-024', { signature_profile_id: profileId, signature_mode: 'simulated' }, { documentId });
      setSigned(true);
      void load();
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setSigning(false);
    }
  };

  if (error && !signatures.length) return <><PageHeader title="Firma academica simulada" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !signatures.length) return <><PageHeader title="Firma academica simulada" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Firma academica simulada" />
      <StatusBadge value="academic_simulation" />
      <DetailSection title="Informacion de firmas">
        {!signatures.length ? <p>No hay firmas registradas.</p> : (
          <ul>{signatures.map((s) => (
            <li key={s.id}>
              <p><strong>Modo:</strong> <StatusBadge value={s.integration_mode} /></p>
              <p><strong>Firmante:</strong> {s.signer_name || '-'}</p>
              {s.signature_hash && <p><strong>Hash:</strong> {s.signature_hash}</p>}
              {s.signed_at && <p><strong>Firmado el:</strong> {s.signed_at}</p>}
              <p><strong>Estado:</strong> <StatusBadge value={s.status} /></p>
            </li>
          ))}</ul>
        )}
      </DetailSection>
      {signed ? (
        <p role="status">Documento firmado exitosamente.</p>
      ) : (
        <button onClick={() => void handleSign()} disabled={signing || !profileId}>
          {signing ? 'Firmando...' : 'Firmar documento'}
        </button>
      )}
      {error && <ErrorState error={error} />}
      <button onClick={() => navigate(`/intranet/documents/${documentId}`)}>Volver al detalle</button>
    </>
  );
}

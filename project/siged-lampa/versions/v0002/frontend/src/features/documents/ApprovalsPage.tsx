import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getResource, mutateResource } from '../../api/resources';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { DetailSection, PageHeader } from '../../components/domain';
import { DataTable, DateCell, StatusBadge, TableActions } from '../../components/tables';
import type { Document, Approval } from './types';

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected'], { required_error: 'Seleccione aprobar o rechazar' }),
  comment: z.string().max(2000).optional(),
});

type DecisionFormValues = z.infer<typeof decisionSchema>;

export function ApprovalsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [approvalId, setApprovalId] = useState<number | null>(null);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<DecisionFormValues | null>(null);

  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { decision: undefined, comment: '' },
  });

  const load = () => {
    setLoading(true);
    setError(undefined);
    getResource<Document[]>('API-015', { status: 'in_approval', size: '50' })
      .then((response) => setDocuments((response as unknown as { data: { items: Document[] } }).data.items || []))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, []);

  const handleSelect = async (doc: Document) => {
    setSelectedDoc(doc);
    setApprovalId(null);
    form.reset();
    try {
      const response = await getResource<Approval[]>('API-SUP-032', { documentId: String(doc.id) });
      const approval = ((response as unknown as { data: Approval[] }).data || []).find((item) => item.status === 'pending');
      setApprovalId(approval?.id || null);
    } catch (cause) { setError(cause as Error); }
  };

  const submit = form.handleSubmit((values) => {
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirm = async () => {
    if (!selectedDoc || !approvalId || !pendingValues || submitting) return;
    setSubmitting(true);
    setError(undefined);
    setConfirmOpen(false);
    try {
      await mutateResource('API-SUP-019', { decision: pendingValues.decision, decision_note: pendingValues.comment || '' }, { approvalId: String(approvalId) });
      setSelectedDoc(null);
      void load();
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !documents.length) return <><PageHeader title="Flujo de aprobacion" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !documents.length) return <><PageHeader title="Flujo de aprobacion" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Flujo de aprobacion" description="Documentos que requieren una decision formal." />
      {!documents.length ? <EmptyState message="No hay documentos pendientes de aprobacion." /> : (
        <DataTable columns={[{ key: 'title', label: 'Documento' }, { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> }, { key: 'created_by_name', label: 'Solicitante' }, { key: 'created_at', label: 'Fecha', render: (value) => <DateCell value={String(value)} /> }, { key: 'id', label: 'Accion', render: (_value, doc) => <TableActions><button onClick={() => void handleSelect(doc)}>Aprobar / Rechazar</button></TableActions> }]} rows={documents} caption="Documentos pendientes de aprobacion" />
      )}
      {selectedDoc && (
        <DetailSection title={`Decision: ${selectedDoc.title}`}>
          <form onSubmit={submit}><p className="section-copy">Esta decision quedara registrada en el historial del documento.</p>
            <label className="field">
              <input type="radio" value="approved" {...form.register('decision')} /> Aprobar
            </label>
            <label className="field">
              <input type="radio" value="rejected" {...form.register('decision')} /> Rechazar
            </label>
            {form.formState.errors.decision && <span role="alert">{form.formState.errors.decision.message}</span>}
            <label className="field">Comentario<textarea {...form.register('comment')} aria-invalid={Boolean(form.formState.errors.comment)} />{form.formState.errors.comment && <span role="alert">{form.formState.errors.comment.message}</span>}</label>
            {error && <ErrorState error={error} />}
            <button disabled={submitting || !approvalId}>{submitting ? 'Enviando...' : 'Confirmar decision'}</button>
          </form>
        </DetailSection>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar decision"
        onConfirm={() => void handleConfirm()}
        onClose={() => setConfirmOpen(false)}
      >
        <p>Esta seguro de {pendingValues?.decision === 'approved' ? 'aprobar' : 'rechazar'} este documento?</p>
      </ConfirmDialog>
    </>
  );
}

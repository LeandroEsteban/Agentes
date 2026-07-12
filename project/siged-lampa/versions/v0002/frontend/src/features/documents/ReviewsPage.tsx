import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getResource, mutateResource } from '../../api/resources';
import { DataTable, DateCell, TableActions } from '../../components/tables';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { DetailSection, PageHeader } from '../../components/domain';
import { StatusBadge } from '../../components/tables';
import { SelectField } from '../../components/forms';
import type { Document, Review } from './types';

const reviewSchema = z.object({
  decision: z.string().min(1, 'Seleccione una decision'),
  observations: z.string().max(2000).optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export function ReviewsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [, setReviews] = useState<Review[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { decision: '', observations: '' },
  });

  const load = () => {
    setLoading(true);
    setError(undefined);
    getResource<Document[]>('API-015', { status: 'in_revision', size: '50' })
      .then((response) => setDocuments((response as unknown as { data: { items: Document[] } }).data.items || []))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, []);

  const handleSelect = async (doc: Document) => {
    setSelectedDoc(doc);
    setReviewId(null);
    setError(undefined);
    form.reset();
    try {
      const response = await getResource<Review[]>('API-SUP-037', { documentId: String(doc.id) });
      const items = (response as unknown as { data: Review[] }).data || [];
      setReviews(items);
      if (items.length > 0) setReviewId(items[0].id);
    } catch (cause) {
      setError(cause as Error);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (!reviewId || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await mutateResource('API-022', { decision: values.decision, observations: values.observations || '' }, { reviewId: String(reviewId) });
      setSelectedDoc(null);
      setReviewId(null);
      void load();
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setSubmitting(false);
    }
  });

  if (error && !documents.length) return <><PageHeader title="Revision pendiente" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !documents.length) return <><PageHeader title="Revision pendiente" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Revision pendiente" description="Documentos asignados para revisar y responder." />
      {!documents.length ? <EmptyState title="Sin revisiones pendientes" message="No hay documentos pendientes de revision." /> : (
        <DataTable<Document>
          columns={[
            { key: 'title', label: 'Documento' },
            { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
            { key: 'created_at', label: 'Fecha', render: (value) => <DateCell value={String(value)} /> },
            { key: 'id', label: 'Accion', render: (_, row) => <TableActions><button onClick={() => void handleSelect(row)}>Revisar</button></TableActions> },
          ]}
          rows={documents}
        />
      )}
      {selectedDoc && (
        <DetailSection title={`Revisar: ${selectedDoc.title}`}>
          <form onSubmit={submit}><p className="section-copy">Registre una decision y sus observaciones para dejar trazabilidad.</p>
            <SelectField label="Decision" {...form.register('decision')} error={form.formState.errors.decision?.message}>
              <option value="">Seleccione</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="changes_requested">Cambios solicitados</option>
              <option value="changes_required">Cambios requeridos</option>
              <option value="needs_clarification">Necesita aclaracion</option>
            </SelectField>
            <label className="field">Observaciones<textarea {...form.register('observations')} aria-invalid={Boolean(form.formState.errors.observations)} />{form.formState.errors.observations && <span role="alert">{form.formState.errors.observations.message}</span>}</label>
            {error && <ErrorState error={error} />}
            <button disabled={submitting || !reviewId}>{submitting ? 'Enviando...' : 'Enviar revision'}</button>
          </form>
        </DetailSection>
      )}
    </>
  );
}

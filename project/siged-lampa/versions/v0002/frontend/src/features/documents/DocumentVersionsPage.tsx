import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getResource, mutateResource } from '../../api/resources';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { PageHeader } from '../../components/domain';
import type { Version } from './types';
import { formatDate } from '../../utils/presentation';

const schema = z.object({
  summary: z.string().min(1, 'El resumen es requerido').max(500),
  content: z.string().min(1, 'El contenido es requerido'),
});

type FormValues = z.infer<typeof schema>;

export function DocumentVersionsPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { summary: '', content: '' },
  });

  const load = () => {
    if (!documentId) return;
    setLoading(true);
    setError(undefined);
    getResource<Version[]>('API-SUP-007', { documentId })
      .then((response) => setVersions((response as unknown as { data: Version[] }).data || []))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [documentId]);

  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      await mutateResource('API-020', { change_summary: values.summary, content: values.content }, { documentId });
      form.reset();
      void load();
    } catch (cause) {
      setError(cause as Error);
    }
  });

  if (error && !versions.length) return <><PageHeader title="Versiones" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !versions.length) return <><PageHeader title="Versiones" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Versiones del documento" description="Historial de cambios y contenido registrado." />
      {!versions.length ? <EmptyState message="Sin versiones registradas." /> : (
        <ul className="timeline">{versions.map((v) => (
          <li key={v.id}>
            <strong>v{v.version_number}</strong> - {v.summary || (v as Version & { change_summary?: string }).change_summary || ''}
            <br /><span>{v.created_by_name || ''} - {formatDate(v.created_at)}</span>
          </li>
        ))}</ul>
      )}
      <section className="card">
        <h2>Nueva version</h2>
        <form onSubmit={submit}>
          <p className="section-copy">Describa el cambio para facilitar la trazabilidad del documento.</p><label className="field">Resumen<input {...form.register('summary')} aria-invalid={Boolean(form.formState.errors.summary)} />{form.formState.errors.summary && <span role="alert">{form.formState.errors.summary.message}</span>}</label>
          <label className="field">Contenido<textarea {...form.register('content')} aria-invalid={Boolean(form.formState.errors.content)} />{form.formState.errors.content && <span role="alert">{form.formState.errors.content.message}</span>}</label>
          {error && <ErrorState error={error} />}
          <button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creando...' : 'Crear version'}</button>
        </form>
      </section>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getResource, mutateResource } from '../../api/resources';
import { ErrorState, LoadingState } from '../../components/feedback';
import { FormField, SelectField } from '../../components/forms';
import { PageHeader } from '../../components/domain';
import type { DocumentType, Department } from './types';

const schema = z.object({
  title: z.string().min(1, 'El titulo es requerido').max(255),
  document_type_id: z.string().min(1, 'Seleccione un tipo documental'),
  department_id: z.string().min(1, 'Seleccione un departamento'),
  summary: z.string().max(20000).optional(),
  content: z.string().min(1, 'El contenido es requerido').max(2_000_000),
  confidentiality_level: z.string().optional(),
  due_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function DocumentCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<Error>();
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', document_type_id: '', department_id: '', summary: '', content: '', confidentiality_level: '', due_date: '' },
  });

  useEffect(() => {
    Promise.all([
      getResource<DocumentType[]>('API-013'),
      getResource<Department[]>('API-011'),
    ])
      .then(([typesResp, deptResp]) => {
        const types = typesResp as unknown as { data: DocumentType[] };
        const depts = deptResp as unknown as { data: Department[] };
        setDocTypes(types.data || []);
        setDepartments(depts.data || []);
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoadingOptions(false));
  }, []);

  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const body: Record<string, unknown> = { title: values.title, content: values.content, document_type_id: Number(values.document_type_id), department_id: Number(values.department_id) };
      if (values.summary) body.summary = values.summary;
      if (values.confidentiality_level) body.confidentiality_level = values.confidentiality_level;
      if (values.due_date) body.due_date = new Date(`${values.due_date}T00:00:00.000Z`).toISOString();
      const response = await mutateResource<{ id: number }>('API-016', body);
      const document = (response as unknown as { data: { id: number } }).data;
      navigate(`/intranet/documents/${document.id}`);
    } catch (cause) {
      setError(cause as Error);
    }
  });

  if (loadingOptions) return <><PageHeader title="Crear documento" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Crear documento" />
      <form onSubmit={submit}>
        <FormField label="Titulo" {...form.register('title')} error={form.formState.errors.title?.message} />
        <SelectField label="Tipo documental" {...form.register('document_type_id')} error={form.formState.errors.document_type_id?.message}>
          <option value="">Seleccione</option>
          {docTypes.map((dt) => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
        </SelectField>
        <SelectField label="Departamento" {...form.register('department_id')} error={form.formState.errors.department_id?.message}>
          <option value="">Seleccione</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </SelectField>
        <label className="field">Resumen<textarea {...form.register('summary')} aria-invalid={Boolean(form.formState.errors.summary)} />{form.formState.errors.summary && <span role="alert">{form.formState.errors.summary.message}</span>}</label>
        <label className="field">Contenido<textarea {...form.register('content')} aria-invalid={Boolean(form.formState.errors.content)} />{form.formState.errors.content && <span role="alert">{form.formState.errors.content.message}</span>}</label>
        <SelectField label="Nivel de confidencialidad" {...form.register('confidentiality_level')}>
          <option value="">Seleccione</option>
          <option value="public">Publico</option>
          <option value="internal">Interno</option>
          <option value="confidential">Confidencial</option>
          <option value="restricted">Restringido</option>
        </SelectField>
        <FormField label="Fecha de vencimiento" type="date" {...form.register('due_date')} />
        {error && <ErrorState error={error} />}
        <button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creando...' : 'Crear documento'}</button>
      </form>
    </>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { getResource, mutateResource } from '../api/resources';
import type { ExternalEntity } from '../api/types';
import { DataTable, StatusBadge } from '../components/tables';
import { ErrorState, LoadingState } from '../components/feedback';
import { DetailSection, PageHeader, Timeline } from '../components/domain';
import { FormField } from '../components/forms';
import { useForm } from 'react-hook-form';

export { ProfilePage } from '../features/auth/ProfilePage'
export { DashboardPage } from '../features/dashboard/DashboardPage'
export { DocumentsListPage } from '../features/documents/DocumentsListPage'
export { DocumentCreatePage } from '../features/documents/DocumentCreatePage'
export { DocumentDetailPage } from '../features/documents/DocumentDetailPage'
export { DocumentVersionsPage } from '../features/documents/DocumentVersionsPage'
export { ReviewsPage } from '../features/documents/ReviewsPage'
export { ApprovalsPage } from '../features/documents/ApprovalsPage'
export { SignaturePage } from '../features/documents/SignaturePage'

export function ExternalEntitiesPage() { const [data,setData] = useState<ExternalEntity[]>([]); const [error,setError] = useState<Error>(); const form = useForm<Omit<ExternalEntity,'id'>>({defaultValues:{entity_type:'',name:'',status:'active'}}); const load = () => api.externalEntities().then(({data}) => setData(data)).catch(setError); useEffect(() => { void load(); }, []); const submit = form.handleSubmit(async (values) => { setError(undefined); try { await api.createExternalEntity(values); form.reset(); void load(); } catch (cause) { setError(cause as Error); } }); return <><PageHeader title="Entidades externas" description="Catalogo administrado por usuarios autorizados."/><form className="inline-form" onSubmit={submit}><FormField label="Tipo" {...form.register('entity_type',{required:true})}/><FormField label="Nombre" {...form.register('name',{required:true})}/><FormField label="Correo" type="email" {...form.register('email')}/><button disabled={form.formState.isSubmitting}>Agregar entidad</button></form>{error && <ErrorState error={error}/>} {!data.length && !error ? <LoadingState/> : <DataTable columns={[{key:'name',label:'Nombre'},{key:'entity_type',label:'Tipo'},{key:'email',label:'Correo'},{key:'status',label:'Estado',render:(value) => <StatusBadge value={String(value)}/> }]} rows={data}/>}</>; }
export function ResourcePage({ title, operationCode, parameters = {} }: { title: string; operationCode: string; parameters?: Record<string, string | undefined> }) {
  const routeParameters = useParams(); const resolved = { ...routeParameters, ...parameters }; const [data, setData] = useState<unknown>(); const [error, setError] = useState<Error>(); const [loading, setLoading] = useState(operationCode !== ''); const [payload, setPayload] = useState('{}'); const [submitted, setSubmitted] = useState(false);
  const isRead = ['API-004','API-006','API-009','API-011','API-013','API-015','API-017','API-025','API-027','API-029','API-033','API-035','API-039','API-040','API-SUP-001','API-SUP-007','API-SUP-037','API-SUP-038','API-SUP-046'].includes(operationCode);
  const load = () => { if (!isRead) return; setLoading(true); setError(undefined); getResource(operationCode, resolved).then((response) => setData(response.data)).catch((cause) => setError(cause as Error)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [operationCode]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); setSubmitted(false); try { await mutateResource(operationCode, JSON.parse(payload), resolved); setSubmitted(true); } catch (cause) { setError(cause as Error); } };
  return <><PageHeader title={title} description={`Operacion contractual ${operationCode}`}/>{loading && <LoadingState/>}{error && <ErrorState error={error} onRetry={load}/>} {isRead && !loading && !error && (data == null || (Array.isArray(data) && !data.length)) && <p className="state">No hay registros para mostrar.</p>}{isRead && data != null && <DetailSection title="Datos reales"><pre>{JSON.stringify(data, null, 2)}</pre></DetailSection>}{!isRead && <form onSubmit={submit}><label className="field">Datos JSON segun contrato<textarea aria-label="Datos JSON" value={payload} onChange={(event) => setPayload(event.target.value)} /></label><button disabled={submitted}>Enviar accion</button>{submitted && <p role="status">Accion completada.</p>}</form>}</>;
}
export function ScreenPage({ title, mode = 'partial' }: { title: string; mode?: 'partial' | 'planned' }) { return <><PageHeader title={title}/><DetailSection title="Estado de integracion"><p>{mode === 'partial' ? 'La interfaz esta disponible.' : 'Pantalla planificada.'}</p></DetailSection><Timeline items={['Interfaz y navegacion disponibles','Permisos verificados por el backend']}/></>; }
export { ExpedientsListPage } from '../features/expedients/ExpedientsListPage'
export { ExpedientDetailPage } from '../features/expedients/ExpedientDetailPage'
export { CorrespondenceListPage } from '../features/correspondence/CorrespondenceListPage'
export { CorrespondenceCreatePage } from '../features/correspondence/CorrespondenceCreatePage'
export { UsersPage } from '../features/admin/UsersPage'
export { RolesPage } from '../features/admin/RolesPage'
export { DepartmentsPage } from '../features/admin/DepartmentsPage'
export { DocumentTypesPage } from '../features/admin/DocumentTypesPage'
export { ProcedureTypesPage } from '../features/admin/ProcedureTypesPage'
export { ReportsPage } from '../features/reports/ReportsPage'
export { OirsManagementPage } from '../features/oirs/OirsManagementPage'

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { Procedure } from '../api/types';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback';
import { DetailSection, PageHeader } from '../components/domain';
import { DataTable } from '../components/tables';

export function HomePage() {
  return <><PageHeader title="Servicios municipales" description="Acceda a trámites, información pública y canales de atención de la Municipalidad de Lampa." /><section className="public-hero"><div><p className="eyebrow">Atención digital</p><h2>Gestiones claras, cerca de usted.</h2><p>Inicie un trámite, consulte requisitos y realice seguimiento en línea.</p><Link className="button" to="/tramites">Ver tramites disponibles</Link></div><div className="public-hero-links"><Link to="/oirs"><i className="bi bi-chat-square-text" aria-hidden="true" />OIRS</Link><Link to="/login"><i className="bi bi-person-circle" aria-hidden="true" />Ingreso ciudadano</Link></div></section></>;
}

export function ProceduresPage() {
  const [items, setItems] = useState<Procedure[]>([]); const [error, setError] = useState<Error>(); const [search, setSearch] = useState('');
  useEffect(() => { api.procedures().then(({ data }) => setItems(data)).catch(setError); }, []);
  if (error) return <><PageHeader title="Trámites" description="Servicios disponibles para la comunidad." /><ErrorState error={error} /></>;
  if (!items.length) return <><PageHeader title="Trámites" description="Servicios disponibles para la comunidad." /><LoadingState /></>;
  const filtered = items.filter((item) => `${item.title} ${item.department_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader title="Trámites" description="Encuentre los requisitos e instrucciones antes de iniciar su solicitud." /><div className="filters"><label className="sr-only" htmlFor="procedure-search">Buscar trámites</label><input id="procedure-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o departamento" /></div>{!filtered.length ? <EmptyState title="No se encontraron trámites" message="Pruebe con otra búsqueda." /> : <DataTable columns={[{ key: 'title', label: 'Trámite', render: (value, row) => <Link to={`/tramites/${row.id}`}>{String(value)}</Link> }, { key: 'department_name', label: 'Departamento' }]} rows={filtered} caption="Trámites disponibles" />}</>;
}

export function ProcedureDetailPage() {
  const { procedureId = '' } = useParams(); const [item, setItem] = useState<Procedure>(); const [error, setError] = useState<Error>();
  useEffect(() => { api.procedure(procedureId).then(({ data }) => setItem(data)).catch(setError); }, [procedureId]);
  if (error) return <><PageHeader title="Trámite" /><ErrorState error={error} /></>;
  if (!item) return <LoadingState />;
  return <><PageHeader title={item.title} description={item.department_name} /><div className="page-actions"><Link to="/tramites">Volver a trámites</Link><Link className="button" to={`/portal/requests/new/${item.id}`}>Iniciar solicitud</Link></div><DetailSection title="Instrucciones"><p>{item.instructions || 'No se informaron instrucciones.'}</p></DetailSection><DetailSection title="Requisitos"><div dangerouslySetInnerHTML={{ __html: item.requirements_html || 'No se informaron requisitos.' }} /></DetailSection></>;
}

export function PublicContentPage({ title }: { title: string }) {
  const kind = title === 'Noticias' ? 'news' : title === 'Avisos' ? 'notices' : 'calendar'; const [data, setData] = useState<unknown>(); const [error, setError] = useState<Error>();
  useEffect(() => { api.publicContent(kind).then(({ data: response }) => setData(response)).catch(setError); }, [kind]);
  if (error) return <><PageHeader title={title} /><ErrorState error={error} /></>;
  if (!data) return <><PageHeader title={title} /><LoadingState /></>;
  return <><PageHeader title={title} description={title === 'Calendario' ? 'Actividades e hitos municipales.' : 'Información institucional de interés para la comunidad.'} /><DetailSection title={title}><pre className="public-content-json">{JSON.stringify(data, null, 2)}</pre></DetailSection></>;
}

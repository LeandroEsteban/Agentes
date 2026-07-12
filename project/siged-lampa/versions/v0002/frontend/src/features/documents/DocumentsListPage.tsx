import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getResource } from '../../api/resources';
import { DataTable, DateCell, FilterBar, Pagination, SearchInput, StatusBadge, TableActions } from '../../components/tables';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { PageHeader } from '../../components/domain';
import type { ApiEnvelope } from '../../api/types';
import type { Document } from './types';

export function DocumentsListPage() {
  const [data, setData] = useState<Document[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    setError(undefined);
    const params: Record<string, string> = { page: String(page), size: '10' };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    getResource<Document[]>('API-015', params)
      .then((response) => {
        const env = response as unknown as ApiEnvelope<Document[]>;
        setData(env.data || []);
        if (env.pagination) setPages(env.pagination.pages);
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); void load(); };

  if (error) return <><PageHeader title="Bandeja documental" description="Documentos institucionales y su estado de tramitacion." /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !data.length) return <><PageHeader title="Bandeja documental" description="Documentos institucionales y su estado de tramitacion." /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Bandeja documental" description="Documentos institucionales y su estado de tramitacion." />
      <div className="page-actions"><span className="page-summary">{data.length} documento{data.length === 1 ? '' : 's'} en esta pagina</span><Link className="button" to="/intranet/documents/new"><i className="bi bi-plus-lg" aria-hidden="true" />Nuevo documento</Link></div>
      <FilterBar>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending_review">Pendiente revision</option>
          <option value="in_review">En revision</option>
          <option value="pending_approval">Pendiente aprobacion</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="signed">Firmado</option>
          <option value="archived">Archivado</option>
        </select>
        <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>Limpiar filtros</button>
      </FilterBar>
      {!data.length ? (
        <EmptyState title="No hay documentos" message="No se encontraron documentos." action={<Link className="button" to="/intranet/documents/new">Crear documento</Link>} />
      ) : (
        <>
          <DataTable<Document>
            columns={[
              { key: 'title', label: 'Titulo', render: (_, row) => <Link to={`/intranet/documents/${row.id}`}>{row.title}</Link> },
              { key: 'document_type_name', label: 'Tipo' },
              { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
              { key: 'created_at', label: 'Actualizacion', render: (value) => <DateCell value={String(value)} /> },
              { key: 'id', label: 'Acciones', render: (_value, row) => <TableActions><Link className="button" to={`/intranet/documents/${row.id}`}>Ver detalle</Link></TableActions> },
            ]}
            rows={data}
            caption="Documentos disponibles"
          />
          <Pagination page={page} pages={pages} onChange={(p) => setPage(p)} />
        </>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getResource } from '../../api/resources';
import { DataTable, FilterBar, Pagination, SearchInput, StatusBadge } from '../../components/tables';
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

  if (error) return <><PageHeader title="Bandeja documental" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !data.length) return <><PageHeader title="Bandeja documental" /><LoadingState /></>;

  return (
    <>
      <PageHeader title="Bandeja documental" />
      <Link className="button" to="/intranet/documents/new">Nuevo documento</Link>
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
      </FilterBar>
      {!data.length ? (
        <EmptyState message="No se encontraron documentos." />
      ) : (
        <>
          <DataTable<Document>
            columns={[
              { key: 'title', label: 'Titulo', render: (_, row) => <Link to={`/intranet/documents/${row.id}`}>{row.title}</Link> },
              { key: 'document_type_name', label: 'Tipo' },
              { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
              { key: 'created_at', label: 'Creado' },
            ]}
            rows={data}
          />
          <Pagination page={page} pages={pages} onChange={(p) => setPage(p)} />
        </>
      )}
    </>
  );
}

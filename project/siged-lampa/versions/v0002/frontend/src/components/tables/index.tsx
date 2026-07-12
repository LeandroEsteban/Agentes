import { EmptyState } from '../feedback';
export type Column<T> = { key: keyof T; label: string; render?: (value: T[keyof T], row: T) => React.ReactNode };
export function DataTable<T extends { id: number }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) { if (!rows.length) return <EmptyState />; return <div className="table-wrap"><table><thead><tr>{columns.map((column, i) => <th key={i} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column, i) => <td key={i}>{column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '')}</td>)}</tr>)}</tbody></table></div>; }
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) { return <nav aria-label="Paginacion"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><span>{page} de {pages}</span><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</button></nav>; }
export const SearchInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input type="search" aria-label="Buscar" placeholder="Buscar" {...props} />;
export const FilterBar = ({ children }: { children: React.ReactNode }) => <div className="filters">{children}</div>;
export const StatusBadge = ({ value }: { value: string }) => <span className="badge">{value}</span>;

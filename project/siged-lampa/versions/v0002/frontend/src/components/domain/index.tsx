export const PageHeader = ({ title, description }: { title: string; description?: string }) => <header className="page-header"><h1>{title}</h1>{description && <p>{description}</p>}</header>;
export const Breadcrumbs = ({ items }: { items: string[] }) => <nav aria-label="Migas de pan">{items.join(' / ')}</nav>;
export const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="card"><h2>{title}</h2>{children}</section>;
export const MetricCard = ({ label, value }: { label: string; value: string | number }) => <article className="metric"><strong>{value}</strong><span>{label}</span></article>;
export const Timeline = ({ items }: { items: string[] }) => <ol className="timeline">{items.map((item) => <li key={item}>{item}</li>)}</ol>;
export const NotificationList = ({ items }: { items: Array<{ id: number; title: string; message: string; is_read: boolean }> }) => <ul className="notifications">{items.map((item) => <li key={item.id}><strong>{item.title}</strong><p>{item.message}</p>{!item.is_read && <span>Sin leer</span>}</li>)}</ul>;

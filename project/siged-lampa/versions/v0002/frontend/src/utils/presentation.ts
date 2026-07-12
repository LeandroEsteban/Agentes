export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
}

const states: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; icon: string }> = {
  draft: { label: 'Borrador', tone: 'neutral', icon: 'bi-pencil-square' }, pending_review: { label: 'Pendiente de revision', tone: 'warning', icon: 'bi-hourglass-split' }, in_review: { label: 'En revision', tone: 'info', icon: 'bi-eye' }, pending_approval: { label: 'Pendiente de aprobacion', tone: 'warning', icon: 'bi-clock' }, in_approval: { label: 'En aprobacion', tone: 'warning', icon: 'bi-clock' }, approved: { label: 'Aprobado', tone: 'success', icon: 'bi-check-circle' }, rejected: { label: 'Rechazado', tone: 'danger', icon: 'bi-x-circle' }, signed: { label: 'Firmado', tone: 'success', icon: 'bi-patch-check' }, archived: { label: 'Archivado', tone: 'neutral', icon: 'bi-archive' }, active: { label: 'Activo', tone: 'success', icon: 'bi-check-circle' }, inactive: { label: 'Inactivo', tone: 'neutral', icon: 'bi-pause-circle' }, closed: { label: 'Cerrado', tone: 'neutral', icon: 'bi-lock' }, resolved: { label: 'Resuelto', tone: 'success', icon: 'bi-check-circle' }, in_progress: { label: 'En progreso', tone: 'info', icon: 'bi-arrow-repeat' }, incoming: { label: 'Entrada', tone: 'info', icon: 'bi-box-arrow-in-down' }, outgoing: { label: 'Salida', tone: 'success', icon: 'bi-box-arrow-up-right' }, received: { label: 'Recibido', tone: 'success', icon: 'bi-inbox' }, sent: { label: 'Enviado', tone: 'success', icon: 'bi-send' }
};

export function getStatusPresentation(value: string) { return states[value.toLowerCase()] || { label: value.replace(/_/g, ' '), tone: 'neutral' as const, icon: 'bi-info-circle' }; }

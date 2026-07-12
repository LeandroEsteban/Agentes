import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getResource, mutateResource, operationPath } from '../../api/resources';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { DetailSection, PageHeader, Timeline } from '../../components/domain';
import { StatusBadge } from '../../components/tables';
import type { Document, Attachment, Comment, HistoryEvent } from './types';
import { formatDate } from '../../utils/presentation';

export function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [doc, setDoc] = useState<Document>();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!documentId) return;
    setLoading(true);
    setError(undefined);
    Promise.all([
      getResource<Document>('API-017', { documentId }),
      getResource<HistoryEvent[]>('API-SUP-036', { documentId }),
      getResource<Attachment[]>('API-SUP-008', { documentId }),
      getResource<Comment[]>('API-SUP-034', { documentId }),
    ])
      .then(([docResp, histResp, attResp, commResp]) => {
        const detail = (docResp as unknown as { data: { document: Document } }).data;
        setDoc(detail.document);
        setHistory((histResp as unknown as { data: HistoryEvent[] }).data || []);
        setAttachments((attResp as unknown as { data: Attachment[] }).data || []);
        setComments((commResp as unknown as { data: Comment[] }).data || []);
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [documentId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !documentId || uploading) return;
    setUploading(true);
    setError(undefined);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await mutateResource('API-019', { file_name: file.name, mime_type: file.type || 'application/octet-stream', content_base64: base64 }, { documentId });
            resolve();
          } catch (cause) { reject(cause); }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
      });
      if (fileRef.current) fileRef.current.value = '';
      void load();
    } catch (cause) { setError(cause as Error); }
    finally { setUploading(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !documentId || sendingComment) return;
    setSendingComment(true);
    setError(undefined);
    try {
      await mutateResource('API-SUP-035', { content: commentText }, { documentId });
      setCommentText('');
      void load();
    } catch (cause) { setError(cause as Error); }
    finally { setSendingComment(false); }
  };

  if (error && !doc) return <><PageHeader title="Detalle de documento" /><ErrorState error={error} onRetry={load} /></>;
  if (loading && !doc) return <><PageHeader title="Detalle de documento" /><LoadingState /></>;
  if (!doc) return <><PageHeader title="Detalle de documento" /><EmptyState message="Documento no encontrado." /></>;

  return (
    <>
      <PageHeader title={doc.title} description={`Documento #${doc.id}`} />
      <div className="page-actions"><StatusBadge value={doc.status} /><div><Link className="button" to={`/intranet/documents/${documentId}/versions`}>Versiones</Link> <Link className="button" to={`/intranet/documents/${documentId}/signature`}>Firma academica</Link></div></div>
      <DetailSection title="Informacion del documento">
        <dl className="metadata-grid"><div><dt>Descripcion</dt><dd>{doc.description || 'Sin descripcion'}</dd></div><div><dt>Tipo</dt><dd>{doc.document_type_name || '-'}</dd></div><div><dt>Departamento</dt><dd>{doc.department_name || '-'}</dd></div><div><dt>Creado por</dt><dd>{doc.created_by_name || '-'}</dd></div><div><dt>Fecha de creacion</dt><dd>{formatDate(doc.created_at)}</dd></div>{doc.due_date && <div><dt>Vencimiento</dt><dd>{formatDate(doc.due_date)}</dd></div>}{doc.confidentiality_level && <div><dt>Confidencialidad</dt><dd>{doc.confidentiality_level}</dd></div>}</dl>
      </DetailSection>

      <DetailSection title="Historial">
        {!history.length ? <EmptyState message="Sin eventos registrados." /> : <Timeline items={history.map((h) => `${h.action || (h as HistoryEvent & { event_name?: string }).event_name || ''} - ${h.actor_name || ''} (${h.created_at || (h as HistoryEvent & { occurred_at?: string }).occurred_at || ''})`)} />}
      </DetailSection>

      <DetailSection title="Adjuntos">
        {!attachments.length ? <EmptyState message="Sin adjuntos." /> : (
          <ul className="file-list">{attachments.map((att) => (
            <li key={att.id}>
              {att.file_name}
              <a href={operationPath('API-SUP-033', { documentId: documentId!, attachmentId: String(att.id) })} download>Descargar</a>
            </li>
          ))}</ul>
        )}
        <div>
          <input type="file" ref={fileRef} aria-label="Seleccionar archivo" />
          <button onClick={() => void handleUpload()} disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir'}</button>
        </div>
      </DetailSection>

      <DetailSection title="Comentarios">
        {!comments.length ? <EmptyState message="Sin comentarios." /> : (
          <ul className="comment-list">{comments.map((c) => (
            <li key={c.id}><strong>{c.author_name || 'Anonimo'}:</strong> {c.content}<small>{formatDate(c.created_at)}</small></li>
          ))}</ul>
        )}
        <div>
          <label className="field">Agregar comentario<textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} /></label>
          <button onClick={() => void handleAddComment()} disabled={sendingComment || !commentText.trim()}>{sendingComment ? 'Enviando...' : 'Comentar'}</button>
        </div>
      </DetailSection>

      {error && <ErrorState error={error} />}

    </>
  );
}

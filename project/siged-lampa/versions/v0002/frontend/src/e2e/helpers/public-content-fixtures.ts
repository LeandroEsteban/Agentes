import { expect, type APIRequestContext } from '@playwright/test';

type Envelope<T> = { data: T };

async function adminLogin(request: APIRequestContext) {
  const response = await request.post('/api/v1/auth/internal-login', { data: { username: 'admin', password: 'admin123' } });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as Envelope<{ token: string }>).data.token;
}

export async function createNewsDraft(request: APIRequestContext, slug: string, title: string) {
  const token = await adminLogin(request);
  const response = await request.post('/api/v1/admin/public-content/news', {
    headers: { Authorization: `Bearer ${token}` },
    data: { slug, title, content_html: `<p>Contenido de ${title}</p>`, status: 'draft' }
  });
  expect(response.ok()).toBeTruthy();
  const item = (await response.json() as Envelope<{ id: number; slug?: string; title?: string; content_html?: string; status?: string }>).data;
  return { token, news: item };
}

export async function publishNews(request: APIRequestContext, token: string, id: number, slug: string, title: string) {
  const response = await request.patch(`/api/v1/admin/public-content/news/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { slug, title, content_html: `<p>Contenido de ${title}</p>`, status: 'published' }
  });
  expect(response.ok()).toBeTruthy();
}

export async function archiveNews(request: APIRequestContext, token: string, id: number, slug: string, title: string) {
  const response = await request.patch(`/api/v1/admin/public-content/news/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { slug, title, content_html: `<p>Contenido de ${title}</p>`, status: 'archived' }
  });
  expect(response.ok()).toBeTruthy();
}

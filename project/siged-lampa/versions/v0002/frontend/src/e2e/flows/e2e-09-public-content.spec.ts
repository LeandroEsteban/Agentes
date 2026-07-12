import { test, expect } from '@playwright/test';
import { createNewsDraft, publishNews, archiveNews } from '../helpers/public-content-fixtures';

test.describe('@E2E-09 contenido publico', () => {
  test('noticia: borrador no visible, publicar visible, archivar no visible', async ({ page, request: api }) => {
    const runId = Date.now();
    const slug = `e2e09-news-${runId}`;
    const title = `Noticia E2E09 ${runId}`;

    const { token, news } = await createNewsDraft(api, slug, title);

    await page.goto('/noticias');
    await expect(page.getByRole('heading', { name: 'Noticias' })).toBeVisible();
    await expect(page.getByText(title)).toHaveCount(0);

    await publishNews(api, token, news.id, slug, title);
    await page.goto('/noticias');
    await expect(page.getByText(title)).toBeVisible();

    await archiveNews(api, token, news.id, slug, title);
    await page.goto('/noticias');
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test('negativo: slug invalido en noticia rechazado con 400', async ({ request: api }) => {
    const loginRes = await api.post('/api/v1/auth/internal-login', { data: { username: 'admin', password: 'admin123' } });
    expect(loginRes.ok()).toBeTruthy();
    const token = ((await loginRes.json()) as { data: { token: string } }).data.token;
    const response = await api.post('/api/v1/admin/public-content/news', {
      data: { slug: 'INVALID SLUG', title: 'Bad', content_html: '<p>test</p>', status: 'draft' },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).toBe(400);
  });
});

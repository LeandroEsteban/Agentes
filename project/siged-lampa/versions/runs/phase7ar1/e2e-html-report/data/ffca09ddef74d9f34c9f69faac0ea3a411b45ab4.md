# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows\e2e-09-public-content.spec.ts >> @E2E-09 contenido publico >> negativo: slug invalido en noticia rechazado con 400
- Location: src\e2e\flows\e2e-09-public-content.spec.ts:25:3

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:4173
Call log:
  - → POST http://127.0.0.1:4173/api/v1/auth/internal-login
    - user-agent: Playwright/1.61.1 (x64; windows 10.0) node/24.18
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 42

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { createNewsDraft, publishNews, archiveNews } from '../helpers/public-content-fixtures';
  3  | 
  4  | test.describe('@E2E-09 contenido publico', () => {
  5  |   test('noticia: borrador no visible, publicar visible, archivar no visible', async ({ page, request: api }) => {
  6  |     const runId = Date.now();
  7  |     const slug = `e2e09-news-${runId}`;
  8  |     const title = `Noticia E2E09 ${runId}`;
  9  | 
  10 |     const { token, news } = await createNewsDraft(api, slug, title);
  11 | 
  12 |     await page.goto('/noticias');
  13 |     await expect(page.getByRole('heading', { name: 'Noticias' })).toBeVisible();
  14 |     await expect(page.getByText(title)).toHaveCount(0);
  15 | 
  16 |     await publishNews(api, token, news.id, slug, title);
  17 |     await page.goto('/noticias');
  18 |     await expect(page.getByText(title)).toBeVisible();
  19 | 
  20 |     await archiveNews(api, token, news.id, slug, title);
  21 |     await page.goto('/noticias');
  22 |     await expect(page.getByText(title)).toHaveCount(0);
  23 |   });
  24 | 
  25 |   test('negativo: slug invalido en noticia rechazado con 400', async ({ request: api }) => {
> 26 |     const loginRes = await api.post('/api/v1/auth/internal-login', { data: { username: 'admin', password: 'admin123' } });
     |                                ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:4173
  27 |     expect(loginRes.ok()).toBeTruthy();
  28 |     const token = ((await loginRes.json()) as { data: { token: string } }).data.token;
  29 |     const response = await api.post('/api/v1/admin/public-content/news', {
  30 |       data: { slug: 'INVALID SLUG', title: 'Bad', content_html: '<p>test</p>', status: 'draft' },
  31 |       headers: { Authorization: `Bearer ${token}` }
  32 |     });
  33 |     expect(response.status()).toBe(400);
  34 |   });
  35 | });
  36 | 
```
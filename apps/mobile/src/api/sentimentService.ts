import { apiClient } from './client';

export interface ArticleDetail {
  id: number;
  stock_symbol: string;
  article_date: string;
  polarity: number;
  source_url: string;
  headline: string;
  full_text: string | null;
  summary: string | null;
}

/**
 * Fetch-on-tap full detail for a single Sentiment Feed article.
 * spec/api.md `GET /sentiment-feed/article/{id}` — no auth, 404 if not found.
 */
export async function getArticleDetail(id: number | string): Promise<ArticleDetail> {
  const res = await apiClient.get(`/sentiment-feed/article/${id}`);
  return res.data;
}

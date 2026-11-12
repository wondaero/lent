// Supabase 공개 함수 호출(supabase/migrations/20261113120000_public_site.sql).
// 공개 키(anon)로 읽기만 하므로 @supabase/supabase-js 없이 fetch로 부른다(메인 번들을 가볍게).
import type { SiteApi } from './api';
import type { Book, PostImage } from '@site/types/models';
import { callNumber } from '@site/libs/format';
import { ApiError } from './error';

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const BUCKET = 'post-images';

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
    }).catch(() => {
        throw new ApiError('NETWORK_ERROR', 0);
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new ApiError(data?.message || `HTTP ${res.status}`, res.status);
    }
    return data as T;
}

const publicUrl = (path: string) => `${URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
const image = (i: { path: string; thumb_path: string; width?: number; height?: number }): PostImage => ({
    url: publicUrl(i.path), thumbUrl: publicUrl(i.thumb_path), width: i.width, height: i.height,
});

type BookRow = {
    id: number; reg_no: string; title: string; series_title: string | null; author: string | null; publisher: string | null;
    pub_year: string | null; class_no: string | null; author_mark: string | null; volume: string | null; copy_no: string | null;
    status: Book['status']; created_at: string; due_on: string | null;
};

export const toBook = (b: BookRow): Book => ({
    id: b.id, regNo: b.reg_no, createdAt: b.created_at, title: b.title, seriesTitle: b.series_title,
    author: b.author || null, publisher: b.publisher, pubYear: b.pub_year, classNo: b.class_no || null,
    authorMark: b.author_mark, volume: b.volume, copyNo: b.copy_no, status: b.status, dueOn: b.due_on,
    callNumber: callNumber(b.class_no, b.author_mark, b.volume, b.copy_no),
});

type Img = { path: string; thumb_path: string };

const api: SiteApi = {
    async books({ q = '', field = 'all', newDays, page = 1, size = 20 }) {
        const res = await rpc<{ total: number; rows: BookRow[] }>('public_books', {
            p_q: q, p_field: field, p_new_days: newDays ?? null, p_page: page, p_size: size,
        });
        return { items: res.rows.map(toBook), total: res.total, page, size };
    },
    async posts(board, { q = '', page = 1, size = 15 }) {
        const res = await rpc<{ total: number; rows: { id: number; category: 'notice' | 'activity'; title: string; pinned: boolean; published_at: string | null; image_count: number; image: Img | null }[] }>(
            'public_posts', { p_category: board, p_q: q, p_page: page, p_size: size });
        return {
            items: res.rows.map((p) => ({
                id: p.id, board: p.category, title: p.title, pinned: p.pinned, publishedAt: p.published_at,
                imageCount: p.image_count, thumbUrl: p.image ? publicUrl(p.image.thumb_path) : null,
            })),
            total: res.total, page, size,
        };
    },
    async post(id) {
        const p = await rpc<{ id: number; category: 'notice' | 'activity'; title: string; body: string; published_at: string | null; updated_at: string; images: (Img & { width: number; height: number })[] } | null>(
            'public_post', { p_id: id });
        return p && {
            id: p.id, board: p.category, title: p.title, content: p.body,
            publishedAt: p.published_at, updatedAt: p.updated_at, images: p.images.map(image),
        };
    },
    async home() {
        const res = await rpc<{ books: number; members: number; activities: { id: number; title: string; published_at: string | null; image: Img }[] }>('public_home', { p_activities: 5 });
        return {
            books: res.books, members: res.members,
            activities: res.activities.map((a) => ({ id: a.id, title: a.title, publishedAt: a.published_at, image: image(a.image) })),
        };
    },
};

export default api;

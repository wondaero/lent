// Supabase 값이 없을 때(npm run dev 등) 메인이 쓰는 목업. 업무 화면과 같은 목업 데이터(src/api/mockDb.js)를 읽어
// 공개 함수(public_books 등)와 같은 규칙으로 고른다: 분실·폐기 도서 제외, 게시된 글만, 띄어쓰기 무시 검색.
import type { SiteApi } from './api';
import type { BoardName, PostImage } from '@site/types/models';
import { toBook } from './remote';
// @ts-expect-error 업무 화면의 JS 목업(타입 없음)
import { db } from '@/api/mockDb.js';

type Row = Record<string, any>;
const DAY = 86400000;
const squash = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s/g, '');
const wait = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const kstDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);

const images = (postId: number): PostImage[] => (db.post_images as Row[])
    .filter((i) => i.post_id === postId)
    .sort((a, b) => a.sort - b.sort)
    .map((i) => ({ url: i.url, thumbUrl: i.thumb_url, width: i.width, height: i.height }));

const published = (board: BoardName) => (db.posts as Row[])
    .filter((p) => p.status === 'published' && p.category === board)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.published_at < b.published_at ? 1 : -1));

function dueOn(book: Row) {
    if (book.status !== 'loaned') return null;
    const loan = (db.loans as Row[]).find((l) => l.book_id === book.id && !l.returned_at);
    return loan ? kstDate(loan.extended_due_at || loan.due_at) : null;
}

const api: SiteApi = {
    async books({ q = '', field = 'all', newDays, page = 1, size = 20 }) {
        const kw = squash(q);
        const since = newDays ? Date.now() - newDays * DAY : 0;
        const text = (b: Row) => field === 'title' ? b.title : field === 'author' ? b.author : field === 'publisher' ? b.publisher
            : [b.title, b.series_title, b.author, b.publisher].join(' ');
        let rows = (db.books as Row[]).filter((b) => !['lost', 'discarded'].includes(b.status)
            && (!since || new Date(b.created_at).getTime() >= since)
            && (!kw || squash(text(b)).includes(kw) || (field === 'all' && b.reg_no.toLowerCase() === kw)));
        rows = rows.sort((a, b) => (newDays ? (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0) : 0)
            || a.title.localeCompare(b.title) || (a.call_sort_key < b.call_sort_key ? -1 : 1));
        const items = rows.slice((page - 1) * size, page * size).map((b) => toBook({ ...b, due_on: dueOn(b) } as never));
        return wait({ items, total: rows.length, page, size });
    },
    async posts(board, { q = '', page = 1, size = 15 }) {
        const kw = q.trim().toLowerCase();
        const rows = published(board).filter((p) => !kw || `${p.title} ${p.body}`.toLowerCase().includes(kw));
        const items = rows.slice((page - 1) * size, page * size).map((p) => {
            const imgs = images(p.id);
            return { id: p.id, board: p.category, title: p.title, pinned: p.pinned, publishedAt: p.published_at, imageCount: imgs.length, thumbUrl: imgs[0]?.thumbUrl ?? null };
        });
        return wait({ items, total: rows.length, page, size });
    },
    async post(id) {
        const p = (db.posts as Row[]).find((x) => x.id === id && x.status === 'published');
        return wait(p ? { id: p.id, board: p.category, title: p.title, content: p.body, publishedAt: p.published_at, updatedAt: p.updated_at, images: images(p.id) } : null);
    },
    async home() {
        const activities = published('activity')
            .filter((p) => images(p.id).length)
            .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
            .slice(0, 5)
            .map((p) => ({ id: p.id, title: p.title, publishedAt: p.published_at, image: images(p.id)[0]! }));
        return wait({
            books: (db.books as Row[]).filter((b) => !['lost', 'discarded'].includes(b.status)).length,
            members: (db.members as Row[]).filter((m) => !m.deleted_at).length,
            activities,
        });
    },
};

export default api;

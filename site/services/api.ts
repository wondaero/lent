// 메인(공개 화면)의 데이터 접근 입구. 화면은 이 모듈만 호출한다(업무 화면의 src/api/index.js와 같은 방식).
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 있으면 remote(공개 함수 호출), 없으면 mock(업무 화면 목업 데이터).
//   두 구현은 반환 형태가 같아야 한다. 쓰지 않는 쪽은 불러오지 않는다.
import type { BoardName, Book, HomeSummary, Paged, Post, PostDetail } from '@site/types/models';

export interface SiteApi {
    books(query: { q?: string; field?: string; newDays?: number; page?: number; size?: number }): Promise<Paged<Book>>;
    posts(board: BoardName, query: { q?: string; page?: number; size?: number }): Promise<Paged<Post>>;
    post(id: number): Promise<PostDetail | null>;
    home(): Promise<HomeSummary>;
}

const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const impl: Promise<SiteApi> = (hasSupabase ? import('./remote') : import('./mock')).then((m) => m.default);

// 신간 = 최근 이 기간에 등록된 책
export const NEW_BOOK_DAYS = 30;

export const BookApi = {
    list: async (query: { q?: string; field?: string; page?: number; size?: number }) => (await impl).books(query),
    listNew: async (query: { q?: string; page?: number; size?: number }) => (await impl).books({ ...query, field: 'all', newDays: NEW_BOOK_DAYS }),
};

export const BoardApi = {
    list: async (board: BoardName, query: { q?: string; page?: number; size?: number }) => (await impl).posts(board, query),
    get: async (id: number) => (await impl).post(id),
};

export const HomeApi = {
    get: async () => (await impl).home(),
};

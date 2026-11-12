// 메인(공개 화면)이 다루는 데이터. 공개 함수(public_books 등)가 내보내는 항목만 있다(회원·대출자 정보 없음)
export type BookStatus = 'available' | 'loaned' | 'readonly' | 'hold';
export type BoardName = 'notice' | 'activity';

export interface Paged<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

export interface Book {
    id: number;
    regNo: string;
    createdAt: string;
    title: string;
    seriesTitle: string | null;
    author: string | null;
    publisher: string | null;
    pubYear: string | null;
    classNo: string | null;
    authorMark: string | null;
    volume: string | null;
    copyNo: string | null;
    status: BookStatus;
    // 대출 중일 때만 (YYYY-MM-DD)
    dueOn: string | null;
    callNumber: string;
}

export interface PostImage {
    url: string;
    thumbUrl: string;
    width?: number;
    height?: number;
}

export interface Post {
    id: number;
    board: BoardName;
    title: string;
    pinned: boolean;
    publishedAt: string | null;
    imageCount: number;
    thumbUrl: string | null;
}

export interface PostDetail {
    id: number;
    board: BoardName;
    title: string;
    content: string;
    publishedAt: string | null;
    updatedAt: string;
    images: PostImage[];
}

export interface HomeSummary {
    books: number;
    members: number;
    activities: { id: number; title: string; publishedAt: string | null; image: PostImage }[];
}

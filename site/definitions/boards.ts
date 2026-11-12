import type { BoardName } from '@site/types/models';

// 글은 업무 화면(/admin 게시판)에서 쓰고, 메인은 게시된 글을 보여 주기만 한다
export interface BoardDefinition {
    name: BoardName;
    path: string;
    title: string;
    desc: string;
}

const boards: BoardDefinition[] = [
    { name: 'notice', path: '/notices', title: '공지사항', desc: '도서관의 새 소식을 알려 드려요.' },
    { name: 'activity', path: '/activities', title: '도서관 활동', desc: '도서관에서 함께한 활동을 소개해요.' },
];

export default boards;

export const boardByName = (name: BoardName) => boards.find((b) => b.name === name)!;

import type { BookStatus } from '@site/types/models';

// 날짜 표시 (YYYY.MM.DD). 시각이 붙은 값은 한국 시간 기준 날짜로
export function formatDate(value: string | null | undefined) {
    if (!value) {
        return '';
    }
    const day = value.length > 10 ? new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(0, 10) : value;
    return day.replace(/-/g, '.');
}

// 청구기호 한 줄: 분류기호 저자기호 v.권차 c.복본 (업무 화면 callNumberLines와 같은 표기)
export function callNumber(classNo?: string | null, authorMark?: string | null, volume?: string | null, copyNo?: string | null) {
    return [classNo, authorMark, volume && `v.${volume}`, copyNo && `c.${copyNo}`].filter(Boolean).join(' ');
}

// 도서관 표준 용어(대출가능·대출중)를 업무 화면과 같게 쓴다
export function bookStatusLabel(book: { status: BookStatus }) {
    switch (book.status) {
        case 'loaned':
            return { text: '대출중', tone: 'warn' };
        case 'readonly':
            return { text: '관내열람', tone: 'muted' };
        case 'hold':
            return { text: '대출보류', tone: 'muted' };
        default:
            return { text: '대출가능', tone: 'ok' };
    }
}

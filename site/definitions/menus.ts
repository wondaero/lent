import type { Menu } from '@site/types/menu';

const menus: Menu[] = [{
    url: '/intro',
    title: '도서관 정보',
    children: [{
        url: '/intro',
        title: '도서관 소개',
    }, {
        url: '/guide',
        title: '이용 안내',
    }, {
        url: '/location',
        title: '오시는 길',
    }]
}, {
    url: '/search',
    title: '도서 관련',
    children: [{
        url: '/search',
        title: '도서 검색',
    }, {
        url: '/new-books',
        title: '신간 도서',
    }]
}, {
    url: '/notices',
    title: '열린 마당',
    children: [{
        url: '/notices',
        title: '공지사항',
    }, {
        url: '/activities',
        title: '도서관 활동',
    }]
}];

export default menus;

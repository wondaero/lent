import type { RouteRecordRaw } from 'vue-router';
import boards from '@site/definitions/boards';

declare module 'vue-router' {
    interface RouteMeta {
        title?: string;
    }
}

const boardRoutes: RouteRecordRaw[] = boards.flatMap((board) => [
    {
        path: board.path,
        name: `board-${board.name}`,
        component: () => import('../pages/BoardList.vue'),
        props: { board: board.name },
        meta: { title: board.title },
    },
    {
        path: `${board.path}/:id`,
        name: `post-${board.name}`,
        component: () => import('../pages/BoardPost.vue'),
        props: (route) => ({ board: board.name, id: route.params.id }),
        meta: { title: board.title },
    },
]);

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('../pages/Home.vue'),
    },
    {
        path: '/intro',
        component: () => import('../pages/Intro.vue'),
        meta: { title: '도서관 소개' },
    },
    {
        path: '/guide',
        component: () => import('../pages/Guide.vue'),
        meta: { title: '이용 안내' },
    },
    {
        path: '/location',
        component: () => import('../pages/Location.vue'),
        meta: { title: '오시는 길' },
    },
    {
        path: '/search',
        component: () => import('../pages/Search.vue'),
        meta: { title: '도서 검색' },
    },
    {
        path: '/new-books',
        component: () => import('../pages/NewBooks.vue'),
        meta: { title: '신간 도서' },
    },
    ...boardRoutes,
    {
        path: '/:pathMatch(.*)*',
        component: () => import('../pages/Catch.vue'),
    },
];

export default routes;

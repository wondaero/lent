import { createRouter, createWebHistory } from 'vue-router';
import routes from '../configs/routes';
import { useGlobalStore } from '@site/stores/global';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        }
        // 같은 화면에서 검색어·페이지만 바뀌면 스크롤을 그대로 둠
        if (to.path === from.path) {
            return false;
        }
        return { top: 0 };
    },
});

router.afterEach((to) => {
    const globalStore = useGlobalStore();
    globalStore.headerDrawerOpen = false;
    globalStore.updateSiteTitle(to.meta.title);
});

// 사이트를 연 채로 새로 배포되면 이전 빌드의 화면 파일(해시 이름)이 서버에서 사라져, 아직 열지 않은 메뉴를 불러오지 못하고
// 메뉴를 눌러도 화면이 넘어가지 않고 멈춘 것처럼 보임 → 새 빌드를 받도록 가려던 주소로 다시 불러옴
const STALE_BUILD_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;
const RELOAD_KEY = 'lent.staleReloadAt';
// 새로 불러와도 같은 오류면(진짜 서버 문제) 반복해서 새로고침하지 않도록 이 시간 안에는 한 번만
const RELOAD_GAP_MS = 10_000;

function reloadForNewBuild(url: string) {
    try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY));
        if (last && Date.now() - last < RELOAD_GAP_MS) {
            return false;
        }
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
        // 저장소를 못 쓰면 반복 방지 없이 한 번만 시도
    }
    window.location.assign(url);
    return true;
}

router.onError((error, to) => {
    if (STALE_BUILD_ERROR.test(String((error as Error)?.message ?? error))) {
        reloadForNewBuild(to.fullPath);
    }
});

// Vite 가 화면 파일의 부수 파일(CSS 등)을 미리 불러오다 실패했을 때
window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadForNewBuild(window.location.href);
});

export default router;

import site from '@site/definitions/site';
import { computed, reactive } from 'vue';

// 사이트 전체에서 같이 쓰는 화면 상태. 이것 하나뿐이라 pinia 없이 reactive 모듈로 둔다
const windowSize = reactive({ width: 0, height: 0 });

const state = reactive({
    windowSize,
    // 모바일 헤더의 메뉴 펼침
    headerDrawerOpen: false,
    isMobile: computed(() => windowSize.width <= 767),
    climb() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    setWindowSize(width: number, height: number) {
        windowSize.width = width;
        windowSize.height = height;
    },
    updateSiteTitle(title?: string) {
        document.title = title ? `${title} - ${site.title}` : site.title;
    },
});

export const useGlobalStore = () => state;

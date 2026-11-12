import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** 요소가 화면에 처음 보일 때 true가 되는 ref를 돌려준다. */
export function useInView(target: Ref<HTMLElement | null>, threshold = 0.25) {
    const visible = ref(false);
    let observer: IntersectionObserver | null = null;

    onMounted(() => {
        const el = target.value;
        if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
            visible.value = true;
            return;
        }
        observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                visible.value = true;
                observer?.disconnect();
            }
        }, { threshold });
        observer.observe(el);
    });

    onBeforeUnmount(() => observer?.disconnect());

    return visible;
}

/** 0에서 목표 숫자까지 easeOutCubic으로 올라가는 숫자. start(목표)를 호출하면 시작한다(목표는 서버에서 받은 값). */
export function useCountUp(duration = 1600) {
    const value = ref(0);
    let frame = 0;

    const start = (target: number) => {
        cancelAnimationFrame(frame);
        if (prefersReducedMotion()) {
            value.value = target;
            return;
        }
        const startedAt = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            value.value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };
        frame = requestAnimationFrame(tick);
    };

    onBeforeUnmount(() => cancelAnimationFrame(frame));

    return { value, start };
}

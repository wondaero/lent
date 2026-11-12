<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { closeWatcherSupported, useCloseWatcher } from '@site/composable/useCloseWatcher';
import { feedback } from '@site/composable/useFeedback';

// 모달 대신 쓰는 바텀 시트. wide: 데스크톱에서 넓게 (도서 등록 등 입력이 많은 시트)
const props = defineProps<{ open: boolean; title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();

// 아래로 끌어서 닫기: 이동 거리나 속도가 기준을 넘으면 닫고, 아니면 제자리로
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.6; // px/ms

const dragY = ref(0);
const dragging = ref(false);
let startY = 0;
let lastY = 0;
let lastTime = 0;
let velocity = 0;

const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
        return;
    }
    dragging.value = true;
    startY = lastY = e.clientY;
    lastTime = e.timeStamp;
    velocity = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPointerMove = (e: PointerEvent) => {
    if (!dragging.value) {
        return;
    }
    const dy = e.clientY - startY;
    // 위로 당기면 살짝만 늘어나도록 저항을 줌
    dragY.value = dy > 0 ? dy : dy / 6;
    const dt = e.timeStamp - lastTime;
    if (dt > 0) {
        velocity = (e.clientY - lastY) / dt;
    }
    lastY = e.clientY;
    lastTime = e.timeStamp;
};

const onPointerUp = () => {
    if (!dragging.value) {
        return;
    }
    dragging.value = false;
    if (dragY.value > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
        emit('close');
        // 부모가 닫지 않으면(저장 확인 등) 제자리로
        nextTick(() => {
            if (props.open) {
                dragY.value = 0;
            }
        });
    } else {
        dragY.value = 0;
    }
};

// 안드로이드 백 버튼·Esc 로 닫기. 확인 창이 떠 있는 동안은 확인 창부터 닫히도록 쉼
useCloseWatcher(() => props.open && !feedback.confirm.open, () => emit('close'));

const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !feedback.confirm.open) {
        emit('close');
    }
};

// 화면 키보드가 올라오면 시트가 키보드 위에 오도록 배경을 보이는 영역(visualViewport)에 맞춤
const viewportStyle = ref<Record<string, string>>();

const fitViewport = () => {
    const vv = window.visualViewport;
    if (vv) {
        viewportStyle.value = { top: `${vv.offsetTop}px`, height: `${vv.height}px` };
    }
};

const watchViewport = (on: boolean) => {
    const vv = window.visualViewport;
    if (!vv) {
        return;
    }
    const method = on ? 'addEventListener' : 'removeEventListener';
    vv[method]('resize', fitViewport);
    vv[method]('scroll', fitViewport);
    if (on) {
        fitViewport();
    }
};

// 여러 시트가 겹쳐 열려도 배경 스크롤 잠금이 올바르게 풀리도록 전역 카운트
const lock = window as unknown as { __sheetLocks?: number };

const setScrollLock = (on: boolean) => {
    lock.__sheetLocks = Math.max(0, (lock.__sheetLocks ?? 0) + (on ? 1 : -1));
    document.documentElement.style.overflow = lock.__sheetLocks ? 'hidden' : '';
};

watch(
    () => props.open,
    (open) => {
        if (open) {
            dragY.value = 0;
            if (!closeWatcherSupported) {
                window.addEventListener('keydown', onKey);
            }
        } else {
            window.removeEventListener('keydown', onKey);
        }
        watchViewport(open);
        setScrollLock(open);
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    if (props.open) {
        watchViewport(false);
        setScrollLock(false);
    }
});
</script>

<template>
    <Teleport to="body">
        <Transition name="sheet" @after-leave="dragY = 0">
            <div v-if="open" class="sheet-backdrop" :style="viewportStyle" @click.self="emit('close')">
                <section class="sheet" :class="{ dragging, wide }"
                    :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined" role="dialog"
                    aria-modal="true" :aria-label="title">
                    <header class="sheet-head" @pointerdown="onPointerDown" @pointermove="onPointerMove"
                        @pointerup="onPointerUp" @pointercancel="onPointerUp">
                        <span class="grabber" aria-hidden="true"></span>
                        <div class="title-row">
                            <h2>{{ title }}</h2>
                            <button class="close" type="button" aria-label="닫기" @click="emit('close')">
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2"
                                        stroke-linecap="round" />
                                </svg>
                            </button>
                        </div>
                    </header>
                    <div class="sheet-body">
                        <slot />
                    </div>
                    <footer v-if="$slots.footer" class="sheet-foot">
                        <slot name="footer" />
                    </footer>
                </section>
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
// iOS 시트와 비슷한 감속 곡선
$ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);

.sheet-backdrop {
    position: fixed;
    inset: 0;
    bottom: auto;
    height: 100%;
    z-index: 80;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(17, 20, 31, 0.45);
}

.sheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--px640);
    max-height: calc(100% - var(--px40));
    background: #fff;
    border-radius: var(--px20) var(--px20) 0 0;
    box-shadow: 0 var(--px-8) var(--px40) rgba(17, 20, 31, 0.18);
    transition: transform 0.4s $ease-sheet;
    will-change: transform;

    &.wide {
        max-width: 60rem;
    }

    &.dragging {
        transition: none;
    }
}

// 손잡이 + 제목 영역 (여기를 끌어서 닫기)
.sheet-head {
    flex: none;
    padding: var(--px8) var(--px20) var(--px4);
    touch-action: none;
    cursor: grab;
    user-select: none;

    .dragging & {
        cursor: grabbing;
    }
}

.grabber {
    display: block;
    width: var(--px36);
    height: var(--px5);
    margin: 0 auto var(--px6);
    border-radius: var(--px500);
    background: var(--color-border);
}

.title-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--px44);
    padding: 0 var(--px44);

    h2 {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--px17);
        font-weight: 700;
    }
}

.close {
    position: absolute;
    right: 0;
    top: 50%;
    display: grid;
    place-items: center;
    width: var(--px30);
    height: var(--px30);
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--color-background);
    color: var(--color-secondary);
    transform: translateY(-50%);

    &:hover {
        color: var(--color-default);
    }
}

.sheet-body {
    flex: 1;
    min-height: 0;
    padding: var(--px8) var(--px20) var(--px20);
    overflow-y: auto;
    overscroll-behavior: contain;

    // 하단 버튼 영역이 없으면 홈 인디케이터 영역만큼 여백
    &:last-child {
        padding-bottom: calc(var(--px20) + env(safe-area-inset-bottom));
    }
}

.sheet-foot {
    flex: none;
    display: flex;
    gap: var(--px8);
    padding: var(--px12) var(--px20) calc(var(--px12) + env(safe-area-inset-bottom));
    border-top: var(--px1) solid var(--color-border-light);

    :slotted(.btn) {
        flex: 1;
        height: var(--px48);
        font-weight: 600;
    }
}

// 열고 닫힐 때: 배경은 페이드, 시트는 아래에서 올라옴
.sheet-enter-active,
.sheet-leave-active {
    transition: background-color 0.3s ease;

    .sheet {
        transition: transform 0.4s $ease-sheet;
    }
}

.sheet-leave-active .sheet {
    transition-duration: 0.28s;
}

.sheet-enter-from,
.sheet-leave-to {
    background-color: transparent;

    .sheet {
        transform: translateY(100%) !important;
    }
}
</style>

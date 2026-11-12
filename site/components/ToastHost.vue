<script lang="ts" setup>
import { useCloseWatcher } from '@site/composable/useCloseWatcher';
import { closeConfirm, feedback } from '@site/composable/useFeedback';
import { onMounted, onUnmounted } from 'vue';

// 안드로이드 백 버튼은 취소로
useCloseWatcher(() => feedback.confirm.open, () => closeConfirm(false));

// Esc 는 취소, Enter 는 확인 (바코드 스캐너로 일하는 관리 화면에서 키보드만으로 진행)
const onKey = (e: KeyboardEvent) => {
    if (!feedback.confirm.open) {
        return;
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        closeConfirm(false);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        closeConfirm(true);
    }
};

onMounted(() => window.addEventListener('keydown', onKey, true));
onUnmounted(() => window.removeEventListener('keydown', onKey, true));
</script>

<template>
    <div class="toasts" aria-live="polite">
        <TransitionGroup name="toast">
            <div v-for="t in feedback.toasts" :key="t.id" class="toast" :class="t.tone">{{ t.text }}</div>
        </TransitionGroup>
    </div>

    <Transition name="fade">
        <div v-if="feedback.confirm.open" class="confirm-backdrop" @click.self="closeConfirm(false)">
            <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
                <div class="confirm-body">
                    <h3 id="confirm-title">{{ feedback.confirm.title }}</h3>
                    <p v-if="feedback.confirm.message">{{ feedback.confirm.message }}</p>
                </div>
                <div class="confirm-actions">
                    <button class="cancel" type="button" @click="closeConfirm(false)">취소</button>
                    <button class="ok" :class="{ danger: feedback.confirm.danger }" type="button"
                        @click="closeConfirm(true)">
                        {{ feedback.confirm.confirmText }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
.toasts {
    position: fixed;
    left: 50%;
    bottom: calc(var(--px40) + env(safe-area-inset-bottom));
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--px8);
    width: min(var(--px420), calc(100% - var(--px32)));
    transform: translateX(-50%);
    pointer-events: none;
}

.toast {
    padding: var(--px10) var(--px18);
    border-radius: var(--px500);
    background: var(--color-default);
    color: #fff;
    font-size: var(--px15);
    text-align: center;
    box-shadow: 0 var(--px6) var(--px20) rgba(17, 20, 31, 0.2);

    &.error {
        background: var(--color-red);
    }
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(var(--px8));
}

.toast-enter-active,
.toast-leave-active {
    transition: all 0.2s ease;
}

.confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: var(--px16);
    background: rgba(17, 20, 31, 0.45);
}

// 본문 + 하단에 꽉 찬 두 버튼 (취소 / 확인)
.confirm {
    width: min(var(--px360), 100%);
    overflow: hidden;
    background: #fff;
    border-radius: var(--px14);
    box-shadow: 0 var(--px10) var(--px40) rgba(17, 20, 31, 0.25);
}

.confirm-body {
    padding: var(--px28) var(--px24) var(--px24);

    h3 {
        margin: 0;
        font-size: var(--px16);
        font-weight: 600;
        line-height: 1.5;
        white-space: pre-line;
    }

    p {
        margin: var(--px6) 0 0;
        color: var(--color-secondary);
        font-size: var(--px14);
        line-height: 1.5;
        white-space: pre-line;
    }
}

.confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;

    button {
        height: var(--px52);
        border: 0;
        font-size: var(--px15);
        font-weight: 700;
        transition: filter 0.15s ease;

        &:hover {
            filter: brightness(0.97);
        }

        &:active {
            filter: brightness(0.92);
        }
    }

    .cancel {
        background: var(--color-background);
        color: var(--color-default);
    }

    .ok {
        background: var(--color-point);
        color: #fff;

        &.danger {
            background: var(--color-red);
        }
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

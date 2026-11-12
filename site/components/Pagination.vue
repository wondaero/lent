<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
    page: number;
    size: number;
    total: number;
}>();

const emit = defineEmits<{ change: [page: number] }>();

// 한 번에 보여 줄 페이지 번호 수
const WINDOW = 5;

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.size)));

const pages = computed(() => {
    const start = Math.floor((props.page - 1) / WINDOW) * WINDOW + 1;
    const end = Math.min(pageCount.value, start + WINDOW - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const go = (page: number) => {
    if (page >= 1 && page <= pageCount.value && page !== props.page) {
        emit('change', page);
    }
};
</script>

<template>
    <nav v-if="pageCount > 1" class="pagination-nav" aria-label="페이지">
        <button type="button" :disabled="page <= 1" aria-label="이전 페이지" @click="go(page - 1)">
            <img src="/assets/images/common.angle.left.svg" alt="" />
        </button>
        <button v-for="p in pages" :key="p" type="button" :class="{ active: p === page }" @click="go(p)">{{ p
            }}</button>
        <button type="button" :disabled="page >= pageCount" aria-label="다음 페이지" @click="go(page + 1)">
            <img src="/assets/images/common.angle.right.svg" alt="" />
        </button>
    </nav>
</template>

<style lang="scss" scoped>
.pagination-nav {
    display: flex;
    justify-content: center;
    gap: var(--px4);
    margin-top: var(--px24);

    button {
        min-width: var(--px36);
        height: var(--px36);
        padding: 0 var(--px8);
        border: var(--px1) solid transparent;
        border-radius: var(--px6);
        background: transparent;
        font-size: var(--px15);
        display: inline-flex;
        align-items: center;
        justify-content: center;

        img {
            width: var(--px14);
        }

        &:hover:not(:disabled) {
            background: var(--color-background);
        }

        &.active {
            border-color: var(--color-point);
            color: var(--color-point);
            font-weight: 700;
        }

        &:disabled {
            opacity: 0.3;
        }
    }
}
</style>

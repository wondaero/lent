<script lang="ts" setup>
import { useGlobalStore } from '@site/stores/global';

const globalStore = useGlobalStore();

const props = defineProps<{
    visible: boolean
}>();
</script>

<template>
    <div class="climb" :class="{ visible: props.visible }" title="스크롤 위로" @click="globalStore.climb()">
        <img src="/assets/images/component.climb.arrow.svg" alt="위쪽으로 향하는 화살표" loading="lazy" />
    </div>
</template>

<style lang="scss" scoped>
.climb {
    position: fixed;
    cursor: pointer;
    bottom: var(--px15);
    right: var(--px15);
    width: var(--px60);
    height: var(--px60);
    display: flex;
    border-radius: var(--px-radius);
    align-items: center;
    justify-content: center;
    background: #fff;
    border: var(--px1) solid var(--color-border);
    visibility: hidden;
    opacity: 0;
    transition: opacity var(--transition-time), visibility var(--transition-time);
    z-index: 9;

    >img {
        height: var(--px25);
    }

    &.visible {
        visibility: visible;
        opacity: 0.75;
    }
}
</style>
<script setup lang="ts">
defineProps<{
    title: string;
    desc?: string;
}>();
</script>

<template>
    <div class="page-title">
        <h1>{{ title }}</h1>
        <div v-if="desc" class="desc">{{ desc }}</div>
    </div>
</template>

<style lang="scss" scoped>
.page-title {
    margin-bottom: var(--px20);

    h1 {
        font-size: var(--px18);
        font-weight: 700;
        margin-bottom: 0;
    }

    .desc {
        font-size: var(--px16);
        margin-top: var(--px4);
    }

    @media(max-width: 767px) {
        margin-bottom: var(--px15);
    }
}
</style>

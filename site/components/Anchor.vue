<script lang="ts" setup>
interface Props {
    url?: string,
    target?: "_blank",
}

const props = defineProps<Props>();
</script>

<template>
    <RouterLink :to="props.url" v-if="props.url && !props.target">
        <slot />
    </RouterLink>
    <a :href="props.url" :target="props.target" v-else>
        <slot />
    </a>
</template>
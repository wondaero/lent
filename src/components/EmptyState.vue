<script setup>
import Doodle from './Doodle.vue'

defineProps({
  art: { type: String, default: 'sprout' },
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  size: { type: Number, default: 96 },
})
</script>

<template>
  <div class="empty-art">
    <Doodle :name="art" :size="size" />
    <p v-if="title"><strong>{{ title }}</strong></p>
    <p v-if="text">{{ text }}</p>
    <slot />
  </div>
</template>

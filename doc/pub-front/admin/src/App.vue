<script setup>
import LeftAside from './components/LeftAside.vue'
</script>

<template>
  <div class="wrapper">
        <LeftAside />
        <router-view :key="$route.fullPath" />
      <div></div>
  </div>
</template>

<style scoped lang="scss">
  .wrapper{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: strech;
    min-width: 1080px;

    & > main{
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
  }

</style>

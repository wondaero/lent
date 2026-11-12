<script setup lang="ts">
import { onMounted, ref } from 'vue';
import HomeBanner from '@site/components/HomeBanner.vue';
import HomeSearch from '@site/components/HomeSearch.vue';
import HomeAboutUs from '@site/components/HomeAboutUs.vue';
import HomeActivities from '@site/components/HomeActivities.vue';
import { HomeApi } from '@site/services/api';
import type { HomeSummary } from '@site/types/models';

// 장서·회원 수와 최근 활동은 한 번에 받는다(공개 함수 public_home). 실패해도 홈의 나머지는 그대로 보인다
const summary = ref<HomeSummary | null>(null);
onMounted(async () => {
    try {
        summary.value = await HomeApi.get();
    } catch {
        summary.value = null;
    }
});
</script>

<template>
    <div class="home">
        <HomeBanner />
        <HomeSearch />
        <HomeAboutUs :books="summary?.books ?? null" :members="summary?.members ?? null" />
        <HomeActivities v-if="summary?.activities.length" :items="summary.activities" />
    </div>
</template>

<style lang="scss" scoped>
.home {
    display: flex;
    flex-direction: column;
    gap: var(--px50);

    @media (max-width: 767px) {
        gap: 30px;
    }
}
</style>

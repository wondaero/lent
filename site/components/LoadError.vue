<script setup lang="ts">
import { computed } from 'vue';
import { errorCode } from '@site/composable/useFeedback';

// 데이터를 받아 오지 못했을 때 목록 자리에 보여 준다.
// 빈 결과("글이 없어요", "0건")로 보이면 이용자가 실제로 없다고 오해하므로, 실패를 화면에 남기고 다시 시도하게 한다
const props = defineProps<{ error: unknown }>();
defineEmits<{ retry: [] }>();

const message = computed(() => errorCode(props.error) === 'NETWORK_ERROR'
    ? '인터넷에 연결되지 않았어요. 연결을 확인한 뒤 다시 시도해 주세요.'
    : '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
</script>

<template>
    <div class="load-error" role="alert">
        <p>{{ message }}</p>
        <button type="button" class="btn btn-light-line" @click="$emit('retry')">다시 시도</button>
    </div>
</template>

<style lang="scss" scoped>
.load-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--px14);
    padding: var(--px50) 0;
    text-align: center;
    color: var(--color-secondary);

    p {
        margin: 0;
    }
}
</style>

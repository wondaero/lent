<script setup>
// 라벨지 크기·여백 입력칸(청구기호/바코드 라벨 공통)
defineProps({ s: { type: Object, required: true } })
</script>

<template>
  <div class="grid3">
    <label class="field"><span>열 수</span><input v-model.number="s.cols" class="input" type="number" min="1" max="10" /></label>
    <label class="field"><span>가로(mm)</span><input v-model.number="s.width" class="input" type="number" min="10" step="0.5" /></label>
    <label class="field"><span>세로(mm)</span><input v-model.number="s.height" class="input" type="number" min="10" step="0.5" /></label>
    <label class="field"><span>좌우 간격</span><input v-model.number="s.gapX" class="input" type="number" min="0" step="0.5" /></label>
    <label class="field"><span>상하 간격</span><input v-model.number="s.gapY" class="input" type="number" min="0" step="0.5" /></label>
    <label class="field"><span>글자(pt)</span><input v-model.number="s.fontSize" class="input" type="number" min="6" max="30" /></label>
    <label class="field"><span>위 여백</span><input v-model.number="s.top" class="input" type="number" min="0" step="0.5" /></label>
    <label class="field"><span>왼쪽 여백</span><input v-model.number="s.left" class="input" type="number" min="0" step="0.5" /></label>
    <label class="field"><span>건너뛸 칸</span><input v-model.number="s.skip" class="input" type="number" min="0" /></label>
  </div>
</template>

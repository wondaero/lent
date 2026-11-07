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
    <!-- 1부터 세는 칸 번호. 미리보기에서 칸을 눌러도 바뀐다 -->
    <label class="field"><span>시작 칸</span><input :value="(s.skip || 0) + 1" class="input" type="number" min="1" @input="s.skip = Math.max(0, (+$event.target.value || 1) - 1)" /></label>
  </div>
  <p class="sheet-note">쓰다 남은 라벨지는 오른쪽 미리보기에서 <b>첫 빈칸을 누르세요</b>. 그 칸부터 인쇄합니다.</p>
</template>

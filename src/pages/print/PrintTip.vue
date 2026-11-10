<!-- 인쇄 창 설정 안내. 여백·배율이 다르면 mm 위치가 통째로 밀려서, 라벨 설정을 고쳐도 맞지 않는다 -->
<template>
  <p class="print-tip">
    인쇄 창에서 <b>여백: 없음</b>, <b>배율: 100%(기본값)</b>으로 인쇄하세요.
    <span>"페이지에 맞춤"이 켜져 있거나 여백이 들어가면 라벨 위치가 밀립니다.</span>
  </p>
</template>

<style scoped>
.print-tip { margin: 0; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-2); font-size: 13px; color: var(--text-2); line-height: 1.5; }
.print-tip b { color: var(--text); }
.print-tip span { display: block; color: var(--text-3); font-size: 12px; }
</style>

<script setup>
// 로고(그루터기·새싹) 그림체의 작은 일러스트. 굵은 외곽선 + 크림/나무/새싹 색.
// 색은 전부 CSS 토큰이라 다크모드에서 외곽선이 밝게 바뀜. 장식용이므로 스크린리더에서 숨김.
defineProps({
  name: { type: String, required: true },   // sprout | books | stump | search | scan
  size: { type: Number, default: 96 },
})
</script>

<template>
  <svg
    class="doodle" :width="size" :height="size * 0.75" viewBox="0 0 120 90" aria-hidden="true"
    fill="none" stroke="var(--doodle-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"
  >
    <!-- 새싹 -->
    <g v-if="name === 'sprout'">
      <path d="M26 79 C40 67 80 67 94 79 Z" fill="var(--wood-soft)" />
      <path d="M60 75 C60 64 60 54 60 45" />
      <path d="M60 56 C47 56 37 48 34 36 C47 35 58 42 60 56 Z" fill="var(--brand)" />
      <path d="M60 47 C65 34 77 27 91 28 C89 41 77 48 60 47 Z" fill="#74bb2a" />
    </g>

    <!-- 책 더미 + 새싹 -->
    <g v-else-if="name === 'books'">
      <rect x="18" y="62" width="84" height="15" rx="3" fill="var(--wood)" />
      <path d="M28 66 v7 M92 66 v7" stroke-width="2" />
      <rect x="25" y="47" width="72" height="15" rx="3" fill="var(--brand)" transform="rotate(-3 61 54)" />
      <path d="M34 51 v7" stroke-width="2" transform="rotate(-3 61 54)" />
      <rect x="31" y="33" width="60" height="14" rx="3" fill="var(--cream)" />
      <path d="M40 37 h22" stroke-width="2" />
      <path d="M74 33 C74 26 75 21 77 16" />
      <path d="M76 22 C70 22 65 18 64 12 C70 12 75 16 76 22 Z" fill="var(--brand)" />
      <path d="M77 18 C80 11 86 8 93 9 C92 15 85 19 77 18 Z" fill="#74bb2a" />
    </g>

    <!-- 그루터기 -->
    <g v-else-if="name === 'stump'">
      <path d="M30 40 L33 71 C33 76 37 78 41 76 L48 72 L54 78 L61 72 L68 78 L74 72 L80 76 C84 78 88 76 88 71 L92 40 Z" fill="var(--wood)" />
      <path d="M42 50 v14 M56 52 v16 M72 50 v12" stroke-width="2" />
      <ellipse cx="61" cy="40" rx="31" ry="10" fill="var(--cream)" />
      <ellipse cx="61" cy="40" rx="18" ry="5.5" stroke="var(--wood)" stroke-width="1.6" />
      <ellipse cx="61" cy="40" rx="7" ry="2.2" stroke="var(--wood)" stroke-width="1.6" />
      <path d="M86 37 C88 29 90 25 94 21" />
      <path d="M90 27 C85 25 82 21 82 16 C87 17 90 21 90 27 Z" fill="var(--brand)" />
      <path d="M93 23 C96 16 102 13 108 14 C106 20 100 24 93 23 Z" fill="#74bb2a" />
      <path d="M22 36 C17 33 15 29 16 24 C21 26 24 30 22 36 Z" fill="#74bb2a" />
    </g>

    <!-- 돋보기 + 잎 (검색 결과 없음) -->
    <g v-else-if="name === 'search'">
      <path d="M68 58 L88 78" stroke-width="12" />
      <path d="M68 58 L88 78" stroke="var(--wood)" stroke-width="6.5" />
      <circle cx="52" cy="42" r="22" fill="var(--surface)" />
      <circle cx="52" cy="42" r="22" fill="var(--cream)" opacity=".45" stroke="none" />
      <path d="M52 50 C52 45 52 41 53 37" stroke-width="2.2" />
      <path d="M52 44 C45 44 41 40 40 34 C46 34 51 38 52 44 Z" fill="var(--brand)" stroke-width="2.2" />
      <path d="M53 39 C56 32 62 29 68 30 C67 36 61 40 53 39 Z" fill="#74bb2a" stroke-width="2.2" />
    </g>

    <!-- 바코드 책 (스캔 대기) -->
    <g v-else-if="name === 'scan'">
      <path d="M30 18 h56 a4 4 0 0 1 4 4 v54 a4 4 0 0 1 -4 4 h-56 z" fill="var(--brand)" />
      <path d="M30 18 v62 M36 18 v62" stroke-width="2" />
      <rect x="44" y="34" width="38" height="24" rx="3" fill="var(--surface)" />
      <path d="M50 39 v14 M54 39 v14 M57 39 v14 M62 39 v14 M65 39 v14 M70 39 v14 M73 39 v14 M77 39 v14" stroke-width="1.8" />
      <path d="M84 18 C84 12 86 8 89 5" />
      <path d="M87 10 C82 9 79 6 79 1.5 C84 2 87 5 87 10 Z" fill="var(--wood)" />
      <path d="M89 7 C92 2 97 0 102 1 C101 6 96 8 89 7 Z" fill="#74bb2a" />
      <path d="M14 70 h10 M18 64 v12" stroke="var(--wood)" stroke-width="2.4" />
      <path d="M100 52 h8 M104 48 v8" stroke="var(--brand)" stroke-width="2.2" />
    </g>
  </svg>
</template>

<style scoped>
.doodle { display: block; flex: none; }
</style>

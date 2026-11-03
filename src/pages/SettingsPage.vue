<script setup>
import { ref, watch } from 'vue'

// 설정 항목은 아직 미정 — 현재는 화면 테마만 실제 동작, 나머지는 자리만 잡아둠
const THEME_KEY = 'lent.theme'
const theme = ref((() => { try { return localStorage.getItem(THEME_KEY) || 'system' } catch { return 'system' } })())
watch(theme, (t) => {
  if (t === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(THEME_KEY, t) } catch {}
}, { immediate: true })
</script>

<template>
  <div class="stack narrow">
    <section class="card">
      <div class="card-head"><h3>화면</h3></div>
      <div class="card-body">
        <div class="field">
          <span>테마</span>
          <div class="seg">
            <button :class="{ on: theme === 'system' }" @click="theme = 'system'">시스템</button>
            <button :class="{ on: theme === 'light' }" @click="theme = 'light'">라이트</button>
            <button :class="{ on: theme === 'dark' }" @click="theme = 'dark'">다크</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>대출 기본값</h3><span class="badge gray">준비중</span></div>
      <div class="card-body form-grid">
        <label class="field"><span>기본 대출 권수</span><input class="input" type="number" value="5" disabled /></label>
        <label class="field"><span>기본 대출 기간(일)</span><input class="input" type="number" value="14" disabled /></label>
        <label class="field"><span>연장 가능 횟수</span><input class="input" type="number" value="1" disabled /></label>
        <label class="field"><span>연체 시 대출정지(일/연체일)</span><input class="input" type="number" value="1" disabled /></label>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>도서관 정보 · 관리자 계정</h3><span class="badge gray">준비중</span></div>
      <div class="card-body muted">도서관 이름, 운영 시간, 휴관일, 관리자 계정 관리 등이 들어갈 예정입니다.</div>
    </section>
  </div>
</template>

<style scoped>
.narrow { max-width: 820px; }
</style>

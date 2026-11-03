<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '@/stores/auth'
import { LIBRARY_NAME } from '@/lib/constants'
import Doodle from '@/components/Doodle.vue'

const route = useRoute()
const router = useRouter()
const form = reactive({ email: '', password: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (!form.email || !form.password) { error.value = '이메일과 비밀번호를 입력해주세요.'; return }
  busy.value = true
  try {
    await login(form.email.trim(), form.password)
    router.replace(typeof route.query.next === 'string' ? route.query.next : '/')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <!-- 장식: 아래쪽 풀밭 위 새싹과 책 더미 -->
    <div class="meadow" aria-hidden="true">
      <Doodle name="sprout" :size="120" class="d1" />
      <Doodle name="books" :size="130" class="d2" />
    </div>
    <form class="panel card" @submit.prevent="submit">
      <div class="head">
        <img src="/logo.svg" alt="" width="120" height="80" class="logo" />
        <h2>{{ LIBRARY_NAME }}</h2>
        <p class="muted">관리자 로그인</p>
      </div>
      <label class="field">
        <span>이메일</span>
        <input v-model="form.email" class="input lg" type="email" autocomplete="username" autofocus />
      </label>
      <label class="field">
        <span>비밀번호</span>
        <input v-model="form.password" class="input lg" type="password" autocomplete="current-password" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="btn primary lg" type="submit" :disabled="busy">{{ busy ? '로그인 중…' : '로그인' }}</button>
      <p class="hint muted">데모 계정: admin@lib.local / admin1234</p>
    </form>
  </div>
</template>

<style scoped>
.login {
  position: relative; min-height: 100vh; display: grid; place-items: center; padding: 16px 16px 120px; overflow: hidden;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, var(--wood-soft), transparent 70%), var(--bg);
}
.meadow { position: absolute; left: 0; right: 0; bottom: 0; height: 110px; pointer-events: none;
  background: radial-gradient(ellipse 70% 100% at 50% 100%, var(--brand-soft), transparent 70%); }
.meadow .d1 { position: absolute; left: calc(50% - 300px); bottom: 14px; }
.meadow .d2 { position: absolute; left: calc(50% + 170px); bottom: 10px; }
.panel { position: relative; width: 100%; max-width: 380px; padding: 32px 28px; display: grid; gap: 16px; box-shadow: var(--shadow); }
@media (max-width: 720px) { .meadow .d1 { left: 4%; } .meadow .d2 { left: auto; right: 4%; } }
.head { text-align: center; display: grid; justify-items: center; gap: 4px; margin-bottom: 8px; }
.head h2 { font-size: 22px; margin-top: 8px; }
.head p { margin: 0; font-size: 14px; }
.error { margin: 0; color: var(--red); font-size: 13.5px; }
.hint { margin: 0; text-align: center; font-size: 12.5px; }
</style>

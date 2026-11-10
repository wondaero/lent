import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Vercel 배포 빌드에 Supabase 값이 없으면 실패시킨다.
  // 값이 없으면 앱이 조용히 목업 모드(데모 계정·가짜 데이터)로 떠서, 직원이 목업에 등록하고 날리는 사고가 날 수 있다
  if (process.env.VERCEL) {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k])
    if (missing.length) throw new Error(`Vercel 환경변수가 없습니다: ${missing.join(', ')} (Project Settings → Environment Variables)`)
  }
  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})

import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// /admin 아래 주소(/admin/books/12 등)를 새로고침해도 업무 화면이 뜨게(개발·미리보기 서버용. 배포는 vercel.json)
// Vite의 기본 대체 페이지는 루트 index.html(메인)이라 그대로 두면 메인이 뜬다
function adminFallback(req, _res, next) {
  const [path, query] = req.url.split('?')
  if ((path === '/admin' || path.startsWith('/admin/')) && !path.slice(1).includes('.')) {
    req.url = '/admin/index.html' + (query ? `?${query}` : '')
  }
  next()
}

export default defineConfig(({ mode }) => {
  // Vercel 배포 빌드에 Supabase 값이 없으면 실패시킨다.
  // 값이 없으면 앱이 조용히 목업 모드(데모 계정·가짜 데이터)로 떠서, 직원이 목업에 등록하고 날리는 사고가 날 수 있다
  if (process.env.VERCEL) {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k])
    if (missing.length) throw new Error(`Vercel 환경변수가 없습니다: ${missing.join(', ')} (Project Settings → Environment Variables)`)
  }
  return {
    plugins: [
      vue(),
      {
        name: 'admin-spa-fallback',
        configureServer: (server) => { server.middlewares.use(adminFallback) },
        configurePreviewServer: (server) => { server.middlewares.use(adminFallback) },
      },
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      // 진입점 둘: / = 이용자용 메인, /admin = 업무 화면. 번들이 나뉘어 메인 방문자는 업무 화면 코드를 받지 않는다
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
        },
      },
    },
  }
})

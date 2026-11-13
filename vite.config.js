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

// 개발 서버에서만 화면 구석에 "지금 어느 데이터에 붙어 있는지" 표시(메인·업무 화면 둘 다).
//   npm run dev = 목업(기본), npm run dev:live = 실제 DB. 운영 중에는 개발하다 실제 데이터를 바꾸면 안 되므로
//   실제 DB일 때는 빨간색으로 눈에 띄게. 배포·빌드 미리보기(vite preview)에는 들어가지 않는다(apply: 'serve').
function dataSourceBadge(live) {
  const text = live ? '실제 DB 연결 중 · 여기서 바꾸면 실제 데이터가 바뀝니다 (npm run dev:live)' : '목업 데이터 (npm run dev)'
  const bg = live ? '#c62828' : '#555'
  return {
    name: 'data-source-badge',
    apply: 'serve',
    transformIndexHtml: () => [{
      tag: 'div',
      attrs: {
        'aria-hidden': 'true',
        // 클릭을 막지 않게(pointer-events: none)
        style: `position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;padding:4px 10px;border-radius:6px;background:${bg};color:#fff;font:600 12px/1.4 system-ui,sans-serif;opacity:.92`,
        class: 'dev-data-source',
      },
      children: text,
      injectTo: 'body',
    }, {
      // 라벨 인쇄 미리보기·출력물에 찍히지 않게
      tag: 'style',
      children: '@media print{.dev-data-source{display:none!important}}',
      injectTo: 'head',
    }],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const live = !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  // Vercel 배포 빌드에 Supabase 값이 없으면 실패시킨다.
  // 값이 없으면 앱이 조용히 목업 모드(데모 계정·가짜 데이터)로 떠서, 직원이 목업에 등록하고 날리는 사고가 날 수 있다
  if (process.env.VERCEL) {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k])
    if (missing.length) throw new Error(`Vercel 환경변수가 없습니다: ${missing.join(', ')} (Project Settings → Environment Variables)`)
  }
  // dev:live인데 .env.local이 없으면 조용히 목업으로 뜨지 않게 멈춘다(오늘 실제로 헷갈렸던 상황)
  if (process.env.npm_lifecycle_event === 'dev:live' && !live) {
    throw new Error('npm run dev:live에는 .env.local(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)이 필요합니다. .env.example을 복사해서 채우세요.')
  }
  return {
    plugins: [
      vue(),
      {
        name: 'admin-spa-fallback',
        configureServer: (server) => { server.middlewares.use(adminFallback) },
        configurePreviewServer: (server) => { server.middlewares.use(adminFallback) },
      },
      dataSourceBadge(live),
    ],
    resolve: {
      // @ = 업무 화면(src/), @site = 이용자용 메인(site/). 두 화면 코드를 섞지 않으려고 별칭을 나눴다
      alias: {
        '@site': fileURLToPath(new URL('./site', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      // 메인(site/)의 SCSS에만 해당(업무 화면은 순수 CSS). 공통 mixin을 모든 SCSS 파일에 넣는다
      preprocessorOptions: { scss: { additionalData: `@use "@site/styles/_globals";` } },
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

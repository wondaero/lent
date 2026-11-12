import { createApp } from 'vue';

import Core from './Core.vue';
import router from './configs/router';

import './styles/base.scss';

// 이용자용 메인(/). 업무 화면(/admin, src/main.js)과 번들이 나뉘어 있다.
// PWA(서비스 워커)는 쓰지 않는다: 같은 도메인의 /admin 까지 캐시가 끼어들 수 있어서
const app = createApp(Core);
app.use(router);
router.isReady().then(() => app.mount('#app'));

export default {
    // 글자 그대로 보여 줄 본문을 HTML 로 넣기 전에 특수문자를 바꿈
    escapeHtml(value: string) {
        return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    },
    // 본문 속 주소를 링크로 (escapeHtml 을 거친 문자열에 사용)
    linkify(value: string) {
        return value.replace(/(\bhttps?:\/\/[^\s<>"')\]]+)/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    },
};

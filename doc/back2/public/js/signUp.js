const pw1 = document.getElementById('pw1');
const pw2 = document.getElementById('pw2');

const form = document.getElementById('signUpForm');

form.addEventListener('submit', function(e) {
    if(pw1.value !== pw2.value) {
        e.preventDefault(); // 폼 제출 막기
        alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return false;
    }

// 일치하면 폼 제출됨
});

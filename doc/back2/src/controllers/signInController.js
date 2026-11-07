const jwt = require("jsonwebtoken");

// 서비스 불러오기
const signInService = require("../services/signInService");

async function signIn(req, res) {
  try {
    const user = await signInService.signIn(req.body);

    if (!user || !user.match || !user.id) {
      return res.status(401).send("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
    );
  
    // 세션 쿠키로 저장
    res.cookie("jwt", token, {
      httpOnly: true,   // JS에서 접근 불가 (XSS 방지)
      secure: false,    // HTTPS라면 true
      sameSite: "lax",  // CSRF 방지
    });

    res.redirect(process.env.ADMIN_URL);

  } catch (err) {
    console.error("signIn error:", err);
    res.status(500).json({ error: err.message });
  }
}


// 외부에서 사용할 함수 내보내기
module.exports = {
  signIn,
};

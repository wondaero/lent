// 서비스 불러오기
const signUpService = require("../services/signUpService");

async function signUp(req, res) {
  try {
    await signUpService.signUp(req.body);
    // res.redirect(`${process.env.CLIENT_URL2}`);
    res.redirect(`${process.env.LOGIN_URL}`);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// 외부에서 사용할 함수 내보내기
module.exports = {
  signUp,
};
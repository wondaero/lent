async function signIn(req, res) {
  try {
    res.render('signIn');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 외부에서 사용할 함수 내보내기
module.exports = {
  signIn,
};

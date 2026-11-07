async function signUp(req, res) {
  try {
    const { key } = req.query;

    const month = 'jfmamjjasond';
    const week = 'smtwtfs';

    const today = new Date();

    const todayKey = month[today.getMonth()] + week[today.getDay()];

    if(key === todayKey){
      res.render('signUp', { key });
    }else{
      res.status(404).send('잘못된 접근입니다.');
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 외부에서 사용할 함수 내보내기
module.exports = {
  signUp,
};

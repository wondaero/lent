// 서비스 불러오기
const loanService = require("../services/loanService");

async function getBookListByMember(req, res) {
  try {
    // const tmpParams = {
    //   id: req.params.id,
    //   filter: req.query.filter
    // }
    const tmpParams = {
      id: req.params.id,
      ...req.query
    }

    const books = await loanService.getBookListByMember(tmpParams);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMemberListByBook(req, res) {
  try {
    const tmpParams = {
      id: req.params.id,
      ...req.query
    }

    const members = await loanService.getMemberListByBook(tmpParams);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function addLoan(req, res) {
  try {
    const newLoan = req.body.params; // 클라이언트가 보낸 데이터
    const created = await loanService.addLoan(newLoan);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateBook(req, res) {
  try {
    const updatedBook = req.body.params; // 클라이언트가 보낸 데이터
    const updated = await loanService.updateBook(req.params.id, updatedBook); // 서비스에서 처리
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// 외부에서 사용할 함수 내보내기
module.exports = {
  getBookListByMember,
  getMemberListByBook,
  addLoan,
  updateBook,
};

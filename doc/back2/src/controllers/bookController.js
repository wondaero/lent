// 서비스 불러오기
const bookService = require("../services/bookService");

async function getBookList(req, res) {
  try {
    const books = await bookService.getBookList(req.query);
    res.json(books);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBookDetail(req, res) {
  try {
    const book = await bookService.getBookDetail(req.params.id);
    res.json(book);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addBook(req, res) {
  try {
    const newBook = req.body.params; // 클라이언트가 보낸 데이터
    const created = await bookService.addBook(newBook);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateBook(req, res) {
  try {
    const updatedBook = req.body.params; // 클라이언트가 보낸 데이터
    const updated = await bookService.updateBook(req.params.id, updatedBook); // 서비스에서 처리
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteBook(req, res) {
  try {
    const deleted = await bookService.deleteBook(req.params.id); // 서비스에서 처리
    res.status(201).json(deleted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}








// 외부에서 사용할 함수 내보내기
module.exports = {
    getBookList,
    getBookDetail,
    addBook,
    updateBook,
    deleteBook,
};

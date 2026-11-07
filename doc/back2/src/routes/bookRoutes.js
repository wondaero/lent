const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// 도서 전체 목록
router.get("/", bookController.getBookList);

// 도서 상세 조회
router.get("/:id", bookController.getBookDetail);

// 도서 추가
router.post("/", bookController.addBook);

// 도서 수정
router.patch("/:id", bookController.updateBook);

// 멤버 삭제
router.delete("/:id", bookController.deleteBook);

module.exports = router;

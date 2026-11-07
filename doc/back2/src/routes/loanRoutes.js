const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");

router.get("/member/:id", loanController.getBookListByMember);
router.get("/book/:id", loanController.getMemberListByBook);

//대여책 등룍
router.post("/", loanController.addLoan);

//수정(반납, 대여기간)
router.get("/:id", loanController.updateBook);

// // 멤버 상세 조회
// router.get("/:id", loanController.getMemberDetail);

// // 멤버 수정
// router.put("/:id", loanController.updateMember);

// // 멤버 삭제
// router.delete("/:id", loanController.deleteMember);

module.exports = router;

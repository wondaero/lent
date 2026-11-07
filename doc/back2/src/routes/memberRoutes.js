const express = require("express");
const router = express.Router();
const memberController = require("../controllers/memberController");

// 멤버 전체 목록
router.get("/", memberController.getMemberList);

// 멤버 상세 조회
router.get("/:id", memberController.getMemberDetail);

// 멤버 추가
router.post("/", memberController.addMember);

// 멤버 수정
router.patch("/:id", memberController.updateMember);

// 멤버 삭제
router.delete("/:id", memberController.deleteMember);

module.exports = router;

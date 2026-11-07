const express = require("express");
const router = express.Router();
const signInController = require("../controllers/signInController");

// 회원 조회
router.post("/", signInController.signIn);


module.exports = router;

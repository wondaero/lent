const express = require("express");
const router = express.Router();
const signUpController = require("../controllers/signUpController");

// 회원 추가
router.post("/", signUpController.signUp);


module.exports = router;

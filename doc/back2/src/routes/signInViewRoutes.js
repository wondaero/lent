const express = require("express");
const router = express.Router();
const signInViewController = require("../controllers/signInViewController");

// 회원 추가
router.get("/", signInViewController.signIn);

module.exports = router;

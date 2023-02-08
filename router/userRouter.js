const express = require("express");
const router = express.Router();
const { register, login, updateProfile } = require("../controller/user");

const {checkEmailAndNumber} = require("../utils/helper")



// Register User
router.post("/register", register);

router.post("/login", login)

router.post("/login", updateProfile)

module.exports = router;
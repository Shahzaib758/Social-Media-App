const express = require("express");
const router = express.Router();
const { getUser,
    register,
    login,
    updateUser,
    updateProfilePicture,
    sendRequest,
    responceRequest,
    blockUser } = require("../controller/user");

const { verifationToken } = require("../utils/helper")


// Register User
router.get("/", verifationToken, getUser)

router.post("/register", register);

router.post("/login", login)

router.put("/updateUser", verifationToken, updateUser);

router.put('/updateProfilePicture', verifationToken, updateProfilePicture);

router.put('/send/request', verifationToken, sendRequest);

router.put('/respone/request', verifationToken, responceRequest);

router.put('/block/user', verifationToken, blockUser);

module.exports = router;
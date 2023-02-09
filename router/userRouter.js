const express = require("express");
const router = express.Router();
const {
    getUser,
    registerUser,
    login,
    updateUser,
    updateProfilePicture,
    sendRequest,
    responceRequest,
    blockUser,
    friendsList,
    blockList,
    unfriend,
    unblock
} = require("../controller/user");

const { verifationToken } = require("../utils/helper")


router.get("/", verifationToken, getUser)

router.post("/register", registerUser);

router.post("/login", login)

router.put("/updateUser", verifationToken, updateUser);

router.put('/updateProfilePicture', verifationToken, updateProfilePicture);

router.put('/send/request', verifationToken, sendRequest);

router.put('/respone/request', verifationToken, responceRequest);

router.put('/block/user', verifationToken, blockUser);

router.get('/friends', verifationToken, friendsList);

router.get('/blocks', verifationToken, blockList);

router.put('/unfriend', verifationToken, unfriend);

router.put('/unblock', verifationToken, unblock);

module.exports = router;
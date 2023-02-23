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
    unblock,
    pendingRequestList,
    suggestUsers,
} = require("../controller/user");

const { verifationToken } = require("../utils/helper")

router.post("/register", registerUser); // Register User
router.post("/login", login) // Login User
router.put("/updateUser", verifationToken, updateUser); // Update User's Details
router.put('/updateProfilePicture', verifationToken, updateProfilePicture); // Update User's Profile 
router.put('/send/request', verifationToken, sendRequest); // Sending Request to other User
router.put('/respone/request', verifationToken, responceRequest); // Responding on a friend request
router.put('/block/user', verifationToken, blockUser); // Block other User
router.get("/:id", verifationToken, getUser) // Get Single User
router.get("/friends/list", verifationToken, friendsList)
router.get('/friends',); // Get friends list
router.get('/block/list', verifationToken, blockList); // Get Blocked users List
router.get('/pendingRequest/list', verifationToken, pendingRequestList); // Get Pending Request List
router.put('/unfriend', verifationToken, unfriend); // Unfriend User
router.put('/unblock', verifationToken, unblock); // Unblock User
router.get('/users/suggested', verifationToken, suggestUsers);// Suggest Users


module.exports = router;
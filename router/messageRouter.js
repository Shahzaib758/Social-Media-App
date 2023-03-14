const router = require("express").Router();
const {
    sendMessage,
    fetchMessage,
} = require("../controller/message");
const { verifationToken } = require("../utils/helper");

// Route to send the message to the recipient
router.route("/").post(verifationToken, sendMessage);
// Route to retrieve all the message
router.route("/:chatId").get(verifationToken, fetchMessage);

module.exports = router;

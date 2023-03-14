const router = require("express").Router();
const {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} = require("../controller/chat");
const { verifationToken } = require("../utils/helper");

router.route("/").post(verifationToken, accessChat).get(verifationToken, fetchChats);

module.exports = router;

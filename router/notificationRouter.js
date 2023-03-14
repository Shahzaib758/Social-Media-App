const router = require("express").Router();
const {
    addNewNotification,
    deleteNotification,
    getNotification,
} = require("../controller/notification");
const { verifationToken } = require("../utils/helper");

router.route("/").post(verifationToken, addNewNotification).get(verifationToken, getNotification);
router.route("/:notificationId").delete(verifationToken, deleteNotification);

module.exports = router;

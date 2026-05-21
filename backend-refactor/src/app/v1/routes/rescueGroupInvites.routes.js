const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireRoles } = require("../../../middleware/requireRoles");
const ctrl = require("../controllers/rescueGroup.controller");

const router = express.Router();

router.post("/:id/accept", verifyToken, requireRoles(["rescuer"]), ctrl.acceptInvite);
router.post("/:id/decline", verifyToken, requireRoles(["rescuer"]), ctrl.declineInvite);

module.exports = router;

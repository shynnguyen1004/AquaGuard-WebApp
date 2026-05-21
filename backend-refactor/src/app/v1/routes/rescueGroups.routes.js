const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireRoles, requireAdmin } = require("../../../middleware/requireRoles");
const ctrl = require("../controllers/rescueGroup.controller");

const router = express.Router();

router.get("/all", verifyToken, requireAdmin, ctrl.listAll);
router.get("/my", verifyToken, requireRoles(["rescuer", "admin"]), ctrl.getMine);
router.post("/", verifyToken, requireRoles(["rescuer"]), ctrl.create);
router.post("/:id/invite", verifyToken, requireRoles(["rescuer"]), ctrl.invite);
router.get("/:id/stats", verifyToken, requireRoles(["rescuer", "admin"]), ctrl.stats);
router.put("/:id", verifyToken, requireRoles(["rescuer"]), ctrl.edit);
router.put(
  "/:id/members/:userId/role",
  verifyToken,
  requireRoles(["rescuer"]),
  ctrl.changeMemberRole
);
router.delete(
  "/:id/members/:userId",
  verifyToken,
  requireRoles(["rescuer"]),
  ctrl.removeMember
);
router.post("/:id/leave", verifyToken, requireRoles(["rescuer"]), ctrl.leave);
router.delete("/:id", verifyToken, requireRoles(["rescuer"]), ctrl.disband);

module.exports = router;

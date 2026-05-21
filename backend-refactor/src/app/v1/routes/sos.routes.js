const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireRoles, requireAdmin } = require("../../../middleware/requireRoles");
const { upload } = require("../../../utils/upload");
const ctrl = require("../controllers/sos.controller");

const router = express.Router();

router.post("/", verifyToken, requireRoles(["citizen"]), upload.array("images", 5), ctrl.create);
router.get("/my", verifyToken, ctrl.listMine);
router.get("/all", verifyToken, requireRoles(["citizen", "rescuer", "admin"]), ctrl.listAll);
router.get("/team", verifyToken, requireRoles(["rescuer"]), ctrl.listTeam);
router.get("/stats", verifyToken, ctrl.stats);
router.put("/:id/assign", verifyToken, requireAdmin, ctrl.assign);
router.put("/:id/accept", verifyToken, requireRoles(["rescuer"]), ctrl.accept);
router.put("/:id/cancel", verifyToken, requireRoles(["rescuer"]), ctrl.cancel);
router.put("/:id/complete", verifyToken, ctrl.complete);

module.exports = router;

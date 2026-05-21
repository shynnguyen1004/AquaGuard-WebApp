const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireAdmin } = require("../../../middleware/requireRoles");
const ctrl = require("../controllers/users.controller");

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get("/", ctrl.list);
router.put("/:id/role", ctrl.updateRole);

module.exports = router;

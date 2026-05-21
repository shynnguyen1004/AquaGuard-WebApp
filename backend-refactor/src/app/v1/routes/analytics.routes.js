const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireAdmin } = require("../../../middleware/requireRoles");
const ctrl = require("../controllers/analytics.controller");

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get("/overview", ctrl.overview);
router.get("/users", ctrl.users);
router.get("/rescue", ctrl.rescue);

module.exports = router;

const express = require("express");
const verifyToken = require("../../../middleware/auth");
const { requireRoles } = require("../../../middleware/requireRoles");
const ctrl = require("../controllers/rescuers.controller");

const router = express.Router();

router.get("/", verifyToken, requireRoles(["admin", "rescuer"]), ctrl.list);

module.exports = router;

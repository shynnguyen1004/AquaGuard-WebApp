const express = require("express");
const verifyToken = require("../../../middleware/auth");
const ctrl = require("../controllers/profile.controller");

const router = express.Router();

router.use(verifyToken);

router.get("/", ctrl.get);
router.put("/", ctrl.update);

module.exports = router;

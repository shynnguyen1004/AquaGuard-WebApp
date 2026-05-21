const express = require("express");

const router = express.Router();

// NOTE: Sub-paths under /auth/* mount BEFORE the generic /auth router so Express
// reaches them first. The /auth router itself only owns /register, /login,
// /forgot-password, /verify-otp, /reset-password, so order is defensive — not strict.
router.use("/auth/users", require("./users.routes"));
router.use("/auth/rescuers", require("./rescuers.routes"));
router.use("/auth/profile", require("./profile.routes"));
router.use("/auth/rescue-groups", require("./rescueGroups.routes"));
router.use("/auth/rescue-group-invites", require("./rescueGroupInvites.routes"));
router.use("/auth", require("./auth.routes"));

router.use("/sos", require("./sos.routes"));
router.use("/family", require("./family.routes"));
router.use("/analytics", require("./analytics.routes"));

module.exports = router;

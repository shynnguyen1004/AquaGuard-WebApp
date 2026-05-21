const express = require("express");
const verifyToken = require("../../../middleware/auth");
const ctrl = require("../controllers/family.controller");

const router = express.Router();

router.use(verifyToken);

router.get("/search", ctrl.search);
router.post("/request", ctrl.createRequest);
router.get("/requests", ctrl.listRequests);
router.put("/requests/:id/accept", ctrl.acceptRequest);
router.put("/requests/:id/reject", ctrl.rejectRequest);
router.get("/members", ctrl.listMembers);
router.delete("/members/:connectionId", ctrl.deleteMember);
router.put("/status", ctrl.updateStatus);
router.put("/location", ctrl.updateLocation);

module.exports = router;

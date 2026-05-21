const express = require("express");
const limiters = require("../../../inits/rateLimiters");
const authCtrl = require("../controllers/auth.controller");
const passwordCtrl = require("../controllers/password.controller");

const router = express.Router();

router.post("/register", limiters.authRegister, authCtrl.register);
router.post("/login", limiters.authLogin, authCtrl.login);
router.post("/forgot-password", limiters.forgotPassword, passwordCtrl.forgotPassword);
router.post("/verify-otp", passwordCtrl.verifyOtp);
router.post("/reset-password", passwordCtrl.resetPassword);

module.exports = router;

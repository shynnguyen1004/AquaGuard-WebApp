const twilio = require("twilio");
const env = require("./env");

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const VERIFY_SERVICE_SID = env.TWILIO_VERIFY_SERVICE_SID;

module.exports = { twilioClient, VERIFY_SERVICE_SID };

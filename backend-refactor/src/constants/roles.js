// Role constants — keep in sync with frontend/src/config/rbac.js.
const ROLES = Object.freeze({ CITIZEN: "citizen", RESCUER: "rescuer", ADMIN: "admin" });
const GROUP_ROLES = Object.freeze({ LEADER: "leader", CO_LEADER: "co_leader", MEMBER: "member" });
module.exports = { ROLES, GROUP_ROLES };

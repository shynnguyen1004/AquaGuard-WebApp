import { ROLES } from "../../config/rbac";

function step({ target, mobileTarget = null, titleKey, contentKey, icon, placement = "right", disableBeacon = true, kind = "step", autoOpen = false, skipAutoClick = false, closeOnNext = null }) {
  return { target, mobileTarget, titleKey, contentKey, icon, placement, disableBeacon, kind, autoOpen, skipAutoClick, closeOnNext };
}

const citizenSteps = [
  step({
    target: "body",
    titleKey: "tour.citizen.welcome.title",
    contentKey: "tour.citizen.welcome.content",
    icon: "waving_hand",
    placement: "center",
    kind: "welcome",
  }),
  step({
    target: '[data-tour="nav-dashboard"]',
    titleKey: "tour.citizen.dashboard.title",
    contentKey: "tour.citizen.dashboard.content",
    icon: "dashboard",
  }),
  step({
    target: '[data-tour="nav-map"]',
    titleKey: "tour.citizen.map.title",
    contentKey: "tour.citizen.map.content",
    icon: "map",
  }),
  step({
    target: '[data-tour="map-weather"]',
    titleKey: "tour.citizen.mapWeather.title",
    contentKey: "tour.citizen.mapWeather.content",
    icon: "layers",
    placement: "left",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="map-family"]',
    titleKey: "tour.citizen.mapFamily.title",
    contentKey: "tour.citizen.mapFamily.content",
    icon: "group",
    placement: "left",
  }),
  step({
    target: '[data-tour="map-locate"]',
    titleKey: "tour.citizen.mapLocate.title",
    contentKey: "tour.citizen.mapLocate.content",
    icon: "my_location",
    placement: "left",
  }),
  step({
    target: '[data-tour="map-floodzones"]',
    titleKey: "tour.citizen.mapFloodZones.title",
    contentKey: "tour.citizen.mapFloodZones.content",
    icon: "flood",
    placement: "left",
  }),
  step({
    target: '[data-tour="nav-sos"]',
    titleKey: "tour.citizen.sos.title",
    contentKey: "tour.citizen.sos.content",
    icon: "sos",
  }),
  step({
    target: '[data-tour="sos-send"]',
    titleKey: "tour.citizen.sosSend.title",
    contentKey: "tour.citizen.sosSend.content",
    icon: "add_circle",
    placement: "bottom",
    autoOpen: true,
  }),
  step({
    target: '[data-tour="sos-location"]',
    titleKey: "tour.citizen.sosLocation.title",
    contentKey: "tour.citizen.sosLocation.content",
    icon: "location_on",
    placement: "right",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="sos-description"]',
    titleKey: "tour.citizen.sosDescription.title",
    contentKey: "tour.citizen.sosDescription.content",
    icon: "description",
    placement: "right",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="sos-urgency"]',
    titleKey: "tour.citizen.sosUrgency.title",
    contentKey: "tour.citizen.sosUrgency.content",
    icon: "priority_high",
    placement: "right",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="sos-images"]',
    titleKey: "tour.citizen.sosImages.title",
    contentKey: "tour.citizen.sosImages.content",
    icon: "photo_camera",
    placement: "right",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="sos-submit"]',
    titleKey: "tour.citizen.sosSubmit.title",
    contentKey: "tour.citizen.sosSubmit.content",
    icon: "send",
    placement: "top",
    skipAutoClick: true,
    closeOnNext: '[data-tour="sos-close"]',
  }),
  step({
    target: '[data-tour="nav-safety"]',
    titleKey: "tour.citizen.safety.title",
    contentKey: "tour.citizen.safety.content",
    icon: "shield_with_heart",
  }),
  step({
    target: '[data-tour="chatbot-button"]',
    mobileTarget: '[data-tour="chatbot-mobile"]',
    titleKey: "tour.citizen.chatbot.title",
    contentKey: "tour.citizen.chatbot.content",
    icon: "smart_toy",
    placement: "left",
  }),
  step({
    target: '[data-tour="nav-settings"]',
    mobileTarget: '[data-tour="profile-mobile"]',
    titleKey: "tour.citizen.settings.title",
    contentKey: "tour.citizen.settings.content",
    icon: "settings",
  }),
  step({
    target: "body",
    titleKey: "tour.citizen.finish.title",
    contentKey: "tour.citizen.finish.content",
    icon: "rocket_launch",
    placement: "center",
    kind: "finish",
  }),
];

const rescuerSteps = [
  step({
    target: "body",
    titleKey: "tour.rescuer.welcome.title",
    contentKey: "tour.rescuer.welcome.content",
    icon: "waving_hand",
    placement: "center",
    kind: "welcome",
  }),
  step({
    target: '[data-tour="nav-rescue"]',
    titleKey: "tour.rescuer.rescue.title",
    contentKey: "tour.rescuer.rescue.content",
    icon: "emergency",
  }),
  step({
    target: '[data-tour="nav-rescuer-missions"]',
    titleKey: "tour.rescuer.missions.title",
    contentKey: "tour.rescuer.missions.content",
    icon: "assignment_ind",
  }),
  step({
    target: '[data-tour="nav-rescuer-team"]',
    titleKey: "tour.rescuer.team.title",
    contentKey: "tour.rescuer.team.content",
    icon: "groups",
  }),
  step({
    target: '[data-tour="nav-map"]',
    titleKey: "tour.rescuer.map.title",
    contentKey: "tour.rescuer.map.content",
    icon: "map",
  }),
  step({
    target: '[data-tour="map-weather"]',
    titleKey: "tour.rescuer.mapWeather.title",
    contentKey: "tour.rescuer.mapWeather.content",
    icon: "layers",
    placement: "left",
    skipAutoClick: true,
  }),
  step({
    target: '[data-tour="map-locate"]',
    titleKey: "tour.rescuer.mapLocate.title",
    contentKey: "tour.rescuer.mapLocate.content",
    icon: "my_location",
    placement: "left",
  }),
  step({
    target: '[data-tour="map-floodzones"]',
    titleKey: "tour.rescuer.mapFloodZones.title",
    contentKey: "tour.rescuer.mapFloodZones.content",
    icon: "flood",
    placement: "left",
  }),
  step({
    target: '[data-tour="nav-settings"]',
    mobileTarget: '[data-tour="profile-mobile"]',
    titleKey: "tour.rescuer.settings.title",
    contentKey: "tour.rescuer.settings.content",
    icon: "settings",
  }),
  step({
    target: "body",
    titleKey: "tour.rescuer.finish.title",
    contentKey: "tour.rescuer.finish.content",
    icon: "rocket_launch",
    placement: "center",
    kind: "finish",
  }),
];

export function getStepsForRole(role) {
  if (role === ROLES.CITIZEN) return citizenSteps;
  if (role === ROLES.RESCUER) return rescuerSteps;
  return [];
}

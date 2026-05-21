// Broadcast a JSON message to every client in a tracking room.
// `req` provides access to the app-level trackingRooms map.
function broadcastToRoom(req, requestId, message) {
  const trackingRooms = req.app.get("trackingRooms");
  if (!trackingRooms || !trackingRooms.has(requestId)) return;

  const payload = JSON.stringify(message);
  const room = trackingRooms.get(requestId);
  room.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

module.exports = broadcastToRoom;

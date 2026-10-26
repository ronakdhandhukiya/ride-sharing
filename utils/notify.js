
function notifyUser(io, userId, eventName, data) {
  io.to(String(userId)).emit(eventName, data);
}

module.exports = notifyUser

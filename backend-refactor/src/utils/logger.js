// TODO[scaffold]: lightweight logger (info/warn/error). Replaces direct console.* to allow silencing in prod.
module.exports = {
  info: (...a) => console.log(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a),
};

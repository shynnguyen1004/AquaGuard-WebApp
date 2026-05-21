// Wraps async route handlers so thrown errors go to errorHandler (fixes bug #24: repeated try/catch).
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

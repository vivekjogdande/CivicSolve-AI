class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (m, d) => new ApiError(400, m, d);
const unauthorized = (m = 'Authentication required') => new ApiError(401, m);
const forbidden = (m = 'You do not have permission to do this') => new ApiError(403, m);
const notFound = (m = 'Not found') => new ApiError(404, m);
const conflict = (m) => new ApiError(409, m);
const serviceUnavailable = (m = 'Service temporarily unavailable') => new ApiError(503, m);

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, serviceUnavailable, asyncHandler };


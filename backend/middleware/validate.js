const { badRequest } = require('../utils/errors');

/** validate(zodSchema, 'body' | 'query' | 'params') — replaces the source with the parsed, trimmed result. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] || {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest(details[0] ? `${details[0].field ? details[0].field + ': ' : ''}${details[0].message}` : 'Invalid request', details));
  }
  req[source] = result.data;
  next();
};

module.exports = { validate };

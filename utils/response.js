export function success(
  res,
  statusCode = 200,
  message = "OK",
  object = null,
  extras = {}
) {
  const body = {
    success: true,
    message,
    object,
    errors: null,
    ...extras,
  };
  return res.status(statusCode).json(body);
}

export function fail(
  res,
  statusCode = 400,
  message = "Bad Request",
  errors = []
) {
  return res.status(statusCode).json({
    success: false,
    message,
    object: null,
    errors: Array.isArray(errors) ? errors : [errors],
  });
}

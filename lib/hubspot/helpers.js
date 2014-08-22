/**
 * Recursively encode an object as application/x-www-form-urlencoded.
 *
 * @param value Value to encode
 * @param key Key to encode (not required for top-level objects)
 * @return Encoded object
 */
exports.serialize = function serialize(value, key) {

  var output;

  if (!key && key !== 0)
    key = '';

  if (Array.isArray(value)) {
    output = [];
    value.forEach(function (val, index) {
      if (key !== '') index = key + '[' + index + ']';
      output.push(serialize(val, index));
    }, this);
    return output.join('&');
  } else if (typeof(value) == 'object') {
    output = [];
    for (var name in value) {
      if (value[name] && value.hasOwnProperty(name)) {
        output.push(serialize(value[name], key !== '' ? key + '[' + name + ']' : name));
      }
    }
    return output.join('&');
  } else {
    return key + '=' + encodeURIComponent(value);
  }

};

exports.unique = function (array) {
  var unique = [];
  array.forEach(function (item) {
    if (unique.indexOf(array[i]) == -1) unique.push(array[i]);
  });
  return unique;
};


exports.isAnError = function (statusCode) {
  return parseInt(statusCode / 100, 10) !== 2 ? true : false;
}

/**
 * Creates an Error with information received from hubspot. In addition to an
 * error message it also includes an error code.
 *
 *
 * @param message The error message
 * @param code The error code
 * @return Instance of {@link Error}
 */
exports.createHubspotError = function createHubspotError(errorBody, code) {
  var error,
    requestId,
    message,
    status;

  status = errorBody.status;
  message = errorBody.message;
  requestId = errorBody.requestId;

  error = new Error(message || '');

  if (message) {
    error.message = message;
  }

  if (code) {
    error.code = code;
    error.statusCode = code;
  }

  if (requestId) {
    error.requestId = requestId;
    error.request_id = requestId;
  }
  return error;
};
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

exports.isAnError = function (statusCode) {
  return parseInt(statusCode / 100, 10) !== 2 ? true : false;
};

/**
 * Creates an Error with information received from hubspot. In addition to an
 * error message it also includes an error code.
 *
 * @param {string | Object} errorBody The response body.  Might be JSON, unparsed JSON, or just HTML string
 * @param {number} code The HTTP response error code
 * @return Instance of {@link Error}
 */
exports.createHubspotError = function createHubspotError(errorBody, code) {
  var errorBodyJSON;

  if (typeof errorBody === 'string') {
    try {
      errorBodyJSON = JSON.parse(errorBody);
    } catch (e) {

      // Strip away all `<TAG></TAG>` tags from what is likely to be an HTML body
      var htmlBody = errorBody.match(/<body>(.*?)<\/body>/i);
      if (htmlBody && htmlBody[0]) {
        errorBody = htmlBody[0].replace(/(<([^>]+)>)/ig, ' ').replace(/\s\s+/g, ' ');
      }
    }
  } else if (Buffer.isBuffer(errorBody)) {
    errorBodyJSON = JSON.parse(errorBody.toString());
  } else if (typeof errorBody === 'object') {
    errorBodyJSON = errorBody;
  }

  var requestId = errorBodyJSON && errorBodyJSON.requestId;
  var message = (errorBodyJSON && errorBodyJSON.message) || errorBody;
  var status = errorBodyJSON && errorBodyJSON.status;
  var errorType = errorBodyJSON && errorBodyJSON.error;
  var errorDescription = errorBodyJSON && errorBodyJSON.error_description;

  var error = new Error(message, code);
  error.status = status;

  if (code) {
    error.code = code;
    error.statusCode = code;
  }

  if (requestId) {
    error.requestId = requestId;
  }

  if (errorDescription) {
    error.message = errorDescription;
    error.status = errorType;
  }

  return error;
};

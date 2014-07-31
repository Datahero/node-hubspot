var http = require('http'),
    request = require('request'),
    helpers = require('./helpers');

/**
 * hubspot API wrapper for the API version 3. This object should not be
 * instantiated directly but by using the version wrapper {@link hubspotAPI}.
 *
 * @param options Configuration options
 * @return Instance of {@link hubspotAPI}
 */
function hubspotAPI(options) {

  if (!options) {
    throw new Error('Something went wrong, API requires: {token: YOUR_TOKEN}');
  } else if (!options.token) {
    throw new Error('You have to provide a token for this to work.');
  }

  this.httpUri     = 'https://api.hubapi.com';
  this.token       = options.token;
  this.DEBUG       = options.DEBUG || false;
  this.contentType = options.contentType || 'application/json';
  this.userAgent   = options.userAgent || 'node-hubspot/' + this.version;
}

module.exports = hubspotAPI;

/**
 * Sends a given request as a JSON object to the hubspot API and finally
 * calls the given callback function with the resulting JSON object. This
 * method should not be called directly but will be used internally by all API
 * methods defined.
 *
 * @param resource hubspot API resource to call
 * @param method hubspot API method to call
 * @param availableParams Parameters available for the specified API method
 * @param givenParams Parameters to call the hubspot API with
 * @param callback Callback function to call on success
 */
hubspotAPI.prototype.execute = function (verb, resource, method, availableParams, givenParams, callback) {
  if (!verb) {
    verb = "GET";
  }
  var headers = {
    "Content-Type": this.contentType,
    "Authorization":  'Bearer ' + this.token,
    "User-Agent": this.userAgent
  };

  var uri = this.httpUri + '/' + this.version + '/' + resource + '/' + method;

  var finalParams = {};
  var currentParam;

  for (var i = 0; i < availableParams.length; i++) {
    currentParam = availableParams[i];
    if (typeof givenParams[currentParam] !== 'undefined')
      finalParams[currentParam] = givenParams[currentParam];
  }

  if (this.DEBUG){
    console.log("uri", uri);
    console.log("verb", verb);
    console.log("headers", headers);
    console.log("finalParams", finalParams);
  }
  request({
    uri: uri,
    method: verb,
    headers: headers,
    body: JSON.stringify(finalParams)
  }, function (error, response, body) {
    var parsedResponse;
    if (error) {
      return callback(new Error('Unable to connect to the hubspot API endpoint.'));
    } else {

      try {
        parsedResponse = JSON.parse(body);
      } catch (error) {
        return callback(new Error('Error parsing JSON answer from hubspot API.'));
      }

      if (parsedResponse.error) {
        return callback(helpers.createhubspotError(parsedResponse));
      }

      return callback(null, parsedResponse);

    }
  });

};

hubspotAPI.prototype.get = function (resource, method, availableParams, givenParams, callback) {
  this.execute("GET", resource, method, availableParams, givenParams, callback);
};

hubspotAPI.prototype.post = function (resource, method, availableParams, givenParams, callback) {
  this.execute("POST", resource, method, availableParams, givenParams, callback);
};



/*****************************************************************************/
/************************* EVENT Related Methods **************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* SOURCES Related Methods **************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* PAGES Related Methods **************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* CONTACTS Related Methods **************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* PROPECTS Related Methods **************************/
/*****************************************************************************/

var http = require('http'),
  request = require('request'),
  helpers = require('./helpers'),
  versions = require('./versions');

/**
 * hubspot API wrapper for the API version 3. This object should not be
 * instantiated directly but by using the version wrapper {@link hubspotAPI}.
 *
 * @param options Configuration options
 * @return Instance of {@link hubspotAPI}
 */
function hubspotAPI(options) {

  if (!options) {
    throw new Error('You have to provide a authentication details for this to work.');
  } else if (!options.api_key && !options.oauthToken) {
    throw new Error('Something went wrong, API requires api_key or oauth_token', {
      api_key: options.api_key,
      oauthToken: options.oauthToken
    });
  }

  if (options.api_key) {
    this.api_key = options.api_key;
  }

  if (options.oauth_token) {
    this.oauth_token = options.oauth_token;
  }

  this.httpUri = 'https://api.hubapi.com';
  this.DEBUG = options.DEBUG || false;
  this.contentType = options.contentType || 'application/json';
  this.userAgent = options.userAgent || 'node-hubspot';
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
hubspotAPI.prototype.execute = function (verb, path, availableParams, givenParams, callback) {
  var self = this,
    headers,
    uri,
    body,
    finalParams,
    currentParam,
    parsedResponse;

  if (!verb) {
    verb = "GET";
  }
  headers = {
    "Content-Type": this.contentType,
    "User-Agent": this.userAgent
  };

  uri = this.httpUri + '/' + path;

  finalParams = {};
  currentParam;

  for (var i = 0; i < availableParams.length; i++) {
    currentParam = availableParams[i];
    if (typeof givenParams[currentParam] !== 'undefined')
      finalParams[currentParam] = givenParams[currentParam];
  }

  /**
   * For OAuth: &access_token=TOKEN
   * For API Keys: &hapikey=KEY
   * @see http://developers.hubspot.com/auth/oauth_overview
   */

  if (this.api_key) {
    finalParams.hapikey = this.api_key;
  }

  if (this.oauth_token) {
    finalParams.access_token = this.oauth_token;
  }

  if (this.DEBUG) {
    console.log("uri", uri);
    console.log("verb", verb);
    console.log("headers", headers);
    console.log("finalParams", finalParams);
  }

  request({
    uri: uri,
    method: verb,
    headers: headers,
    qs: finalParams
  }, function (error, res, body) {

    if (self.DEBUG) {
      console.log("error", error);
      console.log("res statusCode", res.statusCode);
      console.log("body", body);
    }
    if (error) {
      return callback(new Error('Unable to connect to the hubspot API endpoint.'));
    }

    try {
      parsedResponse = JSON.parse(body);
    } catch (error) {
      return callback(new Error('Error parsing JSON answer from hubspot API.'));
    }

    if (parsedResponse.status === "error") {
      return callback(helpers.createHubspotError(parsedResponse, res.statusCode));
    }

    return callback(null, parsedResponse);
  });

};

hubspotAPI.prototype.get = function (path, availableParams, givenParams, callback) {
  this.execute("GET", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.post = function (resource, method, availableParams, givenParams, callback) {
  this.execute("POST", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.put = function (path, availableParams, givenParams, callback) {
  this.execute("PUT", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.patch = function (path, availableParams, givenParams, callback) {
  this.execute("PATCH", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.delete = function (path, availableParams, givenParams, callback) {
  this.execute("delete", path, availableParams, givenParams, callback);
};


/*****************************************************************************/
/************************* EVENT Methods *************************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* SOURCES Methods ***********************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* PAGES Methods *************************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* CONTACTS Methods **********************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* PROPECTS Methods **********************************/
/*****************************************************************************/

/*****************************************************************************/
/************************* SETTINGS Methods **********************************/
/*****************************************************************************/

hubspotAPI.prototype.settings = function (params, callback) {
  var verb = params.verb ? params.verb : "get";

  var path = "settings/v1/settings",
    availableParams = [
      "sm",
      "name",
      "value",
      "domains",
      "readOnly"
    ];

  this[verb](path, availableParams, params, callback);
}
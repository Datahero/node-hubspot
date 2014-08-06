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
    parsedResponse,
    requestOptions;

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

  requestOptions = {
    uri: uri,
    method: verb,
    headers: headers,
    qs: finalParams
  };

  if (verb === "POST") {
    requestOptions.form = finalParams;
  }

  request(requestOptions, function (error, res, body) {
    if (self.DEBUG) {
      console.log("error", error);
      console.log("res statusCode", res.statusCode);
      console.log("body", body);
    }
    if (error) {
      return callback(new Error('Unable to connect to the hubspot API endpoint.'));
    }

    if (helpers.isAnError(res.statusCode)) {
      return callback(helpers.createHubspotError(body, res.statusCode));
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

hubspotAPI.prototype.post = function (path, availableParams, givenParams, callback) {
  this.execute("POST", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.put = function (path, availableParams, givenParams, callback) {
  this.execute("PUT", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.patch = function (path, availableParams, givenParams, callback) {
  this.execute("PATCH", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.delete = function (path, availableParams, givenParams, callback) {
  this.execute("DELETE", path, availableParams, givenParams, callback);
};


/*****************************************************************************/
/************************* EVENT Methods *************************************/
/*****************************************************************************/


// un-published API endpoint.
hubspotAPI.prototype.event_completions = function (params, callback) {
  var path = "analytics/v2/event/completions/total",
    availableParams = [
      "offset"
    ];

  this.post(path, availableParams, params, callback);
}


hubspotAPI.prototype.events = function (params, callback) {
  var path = "reports/v1/events",
    availableParams = [];

  this.get(path, availableParams, params, callback);
}


/*****************************************************************************/
/************************* SOURCES Methods ***********************************/
/*****************************************************************************/

// un-published API endpoint.
hubspotAPI.prototype.sources_daily = function (params, callback) {
  var path = "analytics/v2/sources/summary/daily",
    availableParams = [];

  this.get(path, availableParams, params, callback);
}

/*****************************************************************************/
/************************* PAGES Methods *************************************/
/*****************************************************************************/


/*****************************************************************************/
/************************* CONTACTS Methods **********************************/
/*****************************************************************************/


/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_statistics = function (params, callback) {
  var path = "contacts/v1/contacts/statistics",
    availableParams = [];
  this.get(path, availableParams, params, callback);
}


/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * contacts/v1/lists/all/contacts/all
 * @param params
 * @param callback
 */
hubspotAPI.prototype.all_contacts = function (params, callback) {
  var path = "contacts/v1/lists/all/contacts/all",
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.get(path, availableParams, params, callback);
}


/**
 * contacts/v1/properties
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_properties = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/properties",
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.get(path, availableParams, params, callback);
}


/**
 * contacts/v1/forms and contacts/v2/forms
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_forms = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/forms",
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.get(path, availableParams, params, callback);
}


/*****************************************************************************/
/************************* LEADS Methods *************************************/
/*****************************************************************************/

/**
 * leads/v2/forms
 * @param params
 * @param callback
 */
hubspotAPI.prototype.leads_forms = function (params, callback) {
  var path = "leads/v2/forms",
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.get(path, availableParams, params, callback);
}


/*****************************************************************************/
/************************* PROPECTS Methods **********************************/
/*****************************************************************************/

/**
 * leads/v2/forms
 * @param params
 * @param callback
 */
hubspotAPI.prototype.prospects = function (params, callback) {
  var path = "prospects/v1/timeline",
    availableParams = [
      "timeOffset",
      "orgOffset"
    ];

  this.get(path, availableParams, params, callback);
}


/*****************************************************************************/
/************************* SETTINGS Methods **********************************/
/*****************************************************************************/

//http://developers.hubspot.com/docs/methods/settings/get_settings
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
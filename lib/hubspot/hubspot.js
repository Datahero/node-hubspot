var request = require('request');
var zlib = require('zlib');
var qs = require('querystring');
var helpers = require('./helpers');
var _ = require('lodash');

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
  }

  if (!options.api_key && !options.access_token) {
    throw new Error('API requires api_key or access_token');
  }

  if (!options.application_id) {
    throw new Error('API requires an application_id');
  }

  if (!options.client_id) {
    throw new Error('API requires client_id');
  }

  if (!options.client_secret) {
    throw new Error('API requires client_secret');
  }

  if (!options.refresh_token) {
    throw new Error('API requires refresh_token');
  }

  /**
   * Authenticate using either the API key or with oauth but not both.
   */
  if (options.api_key) {
    /**
     * if user has api_key, ignore oauth stuff.
     */

    this.api_key = options.api_key;
  } else {
    this.access_token = options.access_token;
  }

  this.application_id = options.application_id;
  this.client_id = options.client_id;
  this.client_secret = options.client_secret;
  this.refresh_token = options.refresh_token;
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
 * @param givenParams Parameters to call the hubspot API with
 * @param callback Callback function to call on success
 */
hubspotAPI.prototype.execute = function (verbParams, path, givenParams, callback) {
  var self = this;
  var body;
  var currentParam;
  var requestOptions;
  var authParams = {};

  var verb = verbParams && verbParams.verb || verbParams;
  var headers = {
    "Content-Type": this.contentType,
    "User-Agent": this.userAgent,
    "Accept-Encoding": "gzip, deflate"
  };

  var uri = this.httpUri + '/' + path;

  var finalParams = givenParams;

  // This is wrong. We can't know ahead of time what params are going to be passed in
  // We need the ability to pass in arbitrary data to events without checking
  // TODO: remake this into a required minimim check!
  //
  // for (var i = 0; i < availableParams.length; i++) {
  //   currentParam = availableParams[i];
  //   if (typeof givenParams[currentParam] !== 'undefined')
  //     finalParams[currentParam] = givenParams[currentParam];
  // }

  /**
   * For OAuth: &access_token=TOKEN
   * For API Keys: &hapikey=KEY
   * @see http://developers.hubspot.com/auth/oauth_overview
   */
  if (this.api_key) {
    authParams.hapikey = this.api_key;
  }

  if (this.access_token) {
    // OAuth v1 is deprecated on hubspot api service
    headers.Authorization = "Bearer " + this.access_token;
  }

  requestOptions = {
    method: verb,
    headers: headers,
    encoding: null
  };

  // some endpoints use array-like parameters that must be stringified.
  // also must user querystring instead of qs.
  // qs output is param[0]=a&param[1]=b&param[2]=c
  // querystring output is param=a&param=b&param=c and this is required.

  if (verb === "POST") {
    var properties = [];
    for (var key in finalParams) {
      properties.push({
        property: key,
        value: finalParams[key]
      });
    }

    // The (undocumented) refresh and event_completion endpoints need the object stored the `form` request param
    // Single-contact-update endpoint, and possibly others, only work with the `json` request param
    requestOptions[verbParams.json ? 'json' : 'form'] = finalParams;

    uri = uri + "?" + qs.stringify(authParams);
  }
  if(verb === "PUT") {
    requestOptions.body = finalParams;
    requestOptions.json = true;
  } else {
    var allParams = _.merge(authParams, finalParams);
    uri = uri + "?" + qs.stringify(allParams);
  }

  requestOptions.uri = uri;

  if (self.DEBUG) {
    console.log("requestOptions", requestOptions);
  }

  request(requestOptions, function (error, res, body) {
    if (self.DEBUG) {
      console.log("error", error);
      console.log("res statusCode", res.statusCode);
      console.log("body", body);
    }

    var e;
    if (error) {
      e = new Error('Unable to connect to the hubspot API endpoint. Check prevError.');
      e.prevError = error;
      return callback(e);
    }

    var encoding = res.headers['content-encoding'];
    if (encoding && encoding.indexOf('gzip') >= 0) {
      return zlib.gunzip(body, function(err, dezipped) {
        if (err) {
          e = new Error('Unable decompress Hubspot API response\'s body. Check prevError.');
          e.prevError = err;
          return callback(e);
        }

        return processResponseBody(res.statusCode, dezipped.toString('utf-8'), callback);
      });
    }

    processResponseBody(res.statusCode, body, callback);
  });

};

function processResponseBody(statusCode, body, callback) {

  if (helpers.isAnError(statusCode)) {
    return callback(helpers.createHubspotError(body, statusCode));
  }

  var parsedResponse = {};
  try {
    parsedResponse = JSON.parse(body);
  } catch (error) {

    // Only throw an error if status is NOT a 204 because then there's no body to parse
    if (statusCode !== 204)
      return callback(new Error('Error parsing JSON answer from hubspot API.'));
  }

  if (parsedResponse.status === "error" || helpers.isAnError(statusCode)) {
    return callback(helpers.createHubspotError(parsedResponse, statusCode));
  }

  return callback(null, parsedResponse);
}

hubspotAPI.prototype.get = function (path, givenParams, callback) {
  this.execute("GET", path, givenParams, callback);
};

hubspotAPI.prototype.post = function (path, givenParams, callback) {
  this.execute("POST", path, givenParams, callback);
};

hubspotAPI.prototype.postJson = function (path, givenParams, callback) {
  this.execute({verb: "POST", json: true}, path, givenParams, callback);
};

hubspotAPI.prototype.put = function (path, givenParams, callback) {
  this.execute("PUT", path, givenParams, callback);
};

hubspotAPI.prototype.patch = function (path, givenParams, callback) {
  this.execute("PATCH", path, givenParams, callback);
};

hubspotAPI.prototype.delete = function (path, givenParams, callback) {
  this.execute("DELETE", path, givenParams, callback);
};

/**
 * access to access/refresh tokens for peristence
 * @return {object} {access_token, refresh_token}
 */
hubspotAPI.prototype.getTokens = function(){
  return {
    access_token: this.access_token,
    refresh_token: this.refresh_token
  };
};

/*****************************************************************************/
/************************* TOKEN Methods **********************************/
/*****************************************************************************/

/**
 * https://developers.hubspot.com/docs/methods/oauth2/get-access-token-information
 * @param access_token
 * @param callback
 */
hubspotAPI.prototype.isTokenValid = function(access_token, callback) {
  var path = "oauth/v1/access-tokens/" + access_token,
    params = [];

  this.get(path, params, function (err, data) {
    return callback(err, data);
  });
};

/**
 * https://developers.hubspot.com/docs/methods/oauth2/refresh-access-token
 * @param refresh_token
 * @param callback
 */
hubspotAPI.prototype.refreshAccessToken = function(refresh_token, callback) {
  var path = "oauth/v1/token",
    params = {
      'grant_type': 'refresh_token',
      'client_id': this.client_id,
      'client_secret': this.client_secret,
      'refresh_token': refresh_token
    };

  this.post(path, params, callback);
};

hubspotAPI.prototype.resetAccessToken = function(refresh_token, callback) {
  var self = this;
  self.refreshAccessToken(refresh_token, function (err, tokenInfo) {
    if (err) {
      return callback(err, tokenInfo);
    }

    self.access_token = tokenInfo.access_token;
    self.refresh_token = tokenInfo.refresh_token;
    return callback(err, tokenInfo)
  });

};

/*****************************************************************************/
/************************* TIMELINE Methods **********************************/
/*****************************************************************************/

/**
 * http://developers.hubspot.com/docs/methods/timeline/create-or-update-event
 * PUT /integrations/v1/:application‐id/timeline/event

 /**
 * Create a new timeline event (of type eventTypeId) on the Hubspot contact who
 * with specified email
 *
 * From the API docs, an example of the data passed in would be:
 * If event type 123 has a numeric property called presentationId,
 * the following would also be a valid JSON to send for that
 * event type:
 * {
 *   "id":"3",
 *   "email": "joe@acme.com",
 *   "eventTypeId":"123",
 *   "presentationId":"9876543",
 *   "extraData":{
 *     "name":"JohnDoe",
 *     "weather":"Cloudy"
 *   }
 * }
 * @param  {string}   eventTypeId   The event type id (this is generated via Hubspot UI)
 * @param  {string}   eventId       An id for the event - this is not autocreated
 * @param  {string}   email         Email address of the contact
 * @param  {object}   extraData     Extra data of the contact
 * @param  {function} callback      Node style callback (fn(err, result))
 * @return {null}                   n/a
 */
hubspotAPI.prototype.createOrUpdateTimelineEvent = function(timelineParams, callback) {

  // TODO: Fill in details to create the a hubspot event on the timeline of the contact
  // with the specified email.  Some criteria are:
  //  - If access_token has expired refresh the token before making call
  //  - Uses this.application_id as part of the request (as spec'd in http://developers.hubspot.com/docs/methods/timeline/create-or-update-event)
  //  - Event should be created if eventId is new or update existing event w. eventId on contact's timeline
  //  - Handle any error cases from the REST endpoint

  var self = this;
  var path = 'integrations/v1/' + self.application_id + '/timeline/event';

  var params = timelineParams; // todo: clean up

  self.put(path, params, function (err, result) {
    if (err) {
      // if unauthorized error
      if(err.statusCode === 401) {
        self.resetAccessToken(self.refresh_token, function (err, tokenInfo) {
          if (err) {
            return callback(err, result);
          }

          self.put(path, params, callback);
        });
      } else {
        return callback(err, result);
      }
    } else {
      return callback(err, result);
    }
  });
};

/*****************************************************************************/
/************************* CONTACTS Methods **********************************/
/*****************************************************************************/

/**
* http://developers.hubspot.com/docs/methods/contacts/get_batch_by_email
* @param params
* @param callback
*/

hubspotAPI.prototype.contacts_emails_batch = function(params, callback) {
  var version = params.version ? params.version : "v1";
  var path = "contacts/" + version + "/contact/emails/batch/";

    this.get(path, params, callback);
};

/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_statistics = function (params, callback) {
  var path = "contacts/v1/contacts/statistics";
  this.get(path, params, callback);
};


/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * contacts/v1/lists/all/contacts/all
 * @param params
 * @param callback
 */


hubspotAPI.prototype.all_contacts = function (params, callback) {
  var path = "contacts/v1/lists/all/contacts/all";
  this.get(path, params, callback);
};

/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contact_by_email
 * contacts/v1/contact/email/:contacts_email/profile
 * @param params
 * @param callback
 */


hubspotAPI.prototype.get_contact_by_email = function (params, callback) {
  var email = params.email;
  var path = "contacts/v1/contact/email/"+email+"/profile";

  this.get(path, params, callback);
};

/**
 * contacts/v1/contact
 */
hubspotAPI.prototype.contacts_contact = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/contact";

  this.post(path, params, callback);
};

/**
 * contacts/v1/lists
 */
hubspotAPI.prototype.contacts_lists = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/lists";

  this.get(path, params, callback);
};

/**
 * contacts/v1/lists/static
 */
hubspotAPI.prototype.contacts_static_lists = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/lists/static";

  this.get(path, params, callback);
};

/**
 * contacts/v1/lists/:list_id/add
 */
hubspotAPI.prototype.contacts_lists_add = function (params, callback) {
  var version = params.version ? params.version : "v1";
  var list_id = params['list_id'];
  var contact_id = params['contact_id'];

  var path = "contacts/" + version + "/lists/" + list_id + "/add";

  this.post(path, JSON.stringify({'vids':[contact_id]}), callback);
};

/**
 * contacts/v1/contact/vid/:contact_id/profile
 * @param params
 * @param callback
 */

 hubspotAPI.prototype.contacts_create_update = function(params, callback) {
  var version = params.version ? params.version : "v1";
  var email = params.email;

  var path = "contacts/" + version + "/contact/createOrUpdate/email/" + email;

  this.post(path, params, callback);
 };

 hubspotAPI.prototype.contacts_properties_update = function(params, callback) {
  var version = params.version ? params.version : "v1";
  var path = "contacts/" + version + "/contact/vid/" + params.contact_id + "/profile";

  this.post(path, params, callback);
 };


/**
 * contacts/v1/properties
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_properties = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/properties";

  this.get(path, params, callback);
};


/**
 * contacts/v1/forms and contacts/v2/forms
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_forms = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/forms";

  this.get(path, params, callback);
};

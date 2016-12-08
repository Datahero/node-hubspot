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
hubspotAPI.prototype.execute = function (verbParams, path, availableParams, givenParams, callback) {
  var self = this;
  var body;
  var currentParam;
  var parsedResponse;

  var verb = verbParams && verbParams.verb || verbParams;
  var headers = {
    "Content-Type": this.contentType,
    "User-Agent": this.userAgent,
    "Accept-Encoding": "gzip, deflate"
  };

  var uri = this.httpUri + '/' + path;

  var finalParams = {};

  var requestOptions = {
    method: verb,
    headers: headers,
    encoding: null
  };

  for (var i = 0; i < availableParams.length; i++) {
    currentParam = availableParams[i];
    if (typeof givenParams[currentParam] !== 'undefined')
      finalParams[currentParam] = givenParams[currentParam];
  }

  /**
   * For OAuth 2.0: Set header "Authorization" = "Bearer " + TOKEN
   * For API Keys: &hapikey=KEY
   * @see http://developers.hubspot.com/docs/methods/auth/oauth-overview
   */
  if (this.api_key) {
    finalParams.hapikey = this.api_key;
  }

  if (this.access_token) {
    requestOptions.headers["Authorization"] = "Bearer " + this.access_token;
  }



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

  requestOptions.uri = uri;

  if (self.DEBUG) {
    console.log("req", requestOptions);
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

hubspotAPI.prototype.get = function (path, availableParams, givenParams, callback) {
  this.execute("GET", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.post = function (path, availableParams, givenParams, callback) {
  this.execute("POST", path, availableParams, givenParams, callback);
};

hubspotAPI.prototype.postJson = function (path, availableParams, givenParams, callback) {
  this.execute({verb: "POST", json: true}, path, availableParams, givenParams, callback);
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
};


hubspotAPI.prototype.events = function (params, callback) {
  var path = "reports/v1/events",
    availableParams = [];

  this.get(path, availableParams, params, callback);
};


/*****************************************************************************/
/************************* SOURCES Methods ***********************************/
/*****************************************************************************/

// un-published API endpoint.
hubspotAPI.prototype.sources_daily = function (params, callback) {
  var path = "analytics/v2/sources/summary/daily",
    availableParams = [];

  this.get(path, availableParams, params, callback);
};

/*****************************************************************************/
/************************* PAGES Methods *************************************/
/*****************************************************************************/


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
  var path = "contacts/" + version + "/contact/emails/batch/",
    availableParams = [
      'email'
    ];

    this.get(path, availableParams, params, callback);
};

/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * @param params
 * @param callback
 */
hubspotAPI.prototype.contacts_statistics = function (params, callback) {
  var path = "contacts/v1/contacts/statistics",
    availableParams = [];
  this.get(path, availableParams, params, callback);
};


/**
 * http://developers.hubspot.com/docs/methods/contacts/get_contacts
 * contacts/v1/lists/all/contacts/all
 * @param params
 * @param callback
 */


hubspotAPI.prototype.all_contacts = function (params, callback) {
  var path = "contacts/v1/lists/all/contacts/all";
  var availableParams = [
    "count",
    "property",
    "vidOffset"
  ];

  this.get(path, availableParams, params, callback);
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
  var availableParams = [
    "count",
    "property",
    "vidOffset"
  ];

  this.get(path, availableParams, params, callback);
};

/**
 * contacts/v1/contact
 */
hubspotAPI.prototype.contacts_contact = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/contact",

    availableParams = [
        "email", "firstname", "lastname"
    ];

  this.post(path, availableParams, params, callback);
};

/**
 * contacts/v1/lists
 */
hubspotAPI.prototype.contacts_lists = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/lists",
    availableParams = [
      "count",
      "offset"
    ];

  this.get(path, availableParams, params, callback);
};

/**
 * contacts/v1/lists/static
 */
hubspotAPI.prototype.contacts_static_lists = function (params, callback) {
  var version = params.version ? params.version : "v1";

  var path = "contacts/" + version + "/lists/static",
    availableParams = [
      "count",
      "offset"
    ];

  this.get(path, availableParams, params, callback);
};

/**
 * contacts/v1/lists/:list_id/add
 */
hubspotAPI.prototype.contacts_lists_add = function (params, callback) {
  var version = params.version ? params.version : "v1";
  var list_id = params['list_id'];
  var contact_id = params['contact_id'];


  var path = "contacts/" + version + "/lists/" + list_id + "/add";
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.post(path, availableParams, JSON.stringify({'vids':[contact_id]}), callback);
};

/**
 * contacts/v1/contact/vid/:contact_id/profile
 * @param params
 * @param callback
 */

 hubspotAPI.prototype.contacts_create_update = function(params, callback) {
  var version = params.version ? params.version : "v1";
  var email = params.email;

  var path = "contacts/" + version + "/contact/createOrUpdate/email/" + email,
    availableParams = [
      "properties"
    ];

  this.post(path, availableParams, params, callback);
 };

 hubspotAPI.prototype.contacts_properties_update = function(params, callback) {
  var version = params.version ? params.version : "v1";
  var path = "contacts/" + version + "/contact/vid/" + params.contact_id + "/profile",
    availableParams = [
      "properties"
    ];

  this.post(path, availableParams, params, callback);
 };


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
};


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
};

/*****************************************************************************/
/************************* WORKFLOWS Methods *************************************/
/*****************************************************************************/
/**
 * automation/v2/workflows
 * @param params
 * @param callback
 */
hubspotAPI.prototype.automation_workflows = function (params, callback) {
  var path = "automation/v2/workflows",
    availableParams = [
      "count",
      "property",
      "vidOffset"
    ];

  this.get(path, availableParams, params, callback);
};

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
};


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
};


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
};


/*****************************************************************************/
/************************* EMAIL Methods **********************************/
/*****************************************************************************/

//These are un-documented - use at your own risk.
hubspotAPI.prototype.cosemail = function (params, callback) {
  var path = "cosemail/v1/emaildashboard";
  var availableParams = [
    "limit",
    "offset",
    "property",
  ];

  this.get(path, availableParams, params, callback);
};

/*****************************************************************************/
/************************* AUTH Methods **********************************/
/*****************************************************************************/

//These are un-documented - use at your own risk.
hubspotAPI.prototype.refresh = function (params, callback) {
  var path = "auth/v1/refresh";
  var availableParams = [
    "refresh_token",
    "client_id",
    "grant_type",
  ];

  if (!params) {
    params = {};
  }
  params.grant_type = "refresh_token";

  this.post(path, availableParams, params, callback);
};

/*****************************************************************************/
/************************* OWNERS Methods ************************************/
/*****************************************************************************/

hubspotAPI.prototype.owners = function (params, callback) {
  var path = "owners/v2/owners";
  var availableParams = [
      "includeInactive"
    ];

  this.get(path, availableParams, params, callback);
};

/*****************************************************************************/
/************************* DEALS Methods *************************************/
/*****************************************************************************/

hubspotAPI.prototype.deals_recent_created = function (params, callback) {
  var path = "deals/v1/deal/recent/created";
  var availableParams = [
      "count",
      "offset"
    ];

  this.get(path, availableParams, params, callback);
};

hubspotAPI.prototype.deals_properties = function (params, callback) {
  var path = "deals/v1/properties";
  var availableParams = [];

  this.get(path, availableParams, params, callback);
};

/*****************************************************************************/
/************************* COMPANIES Methods *********************************/
/*****************************************************************************/

hubspotAPI.prototype.companies_recent_created = function (params, callback) {
  var path = "companies/v2/companies/recent/created";
  var availableParams = [
      "count",
      "offset"
    ];

  this.get(path, availableParams, params, callback);
};

hubspotAPI.prototype.companies_properties = function (params, callback) {
  // v2 is the recommended URI in their docs. This would help with a shared vers
  var path = "companies/v1/properties";
  var availableParams = [];

  this.get(path, availableParams, params, callback);
};

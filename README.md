# node-hubspot

A node.js library for the hubspot API (further details: https://developers.hubspot.com)

_node-hubspot_ exposes the following features of the hubspot API to your node.js application:

Caution - some of these routes are not officially supported or listed in the api and may change

**Version v3**
  * user-details


## Installation

Installing using npm (node package manager):

    npm install node-hubspot

If you don't have npm installed or don't want to use it:

    cd ~/.node_libraries
    git clone git@github.com:Datahero/node-hubspot.git

Please note that parts of _node-hubspot_ depend on [request](http://github.com/mikeal/request) by [Mikeal Rogers](http://github.com/mikeal). This library needs to be installed for the API to work. Additionally [node-querystring](http://github.com/visionmedia/node-querystring) is required. If you are using npm all dependencies should be automagically resolved for you.

## Usage

Information on how to use the hubspot APIs can be found below. Further information on the API methods available can be found at [https://developer.hubspot.com](https://developer.hubspot.com). You can also find further information on how to obtain an API key, and/or OAuth2 in your hubspot account and much more on the hubspot API pages.

### hubspot API

_hubspotAPI_ takes an options object, The only required option for version3 of the api is an oAuth token.

http://developer.hubspot.com/docs/auth/
> All API requests must be authenticated with a valid OAuth token. Tokens are tied to user accounts; if you’re just using the API for a single user or organizer, then follow ‘Personal Tokens’ if you’re using the API for many hubspot users, then follow ‘OAuth Token Flow’.
which you can find in your hubspot Account. The second argument is an options object which can contain the following options:

**required options:**
* `token`

**available options**
* `version` The API version to use. Defaults to v3.
* `userAgent` Custom User-Agent description to use in the request header.
* `contentType`  defaults to `application/json` and currently the api only supports json

The callback function for each API method gets two arguments, an error and results object.

The error object is null when no error occured. The results object contains all information retrieved as long as no error occurred.

Example:

```javascript
var hubspotAPI = require('hubspot');

var token = 'a users hubspot API token';

try {
    var api = hubspotAPI({
      token: token,
      version : 'v3'
    });
} catch (error) {
    console.log(error.message); // the options are missing, this function throws an error.
}

api.sources({ user_id: 30 }, function (error, data) {
    if (error)
        console.log(error.message);
    else
        console.log(JSON.stringify(data)); // Do something with your data!
});

```


#### Events

#### Sources

#### Pages

#### Contacts

#### Prospects


## License

_node-hubspot_ is licensed under the MIT License. (See LICENSE)


## [Contributors](https://github.com/Datahero/node-hubspot/graphs/contributors)

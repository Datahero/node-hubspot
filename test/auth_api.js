'use strict';

var chai = require('chai'),
  should = chai.should(),
  expect = chai.expect,
  sinon = require('sinon'),
  hubSpotAPI = require('../lib/hubspot');

try {
  var api = hubSpotAPI({
    // access_token: "CPKTtIOOKxICXQEY5IenASDFjeABKKKrAjIZAEL7khMacoNJDyYXRQPzPvBTP3PT5EXHJg",
    refresh_token: "785d3297-9a89-44a1-857e-refresh-Token",
    access_token: "access_token",
    application_id: "application_id",
    client_id: 'client_id',
    client_secret: 'client_secret',
    version : 'v3',
    DEBUG: true
  });
} catch (error) {
  console.error(error.message); // the options are missing, this function throws an error.
}

describe('check "createOrUpdateTimelineEvent" method', function (done) {

  it('should refresh access token and make call "createOrUpdateTimelineEvent" method', function (done) {
    var callingIteration = 0;

    sinon.stub(api, "put", function (path, availableParams, givenParams, callback) {

      callingIteration++;

      if(callingIteration === 1) {
        var error = new Error("The access token is expired or invalid");
        error.statusCode = 401;
        callback(error, null);
      } else {
        callback(null, {success: 'OK'});
      }
    });

    sinon.stub(api, 'refreshAccessToken', function (refresh_token, callback) {
      return callback(null, true);
    });

    var timeLine =  {
      "id": 123,
      "eventTypeId": 123456,
      "email": "joe@acme.com",
      "extraData":{
        "name":"JohnDoe",
        "weather":"Cloudy"
      }
    };

    api.createOrUpdateTimelineEvent(
      timeLine.eventTypeId,
      timeLine.email,
      timeLine.id,
      JSON.stringify(timeLine.extraData),
      function (err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.property('success').and.to.be.a("string").and.to.be.eqls("OK");
      }
    );


    api.put.restore();
    api.refreshAccessToken.restore();
    done();
  });

});


describe('check access token methods', function (done) {

  var apiMock,
    refreshToken = "some refresh token",
    accessToken = "some access token";

  beforeEach(function() {
    apiMock = sinon.mock(api);
  });

  afterEach(function() {
    apiMock.restore();
  });

  it('should call method "get" within method "isTokenValid" with right parameters', function(done){
    apiMock.expects('get').once().withArgs(
      'oauth/v1/access-tokens/' + accessToken
    );

    var callback = sinon.spy();
    api.isTokenValid(accessToken, callback);

    apiMock.verify();
    done();
  });

  it('should call method "refreshAccessToken" with correct parameters', function (done) {
    var availableParams = [
        'grant_type',
        'client_id',
        'client_secret',
        'refresh_token'
      ];

    apiMock.expects('post').once().withArgs("oauth/v1/token", availableParams);
    var callback = sinon.spy();
    api.refreshAccessToken(refreshToken, callback);

    apiMock.verify();
    done();
  });
});

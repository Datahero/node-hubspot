/**
 * Created by blairanderson on 8/1/14.
 */

var versions = [
  "v1",
  "v2",
  "v3"
];

for (var i = 0; i < versions.length; i++) {
  var version = versions[i];
  exports[version] = require('./' + version);
}


'use strict';
if (process.argv.length != 4) {
    console.log("missing port and api_root");
};
var port          = process.argv[2];
var jsweb_api_home = process.argv[3];


var express    = require('express');
var web        = express();
var bodyParser = require('body-parser');
web.use(bodyParser.json());

web.jsweb = {};

var config = {};
try {
    config = require(jsweb_api_home + "/config/jsweb-config.json");
} catch (error) {
    console.error("config file not found");
}

var plugins_loader = require("../lib/jsweb-plugins-loader.js");
plugins_loader.load(web, jsweb_api_home + "/init");

var API_man = require("../lib/jsweb-api-manager.js");

var find_api =  require("../lib/jsweb-find-api.js");
var apis = find_api(jsweb_api_home + "/root");

for (var i = 0; i < apis.length; i++) {
    var api = apis[i];
    var api_man = new API_man(api.base, port);
    api_man.debug = config.debug;
    api_man.mount(web, api.method);
}
if (config.debug) {
    console.log("DEBUG on");
}
var st = require('st')
var mount = st({
  path        : jsweb_api_home + "/root",
  url         : '/',
  cache       : false,
  index       : "index.html",
  dot         : true,
  passthrough : true,
  gzip        : true
})
web.use(mount);

web.listen(port, function () {
    console.log('JSWEB listening on port: %d api-root=%s', port, jsweb_api_home);
});

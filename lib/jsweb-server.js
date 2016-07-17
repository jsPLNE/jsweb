'use strict';
if (process.argv.length != 4) {
    console.log("missing port and api_root");
};
var port          = process.argv[2];
var jsweb_api_home = process.argv[3];


var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

app.set('views', jsweb_api_home + '/views');
var jw = {};
jw.app = app;

var config = {};
try {
    config = require(jsweb_api_home + "/config/jsweb-config.json");
} catch (error) {
    console.error("config file not found");
}

var plugins_loader = require("../lib/jsweb-plugins-loader.js");
plugins_loader.load(jw, jsweb_api_home + "/init");

var API_man = require("../lib/jsweb-api-manager.js");

var find_root =  require("../lib/jsweb-find-root.js");

var root = find_root(jsweb_api_home);
if (!root) {
    console.error("Can not find jsws folder at ", jsweb_api_home);
    process.exit(-1);
}
if (root && root.is_api) {
    var api_man = new API_man(jw, root.path, port, false);
    api_man.debug = config.debug;
    api_man.mount('/');
};
var find_api =  require("../lib/jsweb-find-api.js");
var apis = find_api(root.path);

for (var i = 0; i < apis.length; i++) {
    var api = apis[i];
    var api_man = new API_man(jw, api.base, port, true);
    api_man.debug = config.debug;
    api_man.mount(api.method);
}
if (config.debug) {
    console.log("[%s] DEBUG ON", port);
}
var st = require('st')
var mount = st({
  path        : root.path,
  url         : '/',
  cache       : false,
  index       : "index.html",
  dot         : true,
  passthrough : true,
  gzip        : true
})
app.use(mount);

app.listen(port, function () {
    console.log('JSWEB listening on port: %d api-root=%s', port, jsweb_api_home);
});

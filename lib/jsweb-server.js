'use strict';
if (process.argv.length != 5) {
    console.log("missing port and api_root");
};
var port          = process.argv[2];
var jsweb_api_home = process.argv[3];
var mount_point   = process.argv[4];


var express    = require('express');
var web        = express();
var bodyParser = require('body-parser');
web.use(bodyParser.json());

web.jsweb = {};

var plugins_loader = require("../lib/jsweb-plugins-loader.js");
plugins_loader.load(web, jsweb_api_home + "/init");

var API_man = require("../lib/jsweb-api-manager.js");
var api_man = new API_man(jsweb_api_home + "/root", port);
api_man.mount(web, mount_point);

// var st = require('st')
// var mount = st({
//   path        : '/home/cos/cos-download-root/',
//   url         : '/download/',
//   cache       : false,
//   index       : false,
//   dot         : true,
//   passthrough : true,
//   gzip        : true
// })
// web.use(mount);

web.listen(port, function () {
    console.log('JSWEB listening on port: %d api-root=%s', port, jsweb_api_home);
});

'use strict';


if (process.argv.length < 4) {
    console.log("missing port and api_root");
}
var port = process.argv[2];
var base = process.argv[3];
var tags = process.argv[4];

var get_hosts = require('./jsweb-get-host');
var hosts = get_hosts(base);
if (hosts.length === 0) {
    console.error("No valid jsweb host at :", base);
    process.exit(-3);
}
var fs = require('fs');
var options = {
    rejectUnauthorized : false
};
if (tags.indexOf('https') >= 0) {
    try {
        options.cert = fs.readFileSync(base + "/config/jsweb.cert");
        options.key  = fs.readFileSync(base + "/config/jsweb.key");
        options.ca   = fs.readFileSync(base + "/config/jsweb.ca");
        options.ciphers = "AES256-GCM-SHA384";
    } catch (error) {
        console.error("Port %s set to https, but can not find crt/key/csr file.", port);
        console.error(error.stack);
        process.exit(-4);
    }
}


var port_config = {};
try {
    port_config = require(base + "/config/port-config.json");
} catch (error) {
    console.log(error);
}

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (port_config.cluster && cluster.isMaster) {
    if (port_config.cluster) {
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
        });
    }
    return;
} 

var express = require('express');
for (var h = 0; h < hosts.length; h++) {
    var host = hosts[h];
    host.app = express();
    var jw = {};
    jw.host = host.host;
    jw.base = host.base;
    jw.app  = host.app;
    jw.mu   = new require('mu2');
    jw.mu.root = host.base + '/views';
    jw.app.set('views', jw.mu.root);
    console.log(jw.mu.root);
    jw.app.engine("hjs",  function(path, options, fn) {
        console.log("this is mu2 engine");
        var result = "";
        var view  = options.locals || {};
        this.mu.compileAndRender(path, view).on('data', function(data) {
            result += data;
        }).on('end', function() {
            fn(null, result);
        }).on('error', function(e) {
            fn(e);
        });
    }.bind(jw));
    
    var config = {};
    try {
        config = require(jw.base + "/config/jsweb-config.json");
    } catch (error) {
        // console.error("config file not found");
    }
    
    var init = require("../lib/jsweb-init.js");
    init.load(jw, jw.base + "/init");
    var API_man = require("../lib/jsweb-api-manager.js");
    var find_root =  require("../lib/jsweb-find-root.js");
    var root = find_root(jw.base);
    if (!root) {
        console.error("Can not find jsweb folder at ",
                      jw.base);
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
        api_man.mount(api.path);
    }
    if (config.debug) {
        console.log("Port [%s] DEBUG ON", port);
    }
    var st = require('st');
    var mount = new st({
        path        : root.path,
        url         : '/',
        cache       : false,
        index       : "index.html",
        dot         : true,
        passthrough : true,
        gzip        : true
    })
    jw.app.use(mount);
}
var main = express();

main.use(function (req, res, next) {
    for (var i = 0; i < hosts.length; i++) {
        if (hosts[i].host === req.hostname) {
            hosts[i].app(req, res, next);
            return;
        }
    }
    for (var i = 0; i < hosts.length; i++) {
        if (hosts[i].host === '*') {
            hosts[i].app(req, res, next);
            return;
        }
    }
})
var s = '';
for (var i = 0; i < hosts.length; i++) {
    s = s + hosts[i].host + "\n";
}
if (tags.indexOf('https') >= 0) {
    var https = require('https');
    https.createServer(options, main).listen(port, function () {
        console.log('JSWEB listening HTTPS on port: %d for:\n%s',
                    port, s);
    });
} else {
    main.listen(port, function () {
        console.log('JSWEB listening HTTP on port: %d for:\n%s',
                    port, s);
    });
}

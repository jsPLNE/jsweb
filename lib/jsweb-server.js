'use strict';


if (process.argv.length < 4) {
    console.log("missing port and api_root");
}
var port = {
    port : process.argv[2],
    base : process.argv[3],
    tags : process.argv[4]
};

var get_hosts = require('./jsweb-get-host');
var hosts = get_hosts(port.port, port.base);
if (hosts.length === 0) {
    console.error("No valid jsweb host at :", port.base);
    process.exit(-3);
}
var fs = require('fs');
var options = {
    rejectUnauthorized : false
};
if (port.tags.indexOf('https') >= 0) {
    port.protocol = 'https';
    try {
        options.cert = fs.readFileSync(port.base + "/config/jsweb.cert");
        options.key  = fs.readFileSync(port.base + "/config/jsweb.key");
        options.ca   = fs.readFileSync(port.base + "/config/jsweb.ca");
        // options.ciphers = "AES256-GCM-SHA384";
    } catch (error) {
        console.error("Port %s set to https, but can not find crt/key/csr file.", port);
        console.error(error.stack);
        process.exit(-4);
    }
} else {
    port.protocol = 'http';
}


try {
    port.config = require(port.base + "/config/port-config.json");
} catch (error) {
    port.config = {};
    // console.log(error);
}

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (port.config.cluster && cluster.isMaster) {
    if (port.config.cluster) {
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
var API_man = require("../lib/jsweb-api-manager.js");
var init = require("../lib/jsweb-init.js");

for (var h = 0; h < hosts.length; h++) {
    var host = hosts[h];
    host.app = express();
    var jw = {};
    jw.host = host;
    jw.port = port;
    jw.app  = host.app;
    jw.mu   = new require('mu2');
    jw.mu.root = host.base + '/views';
    jw.app.set('views', jw.mu.root);
    jw.app.engine("hjs",  function(path, options, fn) {
        var result = "";
        var view  = options.locals || {};
        this.mu.compileAndRender(path, view)
            .on('data', function(data) {
            result += data;
        }).on('end', function() {
            fn(null, result);
        }).on('error', function(e) {
            fn(e);
        });
    }.bind(jw));
    
    init.load(jw);
    API_man.load(jw);

    var st = require('st');
    var mount = new st({
        path        : jw.host.root,
        url         : '/',
        cache       : jw.host.config["cache-static"] || false,
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
if (port.tags.indexOf('https') >= 0) {
    var https = require('https');
    https.createServer(options, main).listen(port.port, function () {
        console.log('JSWEB listening HTTPS on port: %d for:\n%s',
                    port.port, s);
    });
} else {
    main.listen(port.port, function () {
        console.log('JSWEB listening HTTP on port: %d for:\n%s',
                    port.port, s);
    });
}

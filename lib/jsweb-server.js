'use strict';


if (process.argv.length < 4) {
    console.error("missing port and api_root");
    process.exit(-1);
}
var port = {
    port : process.argv[2],
    home : process.argv[3],
    tags : process.argv[4]
};

try {
    port.config = require(port.home + "/config/port-config.json");
} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
        console.error("port-config.json:", error);
    }
    port.config = {};
}

if (port.tags.indexOf('https') >= 0) {
    port.tls = {};
    var fs = require('fs');
    port.protocol = 'https';
    try {
        var fcert = port.home + "/config/jsweb.cert";
        var fkey  = port.home + "/config/jsweb.key";
        var fca   = port.home + "/config/jsweb.ca";
        if (port.config.tls) {
            if (port.config.tls.cert) { fcert = port.config.tls.cert; }
            if (port.config.tls.key)  { fkey  = port.config.tls.key; }
            if (port.config.tls.ca)   { fca   = port.config.tls.ca; }
            port.tls.rejectUnauthorized = port.config.tls.rejectUnauthorized;
            port.tls.requestCert = port.config.tls.requestCert;
        }
        port.tls.cert = fs.readFileSync(fcert);
        port.tls.key  = fs.readFileSync(fkey);
        port.tls.ca   = fs.readFileSync(fca);
        // options.ciphers = "AES256-GCM-SHA384";
    } catch (error) {
        console.error("Port %s set to https, but can not find crt/key/csr file.", port.port);
        console.error(error.stack);
        process.exit(-4);
    }
} else {
    port.protocol = 'http';
}


var get_hosts = require('./jsweb-get-host');
var hosts = get_hosts(port);
if (hosts.length === 0) {
    console.error("No valid jsweb host at :", port.home);
    process.exit(-3);
}

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

var shareTlsSessions = require('strong-cluster-tls-store');
if (port.config.cluster && cluster.isMaster) {
    if (port.config.cluster) {
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        cluster.on('exit', function (worker, code, signal) {
            console.error(`worker ${worker.process.pid} died`);
        });
    }
    return;
} 

var host_loader = require('./jsweb-load-host');
var hosts_save = hosts.slice(0);
host_loader.load(hosts, function (error, main, hosts) {
    if (error) {
        console.error(error);
    } else {
        hosts = hosts_save;
        var s = '';
        for (var i = 0; i < hosts.length; i++) {
            s = s + hosts[i].hostname + "\n";
        }
        var bind = port.config.bind  || '0.0.0.0';
	var server;
        if (port.tags.indexOf('https') >= 0) {
            var https = require('https');
            server = https.createServer(port.tls, main)
                .listen(port.port, function () {
                    console.log('HTTPS on port: %d for:\n%s',
                                port.port, bind, s);
                });
            if (shareTlsSessions) {
                shareTlsSessions(server);
            }
        } else {
            server = main.listen(port.port, bind, function () {
                console.log('HTTP on port: %d for:\n%s',
                            port.port, bind, s);
            });
	}
	var WebSocket = require('faye-websocket');
	server.on('upgrade', function(req, socket, body) {
	    req.path = req.url.replace(/\?.*/, '');
	    if (!WebSocket.isWebSocket(req)) {
		return;
	    };
	    var api = null;
            for (var i = 0; i < hosts.length; i++) {
                if (hosts[i].hostname === req.hostname) {
                    req.jw = hosts[i];
		    api = req.jw.apis[0].ws_apis[req.path];
                    // req.jw.app(req, res, next);
                    break;
                }
            }
	    if (!api) {
		for (var i = 0; i < hosts.length; i++) {
                    if (hosts[i].hostname === '*') {
			req.jw = hosts[i];
			api = req.jw.apis[0].ws_apis[req.path];
			// req.jw.app(req, res, next);
			break;
                    }
		}
	    };
	    if (api && typeof api.func === 'function') {
		var ws = new WebSocket(req, socket, body);
		api.func(req, ws);
	    } else {
		console.log(api);
	    }

	    // ws.on('message', function(event) {
	    // 	console.log(event.data);
	    // 	ws.send(event.data);
	    // });
	    
	    // ws.on('close', function(event) {
	    // 	console.log('close', event.code, event.reason);
	    // 	ws = null;
	    // });
	});
    }
})


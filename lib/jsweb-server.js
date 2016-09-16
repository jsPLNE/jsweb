'use strict';


if (process.argv.length < 4) {
    console.error("missing port and api_root");
}
var port = {
    port : process.argv[2],
    home : process.argv[3],
    tags : process.argv[4]
};

var fs = require('fs');
var options = {
    rejectUnauthorized : false
};
if (port.tags.indexOf('https') >= 0) {
    port.protocol = 'https';
    try {
        options.cert = fs.readFileSync(port.home + "/config/jsweb.cert");
        options.key  = fs.readFileSync(port.home + "/config/jsweb.key");
        options.ca   = fs.readFileSync(port.home + "/config/jsweb.ca");
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
    port.config = require(port.home + "/config/port-config.json");
} catch (error) {
    port.config = {};
}

var get_hosts = require('./jsweb-get-host');
var hosts = get_hosts(port);
if (hosts.length === 0) {
    console.error("No valid jsweb host at :", port.home);
    process.exit(-3);
}

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

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
host_loader.load(hosts, function (error, main) {
    if (error) {
        console.error(error);
    } else {
        hosts = hosts_save;
        var s = '';
        for (var i = 0; i < hosts.length; i++) {
            s = s + hosts[i].hostname + "\n";
        }
        if (port.tags.indexOf('https') >= 0) {
            var https = require('https');
            https.createServer(options, main)
                .listen(port.port, function () {
                    console.log('HTTPS on port: %d for:\n%s',
                                port.port, s);
            });
        } else {
            main.listen(port.port, function () {
                console.log('HTTP on port: %d for:\n%s',
                            port.port, s);
            });
        }
    }
})


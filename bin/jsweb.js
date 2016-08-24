#!/usr/bin/env node
var fs = require('fs');
var jsweb_home = __dirname + "/..";
var api_root = process.argv[2] || process.cwd();
if (api_root[0] !== '/') {
    try {
        process.chdir(api_root);
        api_root = process.cwd();
    } catch (error) {
        console.error(api_root, " is not a valid directory");
        process.exit(-2);
    }
}
// console.log("api_root  = ", api_root);
// console.log("jsweb_home = ", jsweb_home);

function get_ports(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (error) {
        return [];
    }
    var files = fs.readdirSync(path);
    var result = [];
    for (var i = 0; i < files.length; i++) {
        var folder = files[i];
        var ports  = folder.split(";");
        for (var j = 0; j < ports.length; j++) {
            console.log(ports);
            var port = ports[j].trim();
            var tags = [];
            if (/\d+\(.*\)/.test(port)) {
                tags =port.match(/\(.*\)/g).join()
                    .replace(/[\(\)]/g, "").split(';');
                port = port.replace(/\(.*/, '');
            } else if (!/\d+/.test(port)) {
                continue;
            };
            var port = parseInt(port, 10);
            if (port < 0 || port > 65535) { continue; };
            if (port < 1024 && process.getuid() !== 0) {
                console.log("Port < 1024 need root user");
                process.exit(-2);
            };
            var base = api_root + "/" + folder;
            result.push({
                port : port,
                base : base,
                tags : tags
            })
        }
    }
    return result;
};

var ports = get_ports(api_root);
if (ports.length === 0) {
    console.log("Can not find any directory contain jsweb at :", api_root);
    console.log("Please visit https://github.com/conwin/jsweb for more details.");
}
var port_list = [];
for (var i = 0; i < ports.length; i++) {
    if (port_list.indexOf(ports[i].port) >=0) {
        console.error("Duplicate port: ", ports[i]);
        process.exit(-5);
    };
    port_list.push(ports[i].port);
}

var child_process = require('child_process');
var servers = [];
for (var i = 0; i < ports.length; i++) {
    servers.push(
        child_process.fork(jsweb_home + "/lib/jsweb-server.js",
                           [ports[i].port,
                            ports[i].base,
                            ports[i].tags.join('-')]));
};


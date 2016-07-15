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
    var ports = [];
    for (var i = 0; i < files.length; i++) {
        var file        = files[i];
        if (!/\d+/.test(file)) { continue; };
        var base        = api_root + "/" + file;
        ports.push({
            port : parseInt(file, 10),
            base : base
        })
    }
    return ports;
};

var ports = get_ports(api_root);
if (ports.length === 0) {
    console.log("Can not find any directory contain jsweb at :", api_root);
    console.log("Please visit https://github.com/conwin/jsweb for more details.");
}
var child_process = require('child_process');
var servers = [];
for (var i = 0; i < ports.length; i++) {
    servers.push(child_process.fork(jsweb_home + "/lib/jsweb-server.js",
                                    [ports[i].port, ports[i].base]));
};


#!/usr/bin/env node
var fs         = require('fs');
var getopts    = require('getopts');
var jsweb_home = __dirname + "/..";
// var api_root   = process.argv[2] || process.cwd();

var opts       = getopts(process.argv.slice(2),
                         {
                             alias : {
                                 port : [ "port", "P"]
                             },
                             string : ["root", "p", "port"]
                         });


if (!opts.root) {
    if (opts._.length == 0 ) {
        opts.root = process.cwd();
    } else {
        opts.root = opts._[0];
    }
}
if (opts.root[0] !== '/') {
    try {
        process.chdir(opts.root);
        opts.root = process.cwd();
    } catch (error) {
        console.error(opts.root, " is not a valid directory");
        process.exit(-2);
    }
}
// console.log("opts.root  = ", opts.root);
// console.log("jsweb_home = ", jsweb_home);

function folder_to_ports(folder, opt_port) {
    var result = [];
    var ports  = [];
    if (opt_port) {
        ports.push(opt_port);
    } else {
        ports = folder.split(";");
    }
    for (var j = 0; j < ports.length; j++) {
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
        var base = opts.root + "/" + folder;
        if (opt_port) {
            base = folder;
        }
        result.push({
            port : port,
            base : base,
            tags : tags
        })
    }
    return result;
};

function get_ports(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (error) {
        return [];
    }
    var files = fs.readdirSync(path);
    var result = [];
    for (var i = 0; i < files.length; i++) {
        result = result.concat(folder_to_ports(files[i]));
    }
    return result;
};
var ports = [];
if (!opts.port) {
    ports = get_ports(opts.root);
} else {
    ports = folder_to_ports(opts.root, opts.port);
}
if (ports.length === 0) {
    console.log("Can not find any directory contain jsweb at :", opts.root);
    console.log("Please visit https://github.com/jsplne/jsweb for more details.");
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


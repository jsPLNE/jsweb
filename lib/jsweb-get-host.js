'use strict';
/*jslint vars:true*/
var fs = require('fs');
function get_root_folder(path) {
    var files = fs.readdirSync(path);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file === 'root') {
            return path + '/' + file;
        } else if (/^root\(.*\)/.test(file)) {
            return path + '/' + file;
        }
    }
    return null;
}
module.exports = function (port) {
    var result = [];
    var root = get_root_folder(port.home);
    if (root) {
        var host = {
            home : port.home,
            port : port,
            root : root,
            hostname : '*'
        }
        try {
            var config = port.home + "/config/jsweb-config.json";
            host.config = require(config);
        } catch (error) {
            console.error(error);
            host.config = {};
        }
        
        return [host];
    }
    var files = fs.readdirSync(port.home);
    var result = [];
    var default_host = null;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (/^\..*/.test(file)) { continue; };
        var root = get_root_folder(port.home + '/' + file);
        if (!root) { continue; }
        if (file === 'default') {
            default_host = {
                home : port.home + '/' + file,
                port : port,
                root : root,
                hostname : '*'
            }
            try {
                var config = default_host.home
                    + "/config/jsweb-config.json";
                default_host.config = require(config);
            } catch (error) {
                default_host.config = {};
            }
            
        } else {
            var host= {
                home : port.home + '/' + file,
                port : port,
                root : root,
                hostname : file
            };
            try {
                var config = host.home
                    + "/config/jsweb-config.json";
                host.config = require(config);
            } catch (error) {
                host.config = {};
            }
            result.push(host);
        }
    }
    if (default_host) {
        // default host must be the last.
        result.push(default_host);
    }
    return result;
}


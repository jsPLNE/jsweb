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
module.exports = function (port, base) {
    var result = [];
    var root = get_root_folder(base);
    if (root) {
        var host = {
            base : base,
            port : port,
            root : root,
            hostname : '*'
        }
        try {
            var config = base + "/config/jsweb-config.json";
            host.config = require(config);
        } catch (error) {
            host.config = {};
        }
        
        return [host];
    }
    var files = fs.readdirSync(base);
    var result = [];
    var default_host = null;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var root = get_root_folder(base + '/' + file);
        if (!root) { continue; }
        if (file === 'default') {
            default_host = {
                base : base + '/' + file,
                port : port,
                root : root,
                hostname : '*'
            }
            try {
                var config = default_host.base
                    + "/config/jsweb-config.json";
                default_host.config = require(config);
            } catch (error) {
                default_host.config = {};
            }
            
        } else {
            var host= {
                base : base + '/' + file,
                port : port,
                root : root,
                hostname : file
            };
            try {
                var config = host.base
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


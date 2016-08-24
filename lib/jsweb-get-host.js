'use strict';
/*jslint vars:true*/
var fs = require('fs');
module.exports = function (base) {
    var result = [];
    
    var is_virtual_host = true;
    var files = fs.readdirSync(base);
    var host_default = {
        base : base,
        host : '*'
    };
    if (files.indexOf('config') >= 0
        || files.indexOf('init') >= 0
        || files.indexOf('views') >= 0) {
        is_virtual_host = false;
    } else {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file === 'root') {
                is_virtual_host = false;
                break;
            } else if (/^root\(.*\)/.test(file)) {
                is_virtual_host = false;
                break;
            }
        }
    }
    if (is_virtual_host) {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file === 'default') {
                host_default.base = base + '/' + file;
            } else {
                result.push({
                    base : base + '/' + file,
                    host : file
                });
            }
        }
    };
    result.push(host_default); // default host must be the last.
    return result;
}

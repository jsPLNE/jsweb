'use strict';
/*jslint vars:true*/
var fs = require('fs');
var jw = null;
function isExecutable(filename) {
    if (/[wW]in.*/.test(process.platform)) { return true; }
    var stat = fs.statSync(filename);
    var mode = parseInt((stat.mode & parseInt("777", 8))
                        .toString(8)[0]);
    return mode & 1;
}

function load_plugins(file) {
    try {
        var func = require(file);
        func(jw);
        console.log("[INIT] %s", file);
    } catch (error) {
        console.error(file, error);
    }
}
module.exports.load = function (_jw) {
    jw = _jw;
    var path = jw.base + '/init';
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (error) {
        return;
    }
    var files = fs.readdirSync(path).sort();
    for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        var file = path + "/" + filename;
        if (isExecutable(file)) {
            if (!/.*\.js$/.test(filename)) { continue; }
            if (/.*[~#%]$/.test(filename)) { continue; }
            load_plugins(file);
        }
    };
};


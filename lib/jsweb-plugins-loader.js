var fs = require('fs');
var express = null;
function isExecutable(filename) {
    var stat = fs.statSync(filename);
    var mode = parseInt((stat.mode & parseInt ("777", 8)).toString (8)[0]);
    return mode & 1;
}

function load_plugins(file) {
    try {
        var func = require(file);
        func(express);
        console.log("[PLUGINS] %s loaded", file);
    } catch (error) {
        console.error(file, error);
    }
};
module.exports.load = function (web, plugins_home) {
    express = web;
    try {
        fs.accessSync(plugins_home, fs.F_OK);
    } catch (error) {
        return;
    }
    var files = fs.readdirSync(plugins_home).sort();
    for (var i = 0; i < files.length; i++) {
        filename = files[i];
        var file = plugins_home + "/" + filename;
        if (isExecutable(file)) {
            if (/.*[~#%]$/.test(filename)) { continue; }
            if (/.*_flymake\.js$/.test(filename)) { continue; }
            load_plugins(file);
        }
    };
};


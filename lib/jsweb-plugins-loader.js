var fs = require('fs');
var jw = null;
function isExecutable(filename) {
    if (/[wW]in.*/.test(process.platform)) { return true; };
    var stat = fs.statSync(filename);
    var mode = parseInt((stat.mode & parseInt ("777", 8)).toString (8)[0]);
    return mode & 1;
}

function load_plugins(file) {
    try {
        var func = require(file);
        func(jw);
        console.log("[PLUGINS] %s loaded", file);
    } catch (error) {
        console.error(file, error);
    }
};
module.exports.load = function (_jw, plugins_home) {
    jw = _jw;
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


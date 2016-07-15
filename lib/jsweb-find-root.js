var fs = require('fs');
module.exports = function (home) {
    try {
        var files = fs.readdirSync(home);
    } catch (error) {
        console.error(error);
        return null
    }
    var result = {
        path   : home + '/root',
        is_api : false
    };
    for (var i = 0; i < files.length; i++) {
        var name = files[i];
        var tokens = [];
        if (name.indexOf("::") >= 0) {
            tokens = name.split("::");
        } else if (name.indexOf("#") >= 0) {
            tokens = name.split('#');
        } else {
            tokens = [name];
        }
        var folder = tokens.splice(-1).join();
        if (folder.toLowerCase() !== 'root') { continue; };
        if (tokens.indexOf('api') < 0) { continue; };
        result = {
            path   : home + '/' + name,
            is_api : true
        }
        break;
    }
    return result;
};

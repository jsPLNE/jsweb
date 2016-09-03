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
        var folder = files[i].toLowerCase();
        var name = folder;
        var tags = [];
        if (name === 'root') {
        } else if (/^root\(.*\)/.test(name)) {
            tags = name.match(/\(.*\)/g).join()
                .replace(/[\(\)]/g, "").split(';');
            name = name.replace(/\(.*/, '');
        } else {
            continue;
        }
        result = {
            root   : home + '/' + folder,
            path   : '',
            is_api : tags.indexOf("api") >= 0,
            tags   : []
        }
        break;
    }
    return result;
};

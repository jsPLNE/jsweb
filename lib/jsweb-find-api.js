var fs = require('fs');
module.exports = function find_api(root) {
    try {
        var files = fs.readdirSync(root);
    } catch (error) {
        return [];
    }
    var result = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!/^.*\(.*\)/.test(file)) {
            continue;
        }
        var tags = file.match(/\(.*\)/g)
            .join()
            .toLowerCase()
            .replace(/[\(\)]/g, "")
            .split(';');
        if (tags.length === 0) { continue; };
        if (tags.indexOf("api") < 0) { continue; };
        var path = file.replace(/\(.*/, '');

        result.push({
            base : root + "/" + file,
            path : "/" + path
        });
    };
    return result;
}

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
        var tokens = file.split("::");
        if (tokens.length === 1) { continue; };
        var method = tokens.splice(-1);
        for (var j = 0; j < tokens.length; j++) {
            tokens[j] = tokens[j].toUpperCase();
        }
        if (tokens.indexOf("API") < 0) { continue; };
        result.push({
            base : root + "/" + file,
            method : "/" + method
        });
    };
    console.log(result);
    return result;
}

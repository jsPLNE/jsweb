'use strict';
/*jslint vars: true*/
function is_api_file(file) {
    if (!/\.js$/.test(file)) { return false; }
    if (/.*[~#]$/.test(file)) { return false; }
    if (/.*_flymake\.js$/.test(file)) { return false; }
    var uri = file.slice(root.lenth);
    var tags = file.match(/(\([^\/.]+\))/g).join().replace(/[\(\)]/g, ';').split(';');
    if (tags.indexOf('api') < 0) {
        return false;
    }
    return true;
}
function parse_api_method(file) {
    var methods = file.match(/\/.*\((.*?)\)\.js$/);
    if (methods) {
        methods = methods[1]
            .toUpperCase()
            .split(';');
        for (var i = methods.length - 1; i > 0; i--) {
            if (!methods[i]) { methods.splice( i - 1, 1)}
        }
    }
    return methods || ["GET"];
}

function is_param_api(file) {
    return /\/[^\/.]*\(param\)/.test(file);
}

function parse_params(uri_with_tags) {
    var uri = uri_with_tags;
    var tag = "(param)";
    var result = {
        pattern  : null,
        names     : []
    };
    var i = uri.indexOf(tag);
    if (i < 0) { return null; };
    while (i > 0) {
        var j = i;
        while (j > 0 && uri[j] != '/') {j--;}
        result.names.push(uri.substring(j + 1, i));
        i = uri.indexOf(tag, i + tag.length);
    }
    result.pattern =
        uri.replace(/[^\/.]*?\(param\)/g, '____param_pattern____')
        .replace(/\([^\/.]*?\)/g, '')
        .replace(/\.js$/, '')
        .replace(/\//g, '\\/')
        .replace(/____param_pattern____/g, '([^\\/.]+?)');
    result.pattern = new RegExp(result.pattern);
    return result;
}
function API_Parser(root, file) {
    this.root = root;
    this.file = file;
    if (!is_api_file(file)) {
        console.error("not a api file");
        return;
    }
    
    var methods = parse_api_method(file);
    var api = {
        file    : file,
        methods : methods
    };
    
    if (is_param_api(file)) {
        var params = parse_params(file.slice(root.length));
        if (!params) { console.error("Invalid params api", file); return; };
        api.type    = 'params';
        api.pattern = params.pattern;
        api.names   = params.names;
    } else {
        api.type = 'regular';
        api.uri  = file.slice(root.length).replace(/\.js$/, '').replace(/\(.*?\)/g, '');
    }
    console.log(api);
    return api;
    var result = {
        filename : filename,
        uri      : uri,
        methods  : methods
    };
    var func = null;
    try {
        func = require(api.filename);
        if (typeof func !== 'function') {
            console.error("not a valid js script: ",
                          api.filename);
            return;
        }
    } catch (error) {
        console.error(file, error);
        return;
    }
    for (var i = 0; i < api.methods.length; i++) {
        var method = api.methods[i];
        console.log("[LOADED]: [%s]\thttp://%s:%s%s",
                    method, this.jw.host,
                    this.port, api.path);
        this.handles[method][api.path] = {func : func};
    }
};


module.exports = API_Parser;
return;

var api;
var file = root + '/jsweb(api)/abc(post;put).js'
api = load(file);
var file = root + '/jsweb(api)/abc(post;put).js'
api = load(file);
var file = root + '/jsweb(api)/id(param)/path/abc(post;put).js'
api = load(file);
var file = root + '/jsweb(api)/id(param)/member(param)/p1(param)/p2(param)/abc(post;put).js'
api = load(file);
var uri = '/jsweb/123/gxy/22/33/abc';
console.log("match result", uri, uri.match(api.pattern).splice(1), api.names)
var file = root + '/jsweb(api)/id(param)/member/p1(param)/p2(param)/abc(post;put).js'
api = load(file);
var uri = '/jsweb/123/member/22/33/abc';
console.log("match result", uri, uri.match(api.pattern).splice(1), api.names)

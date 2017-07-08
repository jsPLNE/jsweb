'use strict';
var fs = require("fs");
/*jslint vars:true*/


Date.prototype.format = function (format) {
    var k, o;
    o = {
        "M+" : this.getMonth() + 1, //month
        "d+" : this.getDate(),      //day
        "h+" : this.getHours(),     //hour
        "m+" : this.getMinutes(),   //minute
        "s+" : this.getSeconds(),   //second
        "q+" : Math.floor((this.getMonth() + 3) / 3), //quarter
        "S"  : this.getMilliseconds() //millisecond
    };
    if (/(y+)/.test(format)) {
        format = format.replace(
            RegExp.$1,
            (this.getFullYear() + '').substr(4 - RegExp.$1.length)
        );
    }
    for (k in o) {
        if (o.hasOwnProperty(k)) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(
                    RegExp.$1,
                    RegExp.$1.length === 1
                        ? o[k]
                        : ("00" + o[k]).substr(('' + o[k]).length));
            }
        }
    }
    return format;
};
Date.prototype.now = function (format) {
    if (!format) {
        format = "yyyy-MM-dd hh:mm:ss";
    }
    return this.format(format);
};


function parse_api_method(uri) {
    var methods = uri.match(/\/.*\((.*?)\)\.js$/);
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
function is_param_api(uri) {
    return /\/[^\/.]*\(.*\bparam\b.*\)/.test(uri);
}
function parse_params(uri_with_tags) {
    uri_with_tags = uri_with_tags
        .replace(/\.js$/, '')
        .replace(/\/index?$/, '');
    var result = {
        pattern  : [],
        names    : [],
    };
    var fields = uri_with_tags.split('/');
    var rest = false;
    fields.forEach(function (field) {
        var ret = field.match(/(.*)\((.*)\)/);
        if (ret) {
            var tags = ret[2].split(';');
            var name = ret[1];
            if (tags.indexOf('param') >= 0) {
                result.names.push(name);
                result.pattern.push('([^\\/]+)');
                if (tags.indexOf('final') >= 0) {
                    rest = true;
                }
            } else {
                result.pattern.push(ret[1]);
            }
        } else {
            result.pattern.push(field);
        }
    });
    result.pattern = result.pattern.join('/');
    if (rest) {
        result.names.push("final");
        result.pattern = result.pattern + '(.*)';
    }
    result.pattern = '^' + result.pattern + '$';

    result.pattern = new RegExp(result.pattern);
    return result;
}

function parse_params_old(uri_with_tags) {
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
        .replace(/\/index?$/, '')
        .replace(/\//g, '\\/')
        .replace(/____param_pattern____/g, '([^\\/]+)');

    result.pattern = '^' + result.pattern + '$';
    result.pattern = new RegExp(result.pattern);
    return result;
}
function isExecutable(filename) {
    if (/[wW]in.*/.test(process.platform)) { return true; };
    try {
        var stat = fs.statSync(filename);
        var mode = parseInt((stat.mode & parseInt ("777", 8)).toString (8)[0]);
    } catch (error) {
        return false;
    }
    return mode & 1;
}

require.searchCache = function (moduleName, callback) {
    var mod = require.resolve(moduleName);

    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function (child) {
                run(child);
            });
            callback(mod);
        })(mod);
    }
};

require.uncache = function (moduleName) {
    require.searchCache(moduleName, function (mod) {
        console.log("delete cache", mod.id);
        delete require.cache[mod.id];
    });
    Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
        if (cacheKey.indexOf(moduleName) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

function API_manager(jw) {
    this.jw          = jw
    this.params_apis = [];
    this.handles     = {};
    this.debug       = jw.config.debug;
    this.recursive   = true;
    this.recursive_level = 0;
    if (/.*\(api\)$/.test(this.jw.root)) {
        this.root_api = true;
    } else {
        this.root_api = false;
    }
    this.load_apis(this.jw.root);
    this.jw.app.all("*", this.on_request.bind(this));
}

function parse_param(uri, handle) {
    var values = uri.match(handle.regex);
    if (!values) { return null;};
    if (values.length !== handle.params.length) { return null; };
    var result = {};
    for (var i = 0; i < values.length; i++) {
        result[handle.params[i]] = values[i]
    }
    return result;
}

API_manager.prototype.is_api_uri = function (uri) {
    if (!/\.js$/.test(uri)) { return false; }
    if (/\.\#[^\/.]*\.js$/.test(uri)) { return false; }
    if (/.*_flymake\.js$/.test(uri)) { return false; }
    if (this.root_api && uri.indexOf('/', 1) < 0 ) {
        return true;
    };
    var tags = uri.match(/(\([^\/.]+\))/g);
    if (!tags) { return false; };
    tags = tags.join().replace(/[\(\)]/g, ';').split(';');
    if (tags.indexOf('api') < 0 && tags.indexOf('param') < 0 ) {
        return false;
    }
    return true;
}

API_manager.prototype.parse_api = function (file) {
    var uri = file.slice(this.jw.root.length);
    if (!this.is_api_uri(uri)) {
        return null;
    }
    var methods = parse_api_method(uri);
    var api = {
        file    : file,
        methods : methods
    };
    if (is_param_api(uri)) {
        var params = parse_params(uri);
        if (!params) { console.error("Invalid params api", file); return; };
        api.type    = 'params';
        api.pattern = params.pattern;
        api.names   = params.names;
    } else {
        api.type = 'regular';
        api.uri  = uri.replace(/\.js$/, '').replace(/\(.*?\)/g, '');
    }
    return api;
};


API_manager.prototype.unload_api = function (file) {
    var api = this.parse_api(file);
    if (!api) { return; }
    if (api.type === 'regular') {
        for (var i = 0; i < api.methods.length; i++) {
            var method = api.methods[i];
            delete this.handles[method + '/' + api.uri];
            this.remove_route(method, api.uri);
            console.log("[DELETE]: \t[%s]\t"
                        + this.jw.port.protocol + "://%s:%s%s",
                        method, this.jw.hostname,
                        this.jw.port.port, api.uri);
        }
    } else if (api.type === 'params') {
        for (var i = 0; i < this.params_apis.length; i++) {
            var api = this.params_apis[i];
            if (api.file === file) {
                this.params_apis.slice(i);
                console.log("[DELETE]: \t[%s]\t"
                            + this.jw.port.protocol + "://%s:%s%s",
                            api.methods, this.jw.hostname,
                            this.jw.port.port, api.pattern);
                break;
            }
        }        
    }
    try {
        require.uncache(api.file);
    } catch (error) {
    }
};
API_manager.prototype.load_api = function (filename) {
    if (!isExecutable(filename)) { return; };
    var api = this.parse_api(filename);
    if (!api) { return; };
    var func = null;
    try {
        func = require(api.file);
        if (typeof func !== 'function') {
            console.error("not a valid js script: ",
                          api.file);
            return;
        }
    } catch (error) {
        console.error(api.file, error);
        return;
    }
    if (api.type === 'regular') {
        for (var i = 0; i < api.methods.length; i++) {
            var method = api.methods[i];
            console.log("[LOADED]: \t[%s]\t"
                        + this.jw.port.protocol + "://%s:%s%s",
                        method, this.jw.hostname,
                        this.jw.port.port, api.uri);
            this.handles[method + '/' + api.uri] = {func : func};
        }
    } else if (api.type === 'params') {
        api.func = func;
        this.params_apis.push(api);
        console.log("[LOADED]: \t[%s]\t"
                    + this.jw.port.protocol + "://%s:%s%s",
                    api.methods, this.jw.hostname,
                    this.jw.port.port, api.pattern);
    } else {
        console.erroe('Unsupport api type :', api);
    }
};

API_manager.prototype.on_request = function (req, res, next) {
    var uri = req.path;
    var uris = [];
    uris.push(uri);
    uris.push(uri + 'index');
    uris.push(uri + '/index');
    var handle = null;
    for (var i = 0; i < uris.length; i++) {
        handle = this.handles[req.method + '/' + uris[i]];
        if (handle) { break; }
    }
    if (handle) {
        if (req.jw.config.debug) {
            console.log("[" + (new Date()).now() + "]:",
                        req.jw.hostname, req.jw.port.port,
                        req.method, req.path, req.query || req.params);
        }
        handle.func(req, res, next);
    } else {
        for (var i = 0; i < this.params_apis.length; i++) {
            var api = this.params_apis[i];
            for (var j = 0; j < uris.length; j++) {
                var uri = uris[j];
                var values = uri.match(api.pattern);
                if (values) { values = values.slice(1); }
                if (values && (values.length === api.names.length)) {
                    req.params = {};
                    for (var i = 0; i < values.length; i++) {
                        req.params[api.names[i]] = values[i];
                    };
                    if (req.jw.config.debug) {
                        console.log("[" + (new Date()).now() + "]:",
                                    req.jw.hostname,
                                    req.jw.port.port,
                                    req.method, req.path, req.query || req.params);
                    }
                    api.func(req, res, next);
                    return;
                }
            }
        }
        next();
    }
};
/*
  a='/path/to/someone/something/go'.match(/^\/path\/to\/([^\/.]+?)\/([^\/.]+?)\/go?$/).splice(1)
*/
API_manager.prototype.load_apis = function (file) {
    if (!this.recursive && this.recursive_level > 1) { return; };
    this.recursive_level++;
    if (fs.statSync(file).isDirectory()) {
        if (!this.recursive && this.recursive_level > 1) {
            this.recursive_level--;
            return;
        }
        var fw  = fs.watch(file, this.file_monitor);
        fw.self = this;
        fw.path = file;
        fs.readdirSync(file).forEach(function (filename) {
            var filename = file + "/" + filename;
            if (isExecutable(filename)) {
                this.load_apis(filename)
            }
        }.bind(this));
    } else {
        this.load_api(file);
    }
    this.recursive_level--;
};

API_manager.prototype.remove_route = function (method, api) {
    var routers = this.jw.app._router.stack;
    var found  = false;
    for (var i = 0; i < routers.length; i++) {
        var route = routers[i].route;
        if (!route || !route.path || !route.method) { continue; }
        if (method === "GET") {
            if (route.path === api && route.method.get) {
                found = true;
                break;
            }
        } else if (method === "POST") {
            if (route.path === api && route.method.post) {
                found = true;
                break;
            }
        }
    }
    if (!found) { return; };
    routes.splice(i, 1);
};

API_manager.prototype.on_file_changed = function (event, path, filename) {
    // console.log("on file change event: ", event, path, filename);
    var is_dir = false;
    try {
        is_dir = fs.statSync(file).isDirectory();
    } catch (error) {
    }
    if (is_dir) {
        var fw = fs.watch(file, this.file_monitor);
        fw.self = this;
        fw.path = path + "/" + filename;
    } else {
        var file = path + '/' + filename;
        this.unload_api(file);
        this.load_api(file);
    }
    return;
};
API_manager.prototype.file_monitor = function (event, filename) {
    this.self.on_file_changed.call(this.self,
                                   event,
                                   this.path,
                                   filename);
    
};
function load(jw) {
    var api = new API_manager(jw);
    if (!jw.apis) { jw.apis = []; };
    jw.apis.push(api);
}

module.exports = {
    load : load
}

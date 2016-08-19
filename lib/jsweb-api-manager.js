'use strict';
var fs = require("fs");
/*jslint vars:true*/

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

function API_manager(jw, root, port, recursive) {
    if (root.slice(-1) === "/") {
        root = root.substring(0, root.length - 1);
    }
    this.jw          = jw
    this.root        = root;
    this.port        = port;
    this.path        = null;
    this.handles     = {};
    this.debug       = false;
    this.recursive   = true;
    this.recursive_level = 0;
    if (typeof recursive === 'boolean') {
        this.recursive   = recursive;
    }
}

API_manager.prototype.on_request = function (req, res, next) {
    var path = req.path;
    if (path === '/'
        && this.handles
        && this.handles['GET']
        && this.handles['GET']['/index']) {
        path = '/index';
    }
    if (this.handles[req.method]
        && this.handles
        && this.handles[req.method]
        && this.handles[req.method][path]) {
        if (this.debug) {
            console.log("[API call]: ", req.method, req.path);
        }
        req.jw = this.jw;
        this.handles[req.method][path].func(req, res, next);
    } else {
        next();
    }
};
API_manager.prototype.get_method = function (filename) {
    var i = filename.lastIndexOf(".");
    if (i < 0) { return null; }
    var api = filename.substring(0, i);
    var ext = filename.substring(i + 1);
    if (ext !== 'js') { return null; }
    var method = "GET";
    if (api.slice(-1) === ']') {
        i = api.lastIndexOf("[");
        if (i > 0) {
            method = api.substring(i + 1);
            method = method.substring(0, method.length - 1);
            api    = api.substring(0, i);
        }
    }
    return method;
};
API_manager.prototype.load_apis = function (file, route) {
    if (!this.recursive && this.recursive_level > 1) { return; };
    this.recursive_level++;
    if (fs.statSync(file).isDirectory()
       && (this.recursive || this.recursive_level <= 1)) {
        var fw  = fs.watch(file, this.file_monitor);
        fw.self = this;
        fw.path = file;
        fs.readdirSync(file).forEach(function (filename) {
            if (isExecutable(file + "/" + filename)) {
                if (/.*[~#]$/.test(filename)) { return; }
                if (/.*_flymake\.js$/.test(filename)) { return; }
                this.load_apis(file + "/" + filename,
                               route + "/" + filename);
            }
        }.bind(this));
    } else {
        var i = route.lastIndexOf(".");
        if (i < 0) {
            this.recursive_level--;
            return;
        }
        var api = route.substring(0, i);
        var ext = route.substring(i + 1);
        if (ext !== 'js') {
            this.recursive_level--;
            return;
        }
        var method = "GET";
        if (api.slice(-1) === ']') {
            i = api.lastIndexOf("[");
            if (i > 0) {
                method = api.substring(i + 1);
                method = method.substring(0, method.length - 1);
                api    = api.substring(0, i);
            }
        }
        var func = null;
        try {
            func = require(file);
            if (typeof func !== 'function') {
                console.error("not a valid js script: ", file);
                this.recursive_level--;
                return;
            }
        } catch (error) {
            console.error(file, error);
            this.recursive_level--;
            return;
        }
        var rec = {
            method : method,
            func   : func,
            route  : api,
            file   : file
        };
        console.log("[LOADED]: [%s]\thttp://host:%s%s",
                    method, this.port, api);
        if (!this.handles[method]) { this.handles[method] = {}; }
        this.handles[method][api] = {func : func};
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
    var file = path + "/" + filename;
    var is_dir = false;
    try {
        is_dir = fs.statSync(file).isDirectory();
    } catch (error) {
    }
    if (is_dir) {
        console.log("[API NEW DIRECTORY]", file);
        var fw = fs.watch(file, this.file_monitor);
        fw.self = this;
        fw.path = file;
    } else {
        var exists = isExecutable(file);
        var method, api;
        if (!exists) {
            if (!/\.js$/.test(filename)) { return; }
            if (/^\.\#/.test(filename)) { return; }
            if (/.*_flymake\.js$/.test(filename)) { return; }
            if (/\.js$/.test(file)) {
                method = this.get_method(file);
                if (!method) { return; }
                api = this.path + file.substring(this.root.length);
                api = api.substring(0, api.length - 3);
                delete this.handles[method][api];
                this.remove_route(method, api);
                require.uncache(file);
                console.log("[DELETE]: [%s]\thttp://host:%s%s",
                            method, this.port, api);
                return;
            }
        } else {
            if (!/\.js$/.test(filename)) { return; }
            if (/^\.\#/.test(filename)) { return; }
            if (/.*_flymake\.js$/.test(filename)) { return; }
            if (/\.js$/.test(file)) {
                method = this.get_method(file);
                if (!method) { return; }
                api = this.path + file.substring(this.root.length);
                api = api.substring(0, api.length - 3);
                delete this.handles[method][api];
                this.remove_route(method, api);
                require.uncache(file);
                var func = null;
                try {
                    func = require(file);
                    if (typeof func !== 'function') { return; }
                } catch (error) {
                    console.error(file, error);
                    return;
                }
                if (!this.handles[method]) { this.handles[method] = {}; }
                this.handles[method][api] = {func : func};
                console.log("[CHANGED]: [%s]\thttp://host:%s%s",
                            method, this.port, api);
                return;
            }
        }
    }
    return;
};
API_manager.prototype.file_monitor = function (event, filename) {
    this.self.on_file_changed.call(this.self,
                                   event,
                                   this.path,
                                   filename);
    
};
API_manager.prototype.mount = function (path) {
    try {
        fs.accessSync(this.root, fs.F_OK);
    } catch (error) {
        return;
    }
    if (path.slice(-1) === "/") {
        path = path.substring(0, path.length - 1);
    }
    this.path        = path;
    this.jw.app.all("*", this.on_request.bind(this));
    this.load_apis(this.root, this.path);
};

module.exports = API_manager;

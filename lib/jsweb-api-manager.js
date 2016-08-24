'use strict';
var fs = require("fs");
/*jslint vars:true*/

function parse_api_filename(root, base, filename) {
    if (!/\.js$/.test(filename)) { return null; }
    var api = base + filename.substring(root.length).slice(0, -3);
    var methods = ["GET"];
    if (/.*\(.*\)/.test(api)) {
        methods = api.match(/\(.*\)/g)
            .join()
            .toUpperCase()
            .replace(/[\(\)]/g, "")
            .split(';');
        api = api.replace(/\(.*/, '');
        for (var i = methods.length - 1; i > 0; i--) {
            if (!methods[i]) { methods.splice( i - 1, 1)}
        }
    }
    var result = {
        filename : filename,
        path     : api,
        methods  : methods
    };
    return result;
};

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
API_manager.prototype.load_apis = function (file, route) {
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
            if (isExecutable(file + "/" + filename)) {
                if (/.*[~#]$/.test(filename)) { return; }
                if (/.*_flymake\.js$/.test(filename)) { return; }
                this.load_apis(file + "/" + filename,
                               route + "/" + filename);
            }
        }.bind(this));
    } else {
        var api = parse_api_filename(this.root, this.path, file);
        if (!api) { return; };
        var func = null;
        try {
            func = require(api.filename);
            if (typeof func !== 'function') {
                console.error("not a valid js script: ",
                              api.filename);
                this.recursive_level--;
                return;
            }
        } catch (error) {
            console.error(file, error);
            this.recursive_level--;
            return;
        }
        for (var i = 0; i < api.methods.length; i++) {
            var method = api.methods[i];
            console.log("[LOADED]: [%s]\thttp://%s:%s%s",
                        method, this.jw.host,
                        this.port, api.path);
            if (!this.handles[method]) {
                this.handles[method] = {};
            }
            this.handles[method][api.path] = {func : func};
        }
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
        if (!isExecutable(file)) {
            var api = parse_api_filename(this.root, this.path, file);
            if (!api) { return; }
            for (var i = 0; i < api.methods; i++) {
                var method = api.methods[i];
                delete this.handles[method][api.path];
                this.remove_route(method, api.path);
                console.log("[DELETE]: [%s]\thttp://host:%s%s",
                            method, this.port, api.path);
            }
            require.uncache(api.filename);
            return;
        } else {
            var api = parse_api_filename(this.root, this.path, file);
            if (!api) { return; }
            for (var i = 0; i < api.methods; i++) {
                var method = api.methods[i];
                delete this.handles[method][api.path];
                this.remove_route(method, api.path);
            }
            require.uncache(api.filename);
            var func = null;
            try {
                func = require(api.filename);
                if (typeof func !== 'function') { return; }
            } catch (error) {
                console.error(file, error);
                return;
            }
            for (var i = 0; i < api.methods; i++) {
                var method = api.methods[i];
                if (!this.handles[method]) {
                    this.handles[method] = {};
                }
                this.handles[method][api.path] = {func : func};
                console.log("[CHANGED]: [%s]\thttp://host:%s%s",
                            method, this.port, api.path);
            }
            return;
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

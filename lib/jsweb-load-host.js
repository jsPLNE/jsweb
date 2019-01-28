'use strict';
/*jslint vars:true*/
var fs      = require('fs');
var express = require('express');
var API_man = require("./jsweb-api-manager.js");
var init = require("./jsweb-init.js");

function async_init(jw, funcs, done) {
    if (funcs.length === 0) {
        done();
    } else {
        funcs[0](jw, function () {
            funcs.shift();
            async_init(jw, funcs, done);
        });
    }
}

function load_lib(jw, lib, folder, key_path) {
    try {
        fs.readdirSync(folder).forEach(function (key) {
            var path = folder + "/" + key;
            if (fs.statSync(path).isDirectory()) {
                lib[key] = {};
                load_lib(jw, lib[key], path, key_path = key_path + '.' + key);
            } else {
                if (!/.*js$/.test(key)
                    && !/.*jso$/.test(key)) {
                    return;
                }
                try {
                    key = key.replace(/\.js$/, '');
                    var func = require(path);
                    if (typeof func === 'function') {
                        func = func.bind(jw);
                    }
                    lib[key] = func;
                    console.log("[jw.lib" + key_path + '.' + key + "] Loaded ..");
                } catch(e) {
                    console.error(e);
                    process.exit(1);
                }
            }
        }.bind(this));
    } catch (e) {
    }
}

function load_host(host, next) {
    var jw = host;
    jw.app = express();
    jw.mu   = new require('mu2');
    jw.mu.root = jw.home + '/views';
    jw.app.set('views', jw.mu.root);
    jw.app.engine("hjs",  function (path, options, fn) {
        var result = "";
        var view  = options._locals || {};
        this.mu.compileAndRender(path, view)
            .on('data', function (data) {
                result += data;
            }).on('end', function () {
                fn(null, result);
            }).on('error', function (e) {
                fn(e);
            });
    }.bind(jw));
    jw.lib = {};
    load_lib(jw, jw.lib, jw.home + "/lib", "");
    var funcs = init.load(jw);
    async_init(jw, funcs, function () {
        API_man.load(jw);
        // var st = require('st');
        var serveStatic = require('serve-static');
        // var mount = new st({
        //     path        : jw.root,
        //     url         : '/',
        //     cache       : jw.config["cache-static"] || false,
        //     index       : "index.html",
        //     dot         : true,
        //     passthrough : true,
        //     gzip        : true
        // });
        // jw.app.use(mount);
        jw.app.use(serveStatic(jw.root, {
            'acceptRanges' : true
        }));
        console.log("Host :%s load done.", jw.hostname);
        next();
    });
}

var hosts = [];
function load_hosts(list, done) {
    if (list.length === 0) {
        var main = express();
        main.use(function (req, res, next) {
            for (var i = 0; i < hosts.length; i++) {
                if (hosts[i].hostname === req.hostname) {
                    req.jw = hosts[i];
                    hosts[i].app(req, res, next);
                    return;
                }
            }
            for (var i = 0; i < hosts.length; i++) {
                if (hosts[i].hostname === '*') {
                    req.jw = hosts[i];
                    hosts[i].app(req, res, next);
                    return;
                }
            }
        });
        done(null, main);
    } else {
        load_host(list[0], function () {
            list.shift();
            load_hosts(list, done);
        });
    }
}

function load(list, done) {
    hosts = list.slice(0);
    load_hosts(list, done);
}
module.exports = {
    load : load
};

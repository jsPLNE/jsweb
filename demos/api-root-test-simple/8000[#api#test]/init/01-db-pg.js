var web;
var pg = require('pg');
var fs = require('fs');
var config = {
    database : 'database', //env var: PGDATABASE
    host     : "db.host.com", //env var: PGPORT
    user     : "username",
    port     : 5432, //env var: PGPORT
    max      : 50, // max number of clients in the pool
    idleTimeoutMillis: 30000,
    ssl : {
        rejectUnauthorized : false,
        ca   : fs.readFileSync(process.env.HOME + "/.postgresql/root.crt").toString(),
        key  : fs.readFileSync(process.env.HOME + "/.postgresql/postgresql.key").toString(),
        cert : fs.readFileSync(process.env.HOME + "/.postgresql/postgresql.crt").toString()
    }
};
// module.exports = new pg.Pool(config);
module.exports = function (express) {
    web      = express;
    var jsweb = express.jsweb;
    if (!jsweb.db) {
        jsweb.db = {};
    }
    jsweb.db.pg = new pg.Pool(config);
}


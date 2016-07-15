var web;
var pg = require('pg');
var fs = require('fs');
var config = {
    database : 'cos', //env var: PGDATABASE
    host     : "db.jcos.cc", //env var: PGPORT
    user     : "cos",
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
    web     = express;
    var swas = web.swas;
    swas.plugins.db = new pg.Pool(config);
}


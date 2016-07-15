var mysql = require("mysql");
var db;

function make_mysql_connection () {
    db = mysql.createPool({
        host		: 'localhost',
        port		: 3306,
        user		: 'user',
        password	: 'password',
        database	: 'database',
        dateStrings	: true,
	    multipleStatements : true,
    });
    return db;
};

module.exports = function (express) {
    web      = express;
    var jsweb = express.jsweb;
    if (!jsweb.db) {
        jsweb.db = {};
    }
    jsweb.db.mysql = make_mysql_connection();
}


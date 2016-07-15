module.exports = function stat(req, res, next) {
    if (req.query.brand && req.query.model) {
        var db = req.app.jsweb.db.mysql;
	    var sql   = ' select * from some_table; ';
	    var param = [req.query.brand, req.query.model];
	    db.getConnection(function (err, dbConnection) {
	        if (err) {
                console.log(err);
                res.status(500).end();
                return;
            };
	        dbConnection.query(sql, param, function (err, recordsets) {
		        dbConnection.destroy();
		        if (err) {
		            res.status(500).end(JSON.stringify(err));
		        } else {
                    res.end(JSON.stringify(recordsets))
                }
            })
        })
    } else {
	    res.status(400).end();
    }
};

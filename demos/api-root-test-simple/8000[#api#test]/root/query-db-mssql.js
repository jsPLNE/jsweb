module.exports = function stat(req, res, next) {
    if (req.query.brand && req.query.model) {
        var db = req.app.jsweb.db.mssql;
	    var sql   = ' select * from some_table; ';
	    var param = [req.query.brand, req.query.model];
        db.query(sql, [], function (err, recordsets) {
            if (err) {
                console.log("[error update things runtime]", err);
                if (callback) { callback(err); }
            } else {
                res.end(JSON.stringif(recordsets));
            }
        });
    } else {
	    res.status(400).end();
    }
};

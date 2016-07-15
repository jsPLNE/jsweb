module.exports = function (req, res) {
    res.end(JSON.stringify(req.query));
}

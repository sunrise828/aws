var config = require('config');
var async = require('async');
var db = require('../../db');
var moment = require('moment');
var dbConnection = db.createConnection();


module.exports = {    
    getAll: function(req, res, next) {
        var sql = "SELECT a.*, b.picIds FROM student AS a \
        LEFT JOIN (SELECT GROUP_CONCAT(picId) picIds, studentId FROM images GROUP BY studentId) AS b ON a.id=b.studentId \
        ORDER BY a.id DESC ";

        dbConnection.query({sql: sql}, [], function(error, results) {
            if (error) res.json({status: "error", message: "Server error! Please contact webmaster!"});
            else {
                var _students = [];
                if (results.length > 0) {
                    results.forEach(element => {
                        _students.push({
                            id: element.id,
                            name: element.name,
                            picIds: element.picIds? element.picIds.split(","): []
                        })
                    });
                }
                res.json({status: "success", data: _students});
            }
        });        
    },

    get: function(req, res, next) {
        var id = req.params.id;
        if (!id || typeof id == "undefined") 
            return res.json({status: "error", message: "There isn't enough information on your request"});

        async.waterfall([
            function(callback) {
                var sql = "SELECT id, name FROM student WHERE id=?";
                dbConnection.query({sql: sql}, [id], function(error, results) {
                    if (error) callback(null, false, {status: "error", message: "Server error! Please contact webmaster!"});
                    else {
                        var _student = null;
                        if (results.length > 0) {
                            results.forEach(element => {
                                _student = {
                                    id: element.id,
                                    name: element.name                                    
                                };
                            });
                        }
                        if (_student) callback(null, _student, null);
                        else callback(null, false, {status: "error", message: "Server error! Please contact webmaster!"})                        
                    }
                });
            },
            function(item, msg, callback) {
                if (!item) return callback(false, msg);
                var sql = "SELECT GROUP_CONCAT(picId) picIds, 1 l  FROM images WHERE studentId=? GROUP BY l";
                dbConnection.query({sql: sql}, [item.id], function(error, results) {
                    if (error) callback(false, {status: "error", message: "Server error! Please contact webmaster!"});
                    else {                        
                        if (results.length > 0) {
                            results.forEach(element => {
                                item.picIds = element.picIds;
                            });
                        }
                        callback(item, null);                        
                    }
                });
            }
        ], function(item, msg) {
            if (!item) res.json({status: 'error', message: msg});
            else res.json({status: 'success', student: item});
        });                
    },

    create: function(req, res, next) {
        async.waterfall([
            function(callback) {
                var sql = "INSERT INTO student(name) VALUES(?);";
                dbConnection.query({sql: sql}, [req.body.name], function(error, results) {
                    if (error) callback(null, null, {status: "error", message: "Server error! Please contact webmaster!"});
                    else {                        
                        if (results.affectedRows > 0) {
                            callback(null, results, null);
                        } else {
                            callback(null, null, {status: "error", message: "Server error! Please contact webmaster!"});
                        }                        
                    }
                });        
            },
            function(student, msg, callback) {
                if (!student) return callback(true, msg);
                var picIds = req.body.picIds.split(",");
                var eachNum = 0;
                async.eachSeries(picIds, function(item, eachCallback) {
                    async.waterfall([
                        function(callback_1) {
                            var sql = "INSERT INTO images(picId, studentId) VALUES(?, ?);";
                            dbConnection.query({sql: sql}, [item, student.insertId], function(error, results) {
                                if (error) callback_1(true, {status: "error", message: "Server error! Please contact webmaster!"});
                                else {                        
                                    if (results.affectedRows > 0) {
                                        callback_1(false, results);
                                    } else {
                                        callback_1(true, {status: "error", message: "Server error! Please contact webmaster!"});
                                    }                        
                                }
                            });
                        }
                    ], function(error, msg) {
                        if (error) callback(true, msg);
                        else {
                            eachNum++;
                            if (eachNum == picIds.length) {
                                callback(false, null);
                            } else {
                                eachCallback();
                            }
                        }
                    });
                })
            }
        ], function(error, msg) {
            if (error) res.json({status: 'error', message: msg});
            else res.json({status: "success", message: "Success added Student!"});
        });
    },

    update: function(req, res, next) {
        async.waterfall([
            function(callback) {
                var sql = "UPDATE student SET name=? WHERE id=?";
                dbConnection.query({sql: sql}, [req.body.name, req.body.id], function(error, results) {
                    if (error) callback(null, null, {status: "error", message: "Server error! Please contact webmaster!"});
                    else {                        
                        if (results.affectedRows > 0) {
                            callback(null, results, null);
                        } else {
                            callback(null, null, {status: "error", message: "Server error! Please contact webmaster!"});
                        }                        
                    }
                });        
            },
            function(student, msg, callback) {
                if (!student) return callback(true, msg);
                var picIds = req.body.picIds.split(",");
                var eachNum = 0;
                async.eachSeries(picIds, function(item, eachCallback) {
                    async.waterfall([
                        function(callback_1) {
                            var sql = "SELECT id FROM images WHERE picId=? AND studentId=?;";
                            dbConnection.query({sql: sql}, [item, req.body.id], function(error, results) {
                                if (error) callback_1(true, {status: "error", message: "Server error! Please contact webmaster!"});
                                else {                        
                                    if (results.length > 0) {
                                        callback_1(false, results);
                                    } else {
                                        var sql = "INSERT INTO images(picId, studentId) VALUES(?, ?);";
                                        dbConnection.query({sql: sql}, [item, req.body.id], function(error, results) {
                                            if (error) callback_1(true, {status: "error", message: "Server error! Please contact webmaster!"});
                                            else {                        
                                                if (results.affectedRows > 0) {
                                                    callback_1(false, results);
                                                } else {
                                                    callback_1(true, {status: "error", message: "Server error! Please contact webmaster!"});
                                                }                        
                                            }
                                        });                                        
                                    }                        
                                }
                            });
                        }
                    ], function(error, msg) {
                        if (error) callback(true, msg);
                        else {
                            eachNum++;
                            if (eachNum == picIds.length) {
                                callback(false, null);
                            } else {
                                eachCallback();
                            }
                        }
                    });
                })
            }
        ], function(error, msg) {
            if (error) res.json({status: 'error', message: msg});
            else res.json({status: "success", message: "Success added Student!"});
        });        
    },

    delete: function(req, res, next) {
        if (!req.params.id || typeof req.params.id == "undefined") return res.json({status: "error","message": "There isn't image id"});
        var sql = "DELETE FROM student WHERE id=?";
        dbConnection.query({sql: sql}, [req.params.id], function(error, results) {
            if (error) res.json({status: "error", message: "Server error! Please contact webmaster!"});
            else {  
                if (results.affectedRows > 0) {
                    var sql = "DELETE FROM images WHERE studentId=?";
                    dbConnection.query({sql: sql}, [req.params.id], function(error, results) {
                        if (error) res.json({status: "error", message: "Server error! Please contact webmaster!"});
                        else {  
                            res.json({status: "success", message: "Successful deleted"});                                            
                        }
                    });
                } else {
                    res.json({status: "success", message: "Successful deleted"});
                }               
            }
        });
    }
}
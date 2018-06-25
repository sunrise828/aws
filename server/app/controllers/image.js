var path = require('path');
var db = require('../../db');
var async = require('async');
var config = require('config');
var moment = require('moment');

var DIR = './uploads/';
var dbConnection = db.createConnection();

module.exports = {
    get: function(req, res, next) {
        var id = req.body.id;
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
                var sql = "SELECT CONCAT(picId) picIds  FROM images WHERE studentId=?";
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
            else res.json({status: 'success', data: item});
        });                
    },

    create: function(req, res, next) {        
        res.json({"code": "test API call succeed!"});
    },

    update: function(req, res, next) {        
        res.json({"code": "test API call succeed!"});
    },

    delete: function(req, res, next) {
        if (!req.params.id || typeof req.params.id == "undefined") return res.json({status: "error","message": "There isn't image id"});
        var sql = "DELETE FROM images WHERE picId=?";
        dbConnection.query({sql: sql}, [req.params.id], function(error, results) {
            if (error) res.json({status: "error", message: "Server error! Please contact webmaster!"});
            else {
                if (results.affectedRows > 0)  
                    res.json({status: "success", message: "Successful deleted"});                
                else
                    res.json({status: "pending", message: "Successful deleted"});                
            }
        });
    }
}
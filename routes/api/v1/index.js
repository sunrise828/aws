var express = require("express");
var router = express.Router();
var controller = require('../../../server/app/controllers');
var moment = require('moment');
var config = require('config');
var async = require('async');
var fs = require('fs');
var cloudinary = require('cloudinary');

cloudinary.config({ 
    cloud_name: config.get("cloudinary.cloud_name"), 
    api_key: config.get("cloudinary.api_key"), 
    api_secret: config.get("cloudinary.api_secret") 
});

function genrate_string() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 15; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

module.exports = function (upload) {    

    router.post('/upload', upload.array('logoFile[]', 10), function (req, res) {
        console.log("image uploading");
        //res.json({status: "success", imagepath: req.file.filename});
        
        var ocount = 0;
        var imagePaths = [];                
        var ind = 0;
        async.eachSeries(req.files, function(file, eachCallback) {
            async.waterfall([
                function(callback) {
                    var tmp_path = file.path;
                    
                    cloudinary.uploader.upload(tmp_path, function(result) { 
                        if (result.error) callback(true, result.error.message);
                        else {
                            fs.unlinkSync(tmp_path);
                            callback(false, result.public_id);
                        }
                    });                                       
                }
            ], function(err, result) {
                if (err) res.json(result);
                else {
                    ocount ++;
                    if (ocount == req.files.length) {
                        imagePaths.push(result);
                        res.json({status: "success", "imagepath": imagePaths});
                    } else {
                        imagePaths.push(result);
                        eachCallback();
                    }
                }
            })
        });        
    });

    //get all students data
    router.route('/students').get(controller.student.getAll);

    // student api
    router.route('/student/:id').get(controller.student.get)
    .post(controller.student.create)
    .put(controller.student.update)
    .delete(controller.student.delete);

    // image api
    router.route('/image/:id').get(controller.image.get)
    .post(controller.image.create)
    .put(controller.image.update)
    .delete(controller.image.delete);   
    
    return router;
}
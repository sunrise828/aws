var config = require('config');
var async = require('async');
var db = require('../../db');
var qr = require('../../utils/qr');
var mail = require('../../app/services/mail');
var moment = require('moment');
var voucher_codes = require('voucher-code-generator');
var dbConnection = db.createConnection();
var wpDbConnection = db.createWpDbConnection();
var WooCommerceAPI = require('woocommerce-api');
var WooCommerce = new WooCommerceAPI({
    url: config.get('url'),
    consumerKey: config.get('woo.key'),
    consumerSecret: config.get('woo.secret'),
    wpAPI: true,
    version: 'wc/v2',
    queryStringAuth: true
});
module.exports = {

    qr: function(req, res, next) {
        if (req.body.id) {
            var req_type = req.body.type;
            if (req_type && req_type == 'email_me') {
                var expiryDate = moment(req.body.expiredate).add(60, 'days').format("DD/MM/YYYY");
                var orderedAdvertiserNameInfo = new Array();
                var orderedProductNameInfo = new Array();
                var email = req.body.email;
                var firstName = req.body.firstName;
                var lastName = req.body.lastName;

                var item = {
                    product_id: req.body.productId
                };

                async.waterfall([
                    function(callback) {
                        var itemName = req.body.itemName;
                        var itemNameArray = itemName.split(",");
                        if (itemNameArray.length == 2) {
                            var serviceName_advertiserName = itemNameArray[0].trim();
                            var advertiserName_outletName = itemNameArray[1].trim();

                            var serviceName_advertiserName_Array = serviceName_advertiserName.split(" - ");
                            if (serviceName_advertiserName_Array.length == 2) {
                                var serviceName = serviceName_advertiserName_Array[0].trim();                                               // Simple haircut
                                var advertiserName = serviceName_advertiserName_Array[1].trim();                                            // phs-hairscience

                                var indexOf_advertiserName = advertiserName_outletName.indexOf(advertiserName);
                                var lengthOf_advertiserName = advertiserName.length;
                                var outletName = advertiserName_outletName.substr(indexOf_advertiserName + lengthOf_advertiserName + 1);    // ngee-ann-city

                                if (advertiserName && advertiserName != "" && outletName && outletName != "" && serviceName && serviceName != "") {
                                    item.advertiserName = advertiserName;
                                    item.outletName = outletName;
                                    item.serviceName = serviceName;

                                    callback(null, item);
                                } else {
                                    callback(Error("Invalid Advertiser Name and Outlet Name"), item);
                                }
                            } else {
                                callback(Error("Invalid Service Name and Advertise Name"), item);
                            }
                        } else {
                            callback(Error("Invalid Item Name Array"), item);
                        }
                    },
                    function(item, callback) {                        
                        wpDbConnection.query({sql: "SELECT post_excerpt FROM f5ATe_posts WHERE ID = ? limit 1"},
                            [item.product_id],
                            function (err, results, fields) {
                                if (err) {
                                    callback(Error("WP DB Select Query Error!"), item);
                                } else if (results) {
                                    if (results.length > 0) {
                                        item.outletTerms = results[0].post_excerpt;
                                        callback(null, item);
                                    } else {
                                        callback(Error("WP DB Select Query No Result!"), item);
                                    }
                                } else {
                                    callback(Error("WP DB Select Query Error!"), item);
                                }
                            }
                        );
                    },
                    function(item, callback) {
                        dbConnection.query({sql: "SELECT A.id AS advertiser_id, A.name AS advertiser_name, B.name AS outlet_name, B.descr AS outlet_descr, B.email AS outlet_email, B.phone AS outlet_contact, " +
                                "B.address AS outlet_address, B.linked_services AS outlet_linked_services" +
                                " FROM advertisers A LEFT JOIN outlets B ON A.id = B.advertiser_id WHERE A.name = ?"},
                            [item.advertiserName],
                            function (err, results, fields) {
                                if (err) {
                                    callback(Error("DB Select Query Error!"), item, null);
                                } else if (results) {
                                    if (results.length > 0) {
                                        var outlet_info = [];
                                        results.forEach(function(row) {
                                            outlet_info.push({
                                                outlet_address: row.outlet_address,
                                                outlet_contact: row.outlet_contact,
                                                outlet_brandname: row.outlet_name,
                                                url: row.outlet_linked_services                                                
                                            });
                                            item.advertiserId = row.advertiser_id
                                        });
                                        callback(null, item, outlet_info);
                                    } else {
                                        callback(Error("DB Select Query No Result!"), item, null);
                                    }
                                } else {
                                    callback(Error("DB Select Query Error!"), item, null);
                                }
                            }
                        );
                    },
                    function(item, outletObj, callback) {
                        var sql = "SELECT a.voucher vcode, a.expirey_date expiryDate, b.id orderId, a.advertiser_id adId FROM voucher_code as a LEFT JOIN orders as b on a.order_id=b.id \
                        WHERE b.order_id=? AND b.service_id=? AND a.state=0";                        
                        dbConnection.query({sql: sql},
                            [req.body.id, req.body.productId],
                            function (err, results, fields) {                                
                                if (err) {
                                    callback(Error("DB Select Query Error!"), item, outletObj, null);
                                } else if (results) {
                                    if (results.length > 0) {
                                        callback(null, item, outletObj, results);
                                    } else {
                                        callback(Error("DB Select Query No Result!"), item, outletObj, null);
                                    }
                                } else {
                                    callback(Error("DB Select Query Error!"), item, outletObj, null);
                                }
                            }
                        );
                    },
                    function(item, outletObj, voucherObj, callback) {
                        
                        var eachCounter_1 = 0;
                        async.eachSeries(voucherObj, function(voucher, eachVcallback) {                            
                            async.waterfall([
                                function(callback_1) {
                                    var mailData = {
                                        serviceName: item.serviceName,
                                        firstName: firstName,
                                        lastName: lastName,
                                        advertiserName: item.advertiserName,
                                        outletName: item.outletName,
                                        outletInfo: outletObj,
                                        expiryDate: expiryDate,
                                        outletTerms: item.outletTerms,
                                        vcode: voucher.vcode,
                                        orderId: voucher.orderId,
                                        advertiserId: item.advertiserId,
                                        price: req.body.total
                                    }; 

                                    qr.sendQR(email, voucher.orderId, mailData, function(err, result) {
                                        if (err) {
                                            callback_1(err, null);
                                        } else {
                                            if (result == true) {
                                                callback_1(null, mailData);
                                            }
                                        }
                                    });										
                                }
                            ], function(err, result) { 
                                if (!result) {
                                    callback(Error("Send qr email Error!"), null);
                                } else {
                                    eachCounter_1++;
                                    if (eachCounter_1 === voucherObj.length) {
                                        callback(null, result);
                                    } else {
                                        eachVcallback();
                                    }
                                }
                            });
                        });                        
                    }
                ], function (err, result) {
                    res.json({"code": "succeed"});
                });

            } else {
                var email = req.body.billing.email;
                var gender = req.body.billing.gender;
                var age = req.body.billing.age;                
                var items = req.body.line_items;                
                var firstName = req.body.billing.first_name;
                var lastName = req.body.billing.last_name;
                var datePaidGMT = req.body.date_paid_gmt;
                var expiryDate = new Date(datePaidGMT);
                expiryDate.setDate(expiryDate.getDate() + 60);
                expiryDate = expiryDate.getDate() + '/' + (expiryDate.getMonth() + 1).toString() + '/' + expiryDate.getFullYear();
                //console.log(moment(datePaidGMT).format('YYYY-MM-DD'));
                var orderedAdvertiserNameInfo = new Array();
                var orderedProductNameInfo = new Array();

                var eachCounter = 0; var eachCounter_1 = 0;                
                async.eachSeries(items, function(item, eachCallback) {                    
                    async.waterfall([
                        function(callback) {
                            var serviceId = item.product_id;
                            var variationId = item.variation_id;
                            var itemName = item.name;
                            var itemNameArray = itemName.split(",");                            
                            if (itemNameArray.length == 2) {
                                var serviceName_advertiserName = itemNameArray[0].trim();
                                var advertiserName_outletName = itemNameArray[1].trim();

                                var serviceName_advertiserName_Array = serviceName_advertiserName.split(" - ");
                                if (serviceName_advertiserName_Array.length == 2) {
                                    var serviceName = serviceName_advertiserName_Array[0].trim();                                               // Simple haircut
                                    var advertiserName = serviceName_advertiserName_Array[1].trim();                                            // phs-hairscience

                                    var indexOf_advertiserName = advertiserName_outletName.indexOf(advertiserName);
                                    var lengthOf_advertiserName = advertiserName.length;
                                    var outletName = advertiserName_outletName.substr(indexOf_advertiserName + lengthOf_advertiserName + 1);    // ngee-ann-city
                                    
                                    if (advertiserName && advertiserName != "" && outletName && outletName != "" && serviceName && serviceName != "") {
                                        item.advertiserName = advertiserName;
                                        item.outletName = outletName;
                                        item.serviceName = serviceName;
                                        callback(null, item);
                                    } else {
                                        callback(Error("Invalid Advertiser Name and Outlet Name"), item);
                                    }
                                } else {
                                    callback(Error("Invalid Service Name and Advertise Name"), item);
                                }
                            } else {
                                callback(Error("Invalid Item Name Array"), item);
                            }
                        },
                        function(item, callback) {
                            wpDbConnection.query({sql: "SELECT post_excerpt, post_content FROM f5ATe_posts WHERE ID = ? limit 1"},
                                [item.product_id],
                                function (err, results, fields) {
                                    if (err) {
                                        callback(Error("WP DB Select Query Error!"), item);
                                    } else if (results) {
                                        if (results.length > 0) {
                                            item.outletTerms = results[0].post_excerpt;
                                            item.postContent = results[0].post_content;
                                            callback(null, item);
                                        } else {
                                            callback(Error("WP DB Select Query No Result!"), item);
                                        }
                                    } else {
                                        callback(Error("WP DB Select Query Error!"), item);
                                    }
                                }
                            );
                        },
                        function(item, callback) {
                            wpDbConnection.query({sql: "SELECT * FROM f5ATe_postmeta WHERE post_id = ? AND meta_key = 'redeemed_count' limit 1"},
                                [item.id],
                                function (err, results, fields) {
                                    if (err) {
                                        callback(null, item, null);
                                    } else if (results) {
                                        if (results.length > 0) {
                                            callback(null, item, results[0].meta_id);
                                        } else {
                                            callback(null, item, null);
                                        }
                                    } else {
                                        callback(null, item, null);
                                    }
                                }
                            );
                        },
                        function(item, redeemed_count_id, callback) {
                            if (redeemed_count_id) {
                                callback(null, item);
                            } else {
                                wpDbConnection.query({sql: "INSERT INTO f5ATe_postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)"},
                                    [item.id, 'redeemed_count', 0],
                                    function (err, post_metas, fields) {
                                        if (err) {
                                            callback(Error("WP DB Insert Query Error!"), item);
                                        } else if (post_metas) {
                                            callback(null, item);
                                        } else {
                                            callback(Error("WP DB Insert Query Error!"), item);
                                        }
                                    }
                                );
                            }
                        }, // get advertiser and save it local
                        function(item, callback) {
                            async.waterfall([
                                function(callback_1) {
                                    var ad_email = "";
                                    item.outlet_info.forEach(function(element) {
                                        if (element.advertiser_email !== "") {
                                            ad_email = element.advertiser_email;                                            
                                        }   
                                    });
                                    if (typeof ad_email === "undefined") ad_email = "";
                                    dbConnection.query({sql: "SELECT id, email FROM advertisers WHERE name = ?"},
                                        [item.advertiserName],
                                        function (err, results, fields) {
                                            if (err) {
                                                callback_1(null, null);
                                            } else if (results) {
                                                if (results.length > 0) {
                                                    var advertiser = null;
                                                    results.forEach(result => {
                                                        if (result.email == ad_email) advertiser = {id: result.id, email: ad_email};
                                                    })
                                                    callback_1(null, advertiser);
                                                } else {
                                                    callback_1(null, null);
                                                }
                                            } else {
                                                callback_1(null, null);
                                            }
                                        }
                                    );
                                },
                                function(advertiser, callback_1) {                                    
                                    if (advertiser) {
                                        callback_1(Error("Advertiser already exists!"), {id: advertiser.id, email: ad_email});
                                    } else {
                                        async.waterfall([
                                            function(callback_2) {
                                                
                                            }
                                        ])
                                        dbConnection.query({sql: "INSERT INTO advertisers (name, woo_id, email, commission, descr, terms, status, s_images_path, s_images, linked_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"},
                                            [item.advertiserName, 0, ad_email, "", "", "", 0, "", "", item.serviceName],
                                            function (err, advertisers, fields) {
                                                if (err) {
                                                    callback_1(Error("DB Insert Query Error!"), null);
                                                } else if (advertisers) {
                                                    callback_1(null, {id: advertisers.insertId, email: ad_email});
                                                } else {
                                                    callback_1(Error("DB Insert Query Error!"), null);
                                                }
                                            }
                                        );
                                    }
                                }
                            ], function (err_1, advertiser) {
                                if (advertiser) {
                                    callback(null, item, orderObj, advertiser);
                                } else {
                                    callback(Error("Failed to insert advertiser!"), item, orderObj, advertiser);
                                }
                            });
                        },
                        // get service from wp and save them on local database
                        function(item, callback) {
                            async.waterfall([
                                function(callback_1) {
                                    dbConnection.query({sql: "SELECT * FROM services WHERE woo_id=? LIMIT 1"},
                                        [item.product_id],
                                        function (err, service, fields) {
                                            if (err) {
                                                callback_1(null, null);
                                            } else if (service) {
                                                callback_1(null, service);
                                            } else {
                                                callback_1(null, null);
                                            }
                                        }
                                    );
                                },
                                function(service, callback_1) {
                                    if (service) callback_1(null, service);
                                    else {
                                        async.waterfall([
                                            function(callback_2) {
                                                WooCommerce.get('products/' + item.product_id, function(err, data, res) {
                                                    if (err || data.message) callback_2(null, false);
                                                    else callback_2(null, res);
                                                });
                                            },
                                            function(new_service, callback_2) {
                                                var mustKeys = ["name", "descr", "price", "type", "subtype", "terms", "status", "duration", "advertiser_id"];
                                                var service_type = "";
                                                var service_subtype = [];
                                                var sIndex = 0;
                                                var status = new_service.status == "publish"? 1: 0;
                                                if (new_service.categories.length > 0) {
                                                    new_service.categories.forEach(cat => {
                                                        if (sIndex == 0) service_type = cat.name;
                                                        else {
                                                            service_subtype.push(cat.name);
                                                        }
                                                    })
                                                }
                                                var image = "";
                                                if (new_service.images.length > 0) {
                                                    image = new_service.images[0].src;
                                                }

                                                var duration = "30 mins";
                                                if (new_service.meta_data.length > 0) {
                                                    new_service.meta_data.forEach(meta => {
                                                        if (meta.key == "duration") duration = meta.value;
                                                    })
                                                }                                                

                                                dbConnection.query({sql: "INSERT INTO services (" + mustKeys.join(",") + " ,s_images) VALUES (?,?,?,?,?,?,?,?,?,?)"},
                                                [new_service.name, new_service.description, new_service.price, service_type, service_subtype.join(","), new_service.short_description, status, duration, advertiser_id, image],
                                                function (error, results, fields) {                                    
                                                    if (error) {
                                                        callback_2(null, {"status": "error", "message": error.code});
                                                    }
                                                    else if (results.affectedRows == 1) {
                                                        var serviceId = results.insertId;
                                                        callback_2(null, null);
                                                    }
                                                });
                                            }
                                        ], function(err, item) {
                                            callback_1(err, item);
                                        }
                                    )}
                                }
                            ], function(err, item) {

                            })
                        },
                        function(item, callback) {                            
                            dbConnection.query({sql: "INSERT INTO orders (descr, service_id, payment_info, redemption, redeemed, quantity, order_id, email, status, user_id, adate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"},
                                [null, item.product_id, item.total, null, 0, item.quantity, req.body.id, email, 1, null, datePaidGMT],
                                function (err, orders, fields) {
                                    if (err) {
                                        callback(Error("DB Insert Query Error!"), item, null);
                                    } else if (orders) {
                                        callback(null, item, orders);
                                    } else {
                                        callback(Error("DB Insert Query Error!"), item, null);
                                    }
                                }
                            );
                        },                        
                        function(item, orderObj, advertiser, callback) {
                            eachCounter_1 = 0;
                            var advertiserId = advertiser.id;
                            if (item.outlet_info) {
                                async.eachSeries(item.outlet_info, function(each_outlet_info, eachOutletCallback) {
                                    async.waterfall([
                                        function(callback_1) {
                                            dbConnection.query({sql: "SELECT id FROM outlets WHERE name = ? limit 1"},
                                                [each_outlet_info.outlet_brandname],
                                                function (err, results, fields) {
                                                    if (err) {
                                                        callback_1(null, null);
                                                    } else if (results) {
                                                        if (results.length > 0) {
                                                            callback_1(null, results[0].id);
                                                        } else {
                                                            callback_1(null, null);
                                                        }
                                                    } else {
                                                        callback_1(null, null);
                                                    }
                                                }
                                            );
                                        },
                                        function(outletId, callback_1) {                                            
                                            if (outletId) {
                                                callback_1(null, outletId);
                                            } else {
                                                if (each_outlet_info.outlet_brandname && each_outlet_info.outlet_contact && each_outlet_info.outlet_address && each_outlet_info.url) {
                                                    dbConnection.query({sql: "INSERT INTO outlets (name, descr, advertiser_id, email, phone, address, postalcode, ophours, creditcard, status, s_images, s_images_path, linked_services, outlet_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"},
                                                        [each_outlet_info.outlet_brandname, "", advertiserId, "", each_outlet_info.outlet_contact, each_outlet_info.outlet_address, "", "", 0, 1, "", "", each_outlet_info.url, each_outlet_info.outlet_code],
                                                        function (err, outlets, fields) {
                                                            if (err) {
                                                                callback_1(Error("DB Insert Query Error!"), null);
                                                            } else if (outlets) {
                                                                callback_1(null, outlets.insertId);
                                                            } else {
                                                                callback_1(Error("DB Insert Query Error!"), null);
                                                            }
                                                        }
                                                    );
                                                } else {
                                                    callback_1(Error("Invalid outlet info!"), null);
                                                }
                                            }
                                        }
                                    ], function (err_1, result) {
                                        if (!result) {
                                            callback(Error("DB Insert Query Error!"), item, orderObj, advertiser);
                                        } else {
                                            eachCounter_1++;
                                            if (eachCounter_1 === item.outlet_info.length) {
                                                callback(null, item, orderObj, advertiser);
                                            } else {
                                                eachOutletCallback();
                                            }
                                        }
                                    });
                                });
                            } else {
                                item.outlet_info = new Array();
                                callback(null, item, orderObj, advertiser);
                            }
                        },
                        function (item, orderObj, advertiser, callback) {
                            var qItems = [];                            
                            for(i=0; i< item.quantity; i++) {                                
                                qItems.push({key: i, data: item})
                            };
                            var eachCounter_1 = 0;
                            async.eachSeries(qItems, function(qitem, eachVcallback) {
                                var sitem = qitem.data;                                
                                async.waterfall([
                                    function(callback_1) {
                                        let vcodes = voucher_codes.generate({
                                            length: 6,
                                            count: 1,
                                            charset: voucher_codes.charset("alphanumeric")
                                        });
                                        let vcode = vcodes[0]; 
                                        //console.log(vcode);  
                                        var exDate = moment(datePaidGMT).add(60, 'days');                                          
                                        dbConnection.query({sql: "INSERT INTO voucher_code (voucher, order_id, advertiser_id, ad_email, service_id, expirey_date, state, first_name, last_name, age, gender, item_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"}, 
                                            [vcode, orderObj.insertId, advertiser.id, advertiser.email, sitem.serviceName, exDate.format('YYYY/MM/DD'), 0, firstName, lastName, age, gender, item.id], 
                                            function(err, vouchers, fields) {
                                                console.log(err);
                                                console.log(vouchers);
                                                if (err) {
                                                    callback_1(Error("DB Insert Query Error!"), null);
                                                } else if (vouchers) {
                                                    sitem.vcode = vcode;
                                                    callback_1(null, sitem);
                                                } else {
                                                    callback_1(Error("DB Insert Query Error!"), null);
                                                }                                
                                        });
                                    },
                                    function(gitem, callback_1) {
                                        if (!gitem) return callback_1(Erro("Voucher generating error"), null);

                                        var mailData = {
                                            serviceName: gitem.serviceName,
                                            firstName: firstName,
                                            lastName: lastName,
                                            advertiserName: gitem.advertiserName,
                                            outletName: gitem.outletName,
                                            outletInfo: gitem.outlet_info,
                                            expiryDate: expiryDate,
                                            outletTerms: gitem.outletTerms,
                                            vcode: gitem.vcode,
                                            orderId: orderObj.insertId,
                                            advertiserId: advertiser.id,
                                            price: gitem.price,
                                            quantity: gitem.quantity,
                                            postContent: gitem.postContent
                                        }; 
                                        console.log(mailData);

                                        qr.sendQR(email, orderObj.insertId, mailData, function(err, result) {
                                            if (err) {
                                                callback_1(err, null);
                                            } else {
                                                if (result == true) {
                                                    callback_1(null, mailData);
                                                }
                                            }
                                        });										
                                    }
                                ], function(err, result) {                                    
                                    if (!result) {
                                        callback(Error("Send qr email Error!"), null);
                                    } else {
                                        eachCounter_1++;
                                        if (eachCounter_1 === qItems.length) {
                                            callback(null, result, advertiser);
                                        } else {
                                            eachVcallback();
                                        }
                                    }
                                });
                            }); 
                        },
                        // to send voucher mail to advertiser
                        function(mailData, advertiser, callback) {
                            if (advertiser.email) {
                                mailData.advertiserName = mailData.advertiserName.replace("-", " ");
                                mailData.paidDate = moment(req.body.date_paid).format("DD/MM/YYYY");                                
                                mailData.email = email.substr(0, email.indexOf('@') + 1);
                                mailData.email += "******";
                                mailData.gender = gender;
                                mailData.age = age; 
                                
                                mail.sendEmailToAd(advertiser.email, mailData, function(err, result) {
                                    if (err) {
                                        callback(err, result);
                                    } else {
                                        callback(null, true);
                                    }
                                })
                            } else {
                                callback(null, null);
                            }                            
                        }                        
                    ], function (err, result) {
                        eachCounter++;
                        if (eachCounter === items.length) {
                            res.json({"code": "succeed"});
                        } else {
                            eachCallback();
                        }
                    });
                }, function(err) {
                    res.json({"code": "failed"});
                });
            }
        } else {
            res.json({"code": "failed"});
        }
    },

    update: function(req, res, next) {
        if (req.query.email && req.query.itemId && req.query.orderId && req.query.firstName && req.query.advertiserName && req.query.outletName && req.query.serviceName) {
            var orderId = req.query.orderId;

            async.waterfall([
                function(callback) {
                    dbConnection.query({sql: "SELECT id, descr, service_id, payment_info, redemption, redeemed, quantity, email, status, user_id, adate FROM orders WHERE id = ? limit 1"},
                        [orderId],
                        function (err, results, fields) {
                            if (err) {
                                callback(Error("DB Select Query Error!"), null);
                            } else if (results) {
                                if (results.length > 0) {
                                    callback(null, results[0]);
                                } else {
                                    callback(Error("DB Select Query No Result!"), null);
                                }
                            } else {
                                callback(Error("DB Select Query Error!"), null);
                            }
                        });
                },
                function(orderObj, callback) {
                    if (orderObj.redeemed < orderObj.quantity) {
                        dbConnection.query({sql: "Update orders Set redemption = ?, redeemed = redeemed + 1 WHERE id = ?"},
                            [new Date(), orderId],
                            function (error, results) {
                                if (error) {
                                    callback(Error("DB Update Query Error!"), orderObj);
                                } else {
                                    callback(null, orderObj);
                                }
                            }
                        )
                    } else {
                        callback(Error("Redeemed count exceeds quantity!"), orderObj);
                    }
                },
                function(orderObj, callback) {
                    if (orderObj.redeemed < orderObj.quantity) {
                        wpDbConnection.query({sql: "Update f5ATe_postmeta Set meta_value = ? WHERE post_id = ? AND meta_key = 'redeemed_count'"},
                            [orderObj.redeemed + 1, req.query.itemId],
                            function (error, results) {
                                if (error) {
                                    callback(Error("WP DB Update Query Error!"), orderObj);
                                } else {
                                    callback(null, orderObj);
                                }
                            }
                        )
                    } else {
                        callback(Error("Redeemed count exceeds quantity!"), orderObj);
                    }
                },
                function(orderObj, callback) {
                    if (orderObj.redeemed + 1 == orderObj.quantity) {
                        wpDbConnection.query({sql: "INSERT INTO f5ATe_postmeta (post_id, meta_key, meta_value) VALUES (?, ?, ?)"},
                            [req.query.itemId, 'redeemed_date', new Date()],
                            function (err, post_metas, fields) {
                                if (err) {
                                    callback(Error("WP DB Insert Query Error!"), orderObj);
                                } else if (post_metas) {
                                    callback(null, orderObj);
                                } else {
                                    callback(Error("WP DB Insert Query Error!"), orderObj);
                                }
                            }
                        )
                    } else {
                        callback(null, orderObj);
                    }
                },
                function(orderObj, callback) {
                    var redemptionDate = new Date();
                    redemptionDate = redemptionDate.getDate() + '/' + (redemptionDate.getMonth() + 1).toString() + '/' + redemptionDate.getFullYear();

                    var redemption_left = orderObj.quantity - orderObj.redeemed - 1;
                    if (redemption_left < 0) {
                        callback(Error("Redemption number reaches quantity!"), 0);
                    } else {
                        var mailData = {
                            firstName: req.query.firstName,
                            redemptionDate: redemptionDate,
                            redemptionLeft: redemption_left,
                            outletName: req.query.outletName,
                            serviceName: req.query.serviceName,
                            advertiserName: req.query.advertiserName
                        };

                        mail.sendRedemptionEmail(config.get('mailgun.from'), req.query.email, mailData, function(err, result) {
                            if (err) {
                                callback(err, redemption_left);
                            } else {
                                callback(null, redemption_left);
                            }
                        });
                    }
                }
            ], function(err, result) {
                if (err) {
                    res.render('reached');
                } else {
                    if (result < 0) {
                        res.render('reached');
                    } else {
                        res.render('success', { redemption_left : result.toString() });
                    }
                }
            });
        }
    },
    test: function(req, res, next) {
        res.json({"code": "test API call succeed!"});
    }
}
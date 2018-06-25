var express = require('express');
var bodyParser = require('body-parser');
var config = require('config');
var app = express();
var multer = require('multer');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var path = require('path');
var cors = require('cors');
var ejs = require('ejs');
var http = require('http');
var socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server);

app.use(cors());

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./Images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    }
});

var upload = multer({
    storage: Storage
});
//.array("files", 3);

app.use(morgan('dev'));

app.use(function (req, res, next) {
    req.io = io;
    if (req.method === 'OPTIONS') {
        var headers = {};
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400';
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        res.writeHead(200, headers);
        res.end();
    } else {
        var allowedOrigins = ['http://127.0.0.1:3000','http://127.0.0.1:8080', 'http://localhost:8080', 'https://admin.novaly.ltd', 'http://admin.novaly.ltd'];
        var origin = req.headers.origin;
        if (allowedOrigins.indexOf(origin) > -1) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', true);
        return next();
    }    
    res.setHeader('Authorization', 'Basic '.base64_encode(config.get('wp.user') + ':' + config.get('wp.password')));
});

//socket configuration
io.on("connection", socket => {
    console.log("New client connected");

    socket.on("disconnect", () => console.log("Client disconnected"));
});

app.use(cookieParser('_x9Bur_fH9221'));
app.use(cookieSession({
    key: 'dv.sg',
    secret: '_x9Bur_fH9221',
    cookie: {domain: '.novaly.ltd', maxAge: 365 * 24 * 60 * 60 * 1000}
}));

// app.use(passport.initialize());
// app.use(passport.session());
app.use(express.static('Images'));
app.use('/uploads', express.static(__dirname + './uploads'));

//var port = process.env.PORT || 8055; // set our port
var port = process.env.PORT || 80; // set our port
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

var router = require("./routes/api/v1")(upload);

app.use('/api/v1', router);
// Service static assets
app.use(express.static(path.join(__dirname, '/Images')));
app.use(express.static(path.join(__dirname, '/public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/server/views'));

app.get('/', function (req, res) {
    res.render('success');
});

app.get('/*', function(req, res, next){ 
    res.setHeader('Last-Modified', (new Date()).toUTCString());
    next(); 
});

app.disable('etag');


server.listen(port);
var schedule = require('node-schedule');
var axios = require('axios');

var j = schedule.scheduleJob('0 12 * * *', function() {
    axios.get(config.get('domain') + '/api/v1/order_remind')
    .then(function (response) {
        console.log(response.data);
    }).catch(function (error) {
        console.log(error);
    });
});

console.log('API Server running on port ' + port);
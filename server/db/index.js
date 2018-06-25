var mysql = require('mysql');
var dbConfig = require('./config.json');

module.exports = {
	createConnection: function() {
		var connection = mysql.createConnection({
			host: dbConfig.host,
			user: dbConfig.user,
			password: dbConfig.password,
			port: dbConfig.port
		});
		connection.query('USE aws_photo');
		return connection;
	}
} 
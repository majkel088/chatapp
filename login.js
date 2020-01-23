var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000, function(){
	console.log('listening on *:3000');
});

const connections = [];


app.get('/chat',function(request,response){
	response.sendFile(__dirname+'/chat.html');
});

io.sockets.on('connection', function(socket){

	connections.push(socket);
	console.log(' %s jest polaczonych', connections.length	);

	socket.on('disconnect', function(){
		connections.splice(connections.indexOf(socket), 1);
		console.log(' %s jest polaczonych', connections.length);
	});
	socket.on('chat message', function(msg){
		io.emit('chat message', msg.message);
	});
});


var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'nodelogin'
});



app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended : true}));

app.use(bodyParser.json());

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length === 1) {
				request.session.loggedin = true;
				request.session.username = username;
				response.redirect('/home');
			} else {
				response.send('Nieprawidłowa nazwa użytkownika/hasło!');
			}			
			response.end();
		});
	} else {
		response.send('Podaj nazwę użytkownika/hasło!');
		response.end();
	}
});

app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.redirect('/chat');
	} else {
		response.send('Zaloguj się aby zobaczyć tą stronę!');
	}
	response.end();
});

app.get('/singup', function(request, response) {
	response.sendFile(path.join(__dirname + '/reg.html'));
});

app.post('/singup', function(request, response){
	connection.query('SELECT * FROM accounts WHERE username = ?',[request.body.username], function (error, results, fields) {
		if (error) {
		 	console.error(error.message);
		}if (results.length){
			response.send('Ta nazwa użytkownika jest już w użyciu!')
			response.redirect('/singup');
		}
		else{
			var users = {
				"username":request.body.username,
				"password":request.body.password,
				"email":request.body.email,
				"first_name":request.body.first_name,
				"last_name":request.body.last_name
			}
			connection.query('INSERT INTO accounts SET ?',users, function (error, results, fields) {
				response.redirect('/');
		});
		}
	});	
});
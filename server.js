"use strict";

const express = require('express'),
    app = express(),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    Users = require('./api/models/userModel'),
    Image = require('./api/models/imagesModel'),
    bodyParser = require('body-parser'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    busboy = require('connect-busboy');
    //LocalStrategy = require('passport-local'),
    //TwitterStrategy = require('passport-twitter'),
    //GoogleStrategy = require('passport-google'),
    //FacebookStrategy = require('passport-facebook');
var config = require('./config');
var https = require('https');
var http = require('http').Server(app);
var io = require('socket.io')(http);

// setup mongoose
mongoose.set("debug",true);
mongoose.Promise = global.Promise;
mongoose.connect(config.dbUri);

// seed database with fake users
//var fake_data = require("./mongo/data/fake/fake");
//fake_data.fake();

// setup express
global.staticPath = path.join(__dirname, 'client', 'dist');
app.use(busboy());
app.use(express.static(global.staticPath));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.json({ extended: true, limit: '500mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.set('views', __dirname + '/api/views');
app.set('view engine', 'ejs');

// loading the index page
app.get('/', function (req, res) {
   res.sendFile( __dirname + "/client/index.html" );
});

// user routes
var userRoutes = require('./api/routes/userRoutes');
userRoutes(app);

// admin routes
var adminRoutes = require('./api/routes/adminRoutes');
adminRoutes(app);

// chat routes
var chatRoutes = require('./api/routes/chatRoutes');
chatRoutes(app);

// img routes
var imgRoutes = require('./api/routes/imgRoutes');
imgRoutes(app);

// load passport strategies
const localSignupStrategy = require('./api/auth/local-signup');
const localLoginStrategy = require('./api/auth/local-login');
//const facebookLoginStrategy = require('./api/auth/facebook-login');
passport.use('local-signup', localSignupStrategy);
passport.use('local-login', localLoginStrategy);
//passport.use('facebook-login', facebookLoginStrategy);

// pass the authenticaion checker middleware
const authCheckMiddleware = require('./api/middleware/auth-check');
app.use('/api', authCheckMiddleware);

// auth routes
var authRoutes = require('./api/routes/authRoutes');
app.use('/auth', authRoutes);

// default redirect
app.get('*', function(req, res) {
    res.redirect('/');
});

//172.104.142.18
var port = process.env.PORT || 80;
http.listen(port, function() {
    console.log("Listening on " +config.url+ ':' + port);
});

//chat
function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}

// socket.io
let users = {};
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('message', function (message) {
        io.emit('message', message);
        io.emit('youHaveMessages', message);

        let data;

        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }
        if(data.status === 'videochat'){
            switch (data.type) {
                case "login":
                    console.log("User logged in as", data._id);
                    if (users[data._id]) {
                        sendTo(socket, {
                            status:"videochat",
                            type: "login",
                            success: false
                        });
                    } else {
                        users[data._id] = socket;
                        socket._id = data._id;
                        sendTo(socket, {
                            status:"videochat",
                            type: "login",
                            success: true
                        });
                    }
                    break;

                case "offer":
                    console.log("Sending offer to", data._id);
                    var conn = users[data._id];

                    if (conn != null) {
                        socket.otherId = data._id;
                        sendTo(conn, {
                            status:"videochat",
                            type: "offer",
                            offer: data.offer,
                            _id: socket._id
                        });
                    }
                    break;

                case "answer":
                    console.log("Sending answer to", data._id);
                    var conn = users[data._id];

                    if (conn != null) {
                        socket.otherId = data._id;
                        sendTo(conn, {
                            status:"videochat",
                            type: "answer",
                            answer: data.answer
                        });
                    }

                case "candidate":
                    console.log("Sending candidate to", data._id);
                    var conn = users[data._id];

                    if (conn != null) {
                        sendTo(conn, {
                            status:"videochat",
                            type: "candidate",
                            candidate: data.candidate
                        });
                    }
                    break;

                case "leave":
                    console.log("Disconnecting user from", data._id);
                    var conn = users[data._id];
                    conn.otherId = null;

                    if (conn != null) {
                        sendTo(conn, {
                            status:"videochat",
                            type: "leave"
                        });
                    }
                    break;

                default:
                    sendTo(socket, {
                        status:"videochat",
                        type: "error",
                        message: "Unrecognized command: " + data.type
                    });
                    break;
            }
        }
    });


    socket.on('close', function () {
        if (socket._id) {
            delete users[socket._id];

            if (socket.otherId) {
                console.log("Disconnecting user from", socket.otherId);
                var conn = users[socket.otherId];
                conn.otherName = null;

                if (conn != null) {
                    sendTo(conn, {
                        status:"videochat",
                        type: "leave"
                    });
                }
            }
        }
    });
});


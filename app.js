var path = require('path');
var fs = require('fs');

var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var passwordless = require('passwordless');
var passwordlessNedb = require('passwordless-nedb')
var nedb = require('nedb');
var email   = require("emailjs");

var routes = require('./routes/index');

var app = express();
var port = process.env.PORT || 3000;
app.set('port', port);

// TODO: Update `host` to this webapp that's linked via email
var host = 'http://localhost:' + port + '/';

///////////////////////////////////////////////////////////////////////////////
// Setup configuration
///////////////////////////////////////////////////////////////////////////////
// TODO: Before you create 'config.json' this app will console.log the URLs to validate logins.
// The config file should look like this.:
/*
{
    smtp: {
        user:     "DO NOT COMMIT THIS FILE WITH YOUR CREDENTIALS", 
        password: "yourpassword", 
        host:     "your smtp service host like smtp.gmail.com or smtp.sparkpostmail.com",
        port:     465,
        ssl:      true,
        from:     "example@example.com"
    }
}
*/
var config = {};
var configFileName = './config.json';
try { 
    fs.statSync(configFileName);
    config = require(configFileName);
} catch (err) {
    console.log("Failed to load configuration: " + err);
};
var smtpServer = null;
if(config.smtp)
    smtpServer = email.server.connect(config.smtp);

///////////////////////////////////////////////////////////////////////////////
// Setup of Passwordless
///////////////////////////////////////////////////////////////////////////////
var usersDB = new nedb({
    filename: 'users.nedb',
    autoload: true
});
var usersTokenStore = new passwordlessNedb(usersDB);
passwordless.init(usersTokenStore, {
    skipForceSessionSave: true
});
function deliverToken(tokenToSend, uidToSend, recipient, callback) {
    var activationUrl = host + '?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend);
    var text = 'Hello!\nYou can now access your account here: ' + activationUrl;
    if(smtpServer) {
        smtpServer.send({
            text: text, 
            from:    config.smtp.from, 
            to:      recipient,
            subject: 'Token for ' + host
        }, function(err, message) { 
            if(err) {
                console.log(err);
            }
            callback(err);
        });
    } else {
        console.log("No SMTP server configured. Would have sent an email to: " + recipient);
        console.log(text);
        callback(null);
    }
}
passwordless.addDelivery(deliverToken);

///////////////////////////////////////////////////////////////////////////////
// Express setup
///////////////////////////////////////////////////////////////////////////////
// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

///////////////////////////////////////////////////////////////////////////////
// Session store setup
///////////////////////////////////////////////////////////////////////////////
var NedbStore = require('nedb-session-store')( expressSession );
var sessionStore = new NedbStore({
    filename: './sessions.nedb'
});
var oneYearMs = 365 * 24 * 60 * 60 * 1000;
var sessionWare = expressSession({
    secret: 'horse staple correct',
    saveUninitialized: false,
    resave: false,
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: oneYearMs 
    },    
    store: sessionStore
});
app.use(sessionWare);

// Passwordless middleware
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({ successRedirect: '/' }));

///////////////////////////////////////////////////////////////////////////////
// Routes setup 
///////////////////////////////////////////////////////////////////////////////
// CHECK /routes/index.js to better understand which routes are needed at a minimum
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Development error handler
// Shows stack traces
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

var server = app.listen(app.get('port'), function() {
    console.log('Browse at: ' + host);
});

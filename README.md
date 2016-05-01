# passwordless-mail-nedb

This is a demo of passwordless you can just download and run. It removes the mongo requirement and if you don't supply a `config.json` file with SMTP credentials you can see the activation link printed out to the server command line. Sessions and users are persisted using NeDB.

It's adapted from https://github.com/florianheinemann/passwordless/tree/master/examples/simple-mail

## Dependencies
* https://github.com/florianheinemann/passwordless
* https://github.com/louischatriot/nedb
* https://github.com/syarul/passwordless-nedb
* https://github.com/louischatriot/express-nedb-session



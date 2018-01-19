/* eslint-disable linebreak-style */
const User = require('mongoose').model('Users');
const PassportLocalStrategy = require('passport-local').Strategy;
const random = require("secure-random");
const mailer = require('nodemailer');
var config = require('../../config');
var bcrypt = require("bcrypt");
var faker = require('faker');


var transporter = mailer.createTransport({
    service: config.email.service,
    auth: {
        user: config.email.user, // Your email id
        pass: config.email.pass // Your password
    }
});

/**
 * Return the Passport Local Strategy object.
 */
module.exports = new PassportLocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true
}, (req, email, password, done) => {
    const userData = {
        email: email.trim(),
        password: password,
        token: random(15),
        profile:{
            name:'Your name',
            bio:faker.lorem.text(),
            interests:'Your interests',
            age:100,
            gender:'Your gender',
            disability:'Any disabilities',
            avatar:'img/avatar.png',
            cover:faker.image.nature(),
            city:'Your city'
        }
    };

    const newUser = new User(userData);
    newUser.save((err) => {
        if (err) { return done(err); }
        // mail token to client
        let url = config.url+":"+config.port+"/verify/"+userData.email+'/'+userData.token;
        let html = "<p>Hey Buddy, welcome to our community. " +
            "<a target='_blank' href='"+url+"'>Please click here to activate your account</a></p>";
        let mailOptions = {
            from: 'heybuddysocial@gmail.com', // sender address
            to: userData.email, // list of receivers
            subject: 'Hey buddy, please activate your account', // Subject line
            html: html
        };
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
            };
        });
        return done(null);
    });
});

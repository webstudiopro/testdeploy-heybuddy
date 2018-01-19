/* eslint-disable linebreak-style */
const User = require('mongoose').model('Users');
FacebookStrategy = require('passport-facebook').Strategy;
var config = require('../../config');

/**
 * Return the Passport Local Strategy object.
 */
module.exports = new FacebookStrategy({
    clientID: config.social.facebook.appId,
    clientSecret: config.social.facebook.appSecret,
    callbackURL: config.url+':'+config.port+'/auth/facebook/callback'
}, (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    return done(null);
    /*const newUser = new User(userData);
    newUser.save((err) => {
        if (err) { return done(err); }

        return done(null);
    });*/
});

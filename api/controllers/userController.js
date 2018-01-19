'use strict';
const mongoose = require('mongoose'),
  Users = mongoose.model('Users');
const mailer = require('nodemailer');
var config = require('../../config');
const validator = require('validator');
var bcrypt = require("bcrypt");
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var transporter = mailer.createTransport({
    service: config.email.service,
    auth: {
        user: config.email.user, // Your email id
        pass: config.email.pass // Your password
    }
});

exports.read_a_user = function(req, res) {
  Users.findById(req.params.userId, function(err, user) {
    if (err) res.send(err);
    res.json(user);
  });
};

exports.search = function(req, res) {
    var _id = req.params._id;
    var q = req.params.q;
    var minAge = parseInt(req.params.minAge);
    var maxAge = parseInt(req.params.maxAge);
    var gender = req.params.gender;
    var radius = req.params.radius;
    var sex = req.params.sex;
    console.log('Bullet tracer --> q', q);
    Users.findById(_id, function (err, user){
        if(err){
            console.log(err.message);
            return;
        }
        if(!user){
            console.log('No user found while search process');
            return;
        }
        let aggregation = [
            {
                $geoNear:{
                    query : {
                        "profile.age":{$gte: minAge, $lte: maxAge},
                        "approved":true
                    },
                    near: { type: "Point", coordinates: [ user.location[0], user.location[1]] },
                    limit:30,
                    maxDistance:radius*1000,
                    distanceField: "dist.calculated",
                    includeLocs: "dist.location",
                    distanceMultiplier:1/1000,
                    spherical: true
                }
            },
            { $sort : { online:-1} }
        ];
        if(q.length > 2){
            let _q = q.split(', ').join(' ');
            _q = _q.split(' ').join('|');

            let regexp = new RegExp(_q, "gi");
            aggregation[0].$geoNear.query.$or = [
                {'profile.name':{ $regex: regexp }},
                {'profile.interests':{ $regex: regexp }},
                {'profile.disability':{ $regex: regexp }},
                {'profile.bio':{ $regex: regexp }},
                {'profile.city':{ $regex: regexp }}
            ];
        }
        if(gender !== 'both'){
            aggregation[0].$geoNear.query["profile.gender"] = gender;
        }
        if(sex !== 'all'){
            aggregation[0].$geoNear.query["profile.sex"] = sex;
        }
        Users.aggregate(aggregation, function (err, results) {
            if (err) {
                console.log('Search aggregate error:', err);
                res.json({
                    success:false,
                    message:err
                });
            } else {
                res.json({
                    success:true,
                    message:"Search results found",
                    results
                });
            }
        });

    });
};


exports.verify = function(req, res) {
    var token = req.params.token;
    var email = req.params.email;
    Users.findOneAndUpdate({token:token, email:email}, {approved:true}, {new: true}, function(err, user) {
        if (err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'Could not process your request'
            });
        }

        return res.render('verify', {user});
    });
};

exports.save_profile = function(req, res) {
    var user = req.body;
    console.log('Bullet tracer --> user:', user);
    // do stuff
    Users.findByIdAndUpdate(user._id, {$set:{
        location:[parseFloat(user.longitude), parseFloat(user.latitude)],
        "profile.name":user.name,
        "profile.bio":user.bio,
        'profile.interests':user.interests,
        "profile.age":user.age,
        "profile.disability":user.disability,
        "profile.gender":user.gender,
        "profile.city":user.city
    }}, function (err, userId) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!userId){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Basic info setup succeeded. Click ok to go to our app and go to the login page'
        });
    });

};

exports.reset = function (req, res) {
    var email = req.body.email;
    if (!validator.isEmail(email)) {
        console.log('Bullet tracer (3) --> error');
        return res.status(400).json({
            success: false,
            message: 'Please check your email'
        });
    }
    Users.findOne({email:email}, function (err, user) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'No user found with this email'
            });
        }

        // mail token to client
        let url = config.url+":"+config.port+"/reset2/"+email+'/'+user.token;
        let html = "<p>Hey Buddy, did you forget your password? " +
            "<a target='_blank' href='"+url+"'>Please click here to reset your password</a></p>";
        let mailOptions = {
            from: 'heybuddysocial@gmail.com', // sender address
            to: email, // list of receivers
            subject: 'Hey buddy, reset your password', // Subject line
            html: html
        };
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }else{
                console.log('Message sent: ' + info.response);
                return res.status(200).json({
                    success: true,
                    message: 'We send you a mail with further details'
                });
            };
        });
    });
}

exports.reset2 = function (req, res) {
    var token = req.params.token;
    var email = req.params.email;
    Users.findOne({email:email, token:token}, function (err, user) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        console.log('bullet tracer --> user', user);
        return res.render('reset', {token, email, user});
    })
}

exports.reset3 = function (req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var password2 = req.body.password2;
    var token = req.body.token;

    if (!validator.isEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please check your email'
        });
    }
    if(password !== password2){
        return res.status(400).json({
            success: false,
            message: "Passwords are not equal"
        });
    }
    Users.update({email:email, token:token}, {$set:{password:bcrypt.hashSync(password, 10)}}, function (err, user) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Password reset with success'
        });
    });
};

exports.logout = function (req, res) {
    if(!req.params._id) return;
    Users.findByIdAndUpdate(req.params._id, {$set:{online:false}}, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while logout process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Password reset with success'
        });
    });

};

exports.send_request = function (req, res) {
    const targetId = req.params.targetId;
    const userId = req.params.userId;
    Users.findById(targetId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while friend request process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        const ObjUserId = new mongoose.Types.ObjectId(userId);
        if(!user.requests.includes(ObjUserId)){
            user.requests.push(ObjUserId);
            user.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Friend request has been send'
        });
    });
};

exports.find_user_requests = function (req, res) {
    const userId = req.params.userId;
    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while search requests process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        Users.find({_id:{$in:user.requests}}, function (err, users) {
            if(err){
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if(users.length > 0){
                return res.status(200).json({
                    success: true,
                    message: 'Friend requests has been found',
                    users:users
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'No friend requests has been found',
                    users:[]
                });
            }

        });
    });
};

exports.accept_user_request = function (req, res) {
    var userId = req.params.userId;
    var targetId = req.params.targetId;

    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while accept request process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        const ObjTargetId = new mongoose.Types.ObjectId(targetId);
        if(user.friends.indexOf(ObjTargetId) === -1){
            user.friends.push(ObjTargetId);
        }

        if(user.requests.indexOf(ObjTargetId) > -1){
            user.requests.splice(user.requests.indexOf(ObjTargetId), 1);
        }

        user.save();
        Users.findById(targetId, function (err, user) {
            if(err){
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if(!user){
                console.log("No user found while accept request process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            const ObjUserId = new mongoose.Types.ObjectId(userId);
            if(user.friends.indexOf(ObjUserId) === -1){
                user.friends.push(ObjUserId);
            }
            if(user.requests.indexOf(ObjUserId) > -1){
                user.requests.splice(user.requests.indexOf(ObjUserId), 1);
            }
            user.save();
            return res.status(200).json({
                success: true,
                message: 'Friend accepted !'
            });
        });
    });
};

exports.decline_user_request = function (req, res) {
    var userId = req.params.userId;
    var targetId = req.params.targetId;

    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while decline request process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        const ObjTargetId = new mongoose.Types.ObjectId(targetId);
        if(user.requests.indexOf(ObjTargetId) > -1){
            user.requests.splice(user.requests.indexOf(ObjTargetId), 1);
        }
        user.save();
        return res.status(200).json({
            success: true,
            message: 'Friend requests has been declined'
        });
    });
};

exports.find_friends = function (req, res) {
    const userId = req.params.userId;
    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while search friends process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        Users.find({_id:{$in:user.friends}}, function (err, users) {
            if(err){
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if(users.length > 0){
                return res.status(200).json({
                    success: true,
                    message: 'Friends are found',
                    users:users
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'No friends are found',
                    users:[]
                });
            }
        });
    });
};

exports.remove_friend = function (req, res) {
    const userId = req.params.userId;
    const targetId = req.params.targetId;
    Users.findById(userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while search friends process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        let ObjTargetId = new mongoose.Types.ObjectId(targetId);
        if(user.friends.indexOf(ObjTargetId) > -1){
            user.friends.splice(user.friends.indexOf(ObjTargetId), 1);
            user.save();
        }
        Users.findById(targetId, function (err, user) {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!user) {
                console.log("No user found while search friends process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            let ObjTargetId = new mongoose.Types.ObjectId(userId);
            if(user.friends.indexOf(ObjTargetId) > -1){
                user.friends.splice(user.friends.indexOf(ObjTargetId), 1);
                user.save();
            }
            return res.status(200).json({
                success: true,
                message: 'Friend removed...'
            });
        });
    });
};

exports.remove_from_messages_from = function (req, res) {
    let userId = req.params.userId;
    let targetId = req.params.targetId;
    Users.findById(userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while remove from messagesFrom process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        if(user.messagesFrom.indexOf(targetId) > -1){
            user.messagesFrom.splice(user.messagesFrom.indexOf(targetId), 1);
            user.save();
        }
        return res.status(200).json({
            success: true,
            message: 'Messsage from '+targetId+' removed...'
        });
    });
};

exports.save_profile_img = function (req, res) {
    let total = 0;
    let chunks = [];
    req.on('data', function(chunk) {
        console.log("upload on data "+ chunk.length);
        chunks.push(chunk);
        total+= chunk.length;
    });
    req.on('error', function(e) {
        console.log('Got Error ' + e.message);
    });
    req.on('end', function() {
        let buf = new Buffer(total);
        let cur = 0;
        for (var i = 0, l = chunks.length; i < l; i++) {
            chunks[i].copy(buf, cur, 0);
            cur += chunks[i].length;
        }
        const temp = JSON.parse(buf.toString());
        //const bufImg = Buffer.from(temp.img, 'base64');
        Users.findById(temp.userId, function (err, user) {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!user) {
                console.log("No user found while remove from save img process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            var ext = temp.img.split(';')[0].match(/jpeg|png|gif/)[0];
            // strip off the data: url prefix to get just the base64-encoded bytes
            var data = temp.img.replace(/^data:image\/\w+;base64,/, "");
            var buf = new Buffer(data, 'base64');
            var filename;
            if (temp.type === 'avatar-modal') {
                filename = temp.userId+'.'+'avatar'+'.'+ext;
                user.profile.avatar = '/img/profiles/'+filename;
            }
            if (temp.type === 'cover-modal') {
                filename = temp.userId+'.'+'cover'+'.'+ext;
                user.profile.cover = '/img/profiles/'+filename;
            }
            var _path = path.join(global.staticPath, 'img','profiles', filename);
            fs.unlink(_path, function(err) {
                fs.writeFile(_path, buf, function () {
                    user.save();
                    return res.status(200).json({
                        success: true,
                        user: user,
                        message: 'Image saved...'
                    });
                });
            });
        });
    });
};

exports.save_bio = function (req, res) {
    let total = 0;
    let chunks = [];
    req.on('data', function(chunk) {
        console.log("upload on data "+ chunk.length);
        chunks.push(chunk);
        total+= chunk.length;
    });
    req.on('error', function(e) {
        console.log('Got Error ' + e.message);
    });
    req.on('end', function() {
        let buf = new Buffer(total);
        let cur = 0;
        for (var i = 0, l = chunks.length; i < l; i++) {
            chunks[i].copy(buf, cur, 0);
            cur += chunks[i].length;
        }
        const temp = JSON.parse(buf.toString());
        //const bufImg = Buffer.from(temp.img, 'base64');
        Users.findById(temp.userId, function (err, user) {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!user) {
                console.log("No user found while remove from save img process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            user.profile.bio = temp.bio;
            user.save();
            return res.status(200).json({
                success: true,
                user: user,
                message: 'Bio saved...'
            });
        });
    });
};

exports.save_info = function (req, res) {
    const info = req.body.info;
    const userId = req.body.userId;

    Users.findById(userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while save info process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        user.profile.name = info.name;
        user.profile.age = info.age;
        user.profile.gender = info.gender;
        user.profile.interests = info.interests;
        user.profile.disability = info.disability;
        user.profile.city = info.city;
        console.log('Bullet tracer (712) --> ', user.profile);
        user.save();
        return res.status(200).json({
            success: true,
            user: user,
            message: 'Info saved...'
        });
    });
};

exports.mark_as_spam = function (req, res) {
    const userId = req.body.userId;
    const spamId = req.body.spamId;

    Users.findById(userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while mark as spam process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        Users.findById(spamId, function (err, user2) {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!user) {
                console.log("No user found while mark as spamId process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            user2.approved = false;
            user2.save();

            // email to admin
            let html = "<h3>Hey Buddy, spam detected </h3>" +
                "<p>User email: " + user.email + "</p>" +
                "<p>Spam email: " + user2.email + "</p>";
            let mailOptions = {
                from: 'heybuddysocial@gmail.com', // sender address
                to: 'fret_benny@hotmail.com', // list of receivers
                subject: "Hey buddy, spam detected",
                html: html
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
            });

            // email to spammer
            html = "<h3>Hey Buddy, you're marked as spam </h3>" +
                "<p>Somebody marked you as spam !. Please check your profile</p>" +
                "<p>This is not correct? Please forward this email to: heybuddysocial@gmail.com</p>";
            mailOptions = {
                from: 'heybuddysocial@gmail.com', // sender address
                to: user2.email, // list of receivers
                subject: "Hey buddy, you're marked as spam",
                html: html
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
            });

            return res.status(200).json({
                success: true,
                message: 'User has been marked as spam, sorry you have to deal with this...'
            });
        });
    });
};
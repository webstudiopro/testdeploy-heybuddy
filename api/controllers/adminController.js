/* eslint-disable linebreak-style */
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

exports.search = function(req, res) {
    var userId = req.params.userId;
    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while admin find process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        if(user.role === 'admin'){
            let q = req.params.q;
            if(q.length > 2){
                let _q = q.split(', ').join(' ');
                _q = _q.split(' ').join('|');
                let regexp = new RegExp(_q, "gi");
                const query = Users.find({$or:[
                    {email:{$regex: regexp}},
                    {'profile.name':{$regex: regexp}},
                    {'profile.interests':{ $regex: regexp }},
                    {'profile.disability':{ $regex: regexp }},
                    {'profile.city':{ $regex: regexp }}
                ]}).limit(50);
                query.exec(function(err, users) {
                    if (err){
                        console.log('Search error:', err);
                        res.send({
                            success:false,
                            error:err
                        });
                    }
                    if(users){
                        console.log('Bullet tracer --> users', users[0]);
                        res.json({
                            success:true,
                            message:"Users found...",
                            users
                        });
                    }
                });
            }
        } else {
            res.json({
                success:false,
                message:"You're not allowed to view this data..."
            });
        }
    });
};

exports.find = function (req, res) {
    var docsPerPage = 40;
    var pageNumber = req.params.pageNumber;
    var userId = req.params.userId;
    Users.findById(userId, function (err, user) {
        if(err){
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while admin find process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        if(user.role === 'admin'){
            Users.findPaginated({}, function (err, results) {
                if (err) res.send({
                    success:false,
                    error:err
                });
                res.json({
                    success:true,
                    message:"Users found...",
                    ...results
                });
            }, docsPerPage, pageNumber);
        } else {
            res.json({
                success:false,
                message:"You're not allowed to view this data..."
            });
        }
    });
};

exports.delete_a_user = function(req, res) {
    Users.findById(req.params.userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while admin delete process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        Users.remove({
            _id: req.params.targetId
        }, function (err, user) {
            if (err) res.send(err);
            res.json({
                success: true,
                message: 'User successfully deleted'
            });
        });
    });
};

exports.approve_a_user = function(req, res) {
    Users.findById(req.params.userId, function (err, user) {
        if (err) {
            console.log(err.message);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (!user) {
            console.log("No user found while admin approve process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        Users.findById(req.params.targetId, function (err, user) {
            if (err) {
                console.log(err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!user) {
                console.log("No user found while admin approve process");
                return res.status(400).json({
                    success: false,
                    message: 'No user found'
                });
            }
            let approved = req.params.approved;
            if(approved == 'true'){
                user.approved = true;
            } else {
                user.approved = false;
            }
            console.log('Bullet tracer --> user.approved', user.approved);
            user.save();
            return res.status(200).json({
                success: true,
                message: 'User approved...'
            });
        });
    });
};
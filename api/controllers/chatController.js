/* eslint-disable linebreak-style */
"use strict";
const _ = require('underscore');
const Message = require('../models/messageModel');
const User = require('../models/userModel');


exports.getMessages = function (req, res) {
    const targetId = req.params.targetId;
    const userId = req.params.userId;

    Message.find({userId:userId, targetId:targetId}, function (err, users1) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        Message.find({userId:targetId, targetId:userId}, function (err, users2) {
            if(err){
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            const messages = _.sortBy(users1.concat(users2), 'createdAt');
            if(!messages || messages.length === 0){
                return res.status(200).json({
                    success: false,
                    message: 'No chat messages found'
                });
            }
            return res.status(200).json({
                success: true,
                messages: messages
            });
        });
    });
};

exports.saveMessage = function (req, res) {
    const message = new Message(req.body);
    message.save();
    User.findById(req.body.targetId, function (err, user) {
        if(err){
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if(!user){
            console.log("No user found while save message process");
            return res.status(400).json({
                success: false,
                message: 'No user found'
            });
        }
        user.messagesFrom.push(req.body.userId);
        user.save();
        return res.status(200).json({
            success: true,
            message: 'Message saved...'
        });
    });
};
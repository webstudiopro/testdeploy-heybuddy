/* eslint-disable linebreak-style */
const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const MessageSchema = new Schema({
        userId: {
            type: String,
            required: true
        },
        targetId:{
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        readed:{
            type:Boolean,
            default:false
        }
    },
    {
        timestamps: true // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
    });

module.exports = mongoose.model('Message', MessageSchema);
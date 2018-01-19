/* eslint-disable linebreak-style */
const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const ImagesSchema = new Schema({
        userId: {
            type: String,
            required: true
        },
        path:{
            type: String,
            required: true
        },
        thumbnail:{
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true // Saves createdAt and updatedAt as dates. createdAt will be our timestamp.
    });

module.exports = mongoose.model('Image', ImagesSchema);
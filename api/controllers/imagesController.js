/* eslint-disable linebreak-style */
'use strict';
const mongoose = require('mongoose'),
    fs = require('fs'),
    Jimp = require("jimp"),
    Image = mongoose.model('Image');


exports.upload_image = function (req, res) {
    if(!req.session.user) return res.redirect('back');
    Image.find({userId:req.session.user._id}, function (err, images) {
        if(err) return res.redirect('back');
        if(images.length === 8) return res.redirect('back');
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);
            const name = Date.now() + filename;
            const pathName = '/img/uploads/' + name;
            const thumbPath = '/img/uploads/thumbnails/' + name;
            fstream = fs.createWriteStream(global.staticPath + pathName);
            file.pipe(fstream);
            fstream.on('close', function () {
                Jimp.read(global.staticPath + pathName, function (err, img) {
                    if (err) throw err;
                    img.resize(200, 200)            // resize
                        .write(global.staticPath + thumbPath); // save
                });
                const img = new Image({
                    userId:req.session.user._id,
                    name: name,
                    path: pathName,
                    thumbnail: thumbPath
                });
                img.save(function (err) {
                    if (err) console.log('db error:', err);
                    // saved!
                });
                res.redirect('back');
            });
        });
    });
};

exports.get_images = function (req, res) {
    Image.find({userId:req.params._id}, function (err, images) {
        if(err) throw err;
        return res.status(200).json({
            success: true,
            message: 'Images found',
            images
        });
    });
};

exports.delete_image = function (req, res) {
    const imageId = req.params._id;
    Image.findById(imageId, function (err, img) {
        if(err) throw err;
        if(img){
            fs.unlink(global.staticPath+img.path);
            fs.unlink(global.staticPath+img.thumbnail);
            img.remove();
            return res.status(200).json({
                success: true,
                message: 'Image removed...'
            });
        }
    });
};
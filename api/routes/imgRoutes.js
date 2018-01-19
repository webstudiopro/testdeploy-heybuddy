/* eslint-disable linebreak-style */
module.exports = function(app) {
    var ImgController = require('../controllers/imagesController');
    app.route('/upload-image').post(ImgController.upload_image);
    app.route('/get-images/:_id').get(ImgController.get_images);
    app.route('/delete-image/:_id').get(ImgController.delete_image);
};
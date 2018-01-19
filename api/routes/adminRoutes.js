/* eslint-disable linebreak-style */
'use strict';
module.exports = function(app) {
    var admin = require('../controllers/adminController');

    // users Routes
    app.route('/admin/search/:q/:userId')
        .get(admin.search);

    app.route('/admin/find/:pageNumber/:userId')
        .get(admin.find);

    app.route('/admin/delete/:targetId/:userId')
        .get(admin.delete_a_user);

    app.route('/admin/approve/:approved/:targetId/:userId')
        .get(admin.approve_a_user);
};
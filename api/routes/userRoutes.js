'use strict';
module.exports = function(app) {
  var users = require('../controllers/userController');

  // users Routes
  app.route('/users/:userId')
    .get(users.read_a_user);

  app.route('/search/:q/:minAge/:maxAge/:gender/:radius/:sex/:_id/')
      .get(users.search);

  app.route('/verify/:email/:token')
      .get(users.verify);

  app.route('/reset')
      .post(users.reset);

  app.route('/reset2/:email/:token')
      .get(users.reset2);

  app.route('/reset3')
      .post(users.reset3);

  app.route('/save-profile')
      .post(users.save_profile);

  app.route('/logout/:_id')
      .get(users.logout);

  app.route('/send-request/:targetId/:userId')
      .get(users.send_request);

  app.route('/find-user-requests/:userId')
      .get(users.find_user_requests);

  app.route('/accept-user-request/:targetId/:userId')
      .get(users.accept_user_request);

  app.route('/decline-user-request/:targetId/:userId')
      .get(users.decline_user_request);

  app.route('/find-friends/:userId')
      .get(users.find_friends);

  app.route('/remove-friend/:targetId/:userId')
      .get(users.remove_friend);

  app.route('/remove-from-messages-from/:targetId/:userId')
      .get(users.remove_from_messages_from);

  app.route('/save-profile-img')
      .post(users.save_profile_img);

  app.route('/save-bio')
      .post(users.save_bio);

  app.route('/save-info')
      .post(users.save_info);

  app.route('/mark-as-spam')
      .post(users.mark_as_spam);
};
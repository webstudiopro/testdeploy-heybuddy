module.exports = function(app) {
    var ChatController = require('../controllers/chatController');
    app.route('/chat/:targetId/:userId').get(ChatController.getMessages);
    app.route('/chat/save').post(ChatController.saveMessage);
};
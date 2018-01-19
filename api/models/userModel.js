'use strict';
var mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Schema = mongoose.Schema;
var mongoosePages = require('mongoose-pages');


var UserSchema = new Schema({
  email: {
    type: String,
    required: 'Please enter your email',
    unique: true
  },
  password: {
    type: String,
    required: 'Please enter your password'
  },
  role:{
      type: String,
      default:'user'
  },
  online:{
      type:Boolean,
      default:false
  },
  approved:{
      type:Boolean,
      default:false
  },
  token:{
      type:String
  },
  promoted:{
      type:Boolean,
      default:false
  },
  messagesFrom:[],
  profile:{
      name: {
        type: String
      },
      bio: Schema.Types.Mixed,
      interests:{
          type:String
      },
      age:{
        type:Number
      },
      gender:{
          type:String
      },
      disability:{
          type:String
      },
      avatar:{
          type:String
      },
      cover:{
          type:String
      },
      city:{
          type:String
      },
      images:[],
      videos:[]
  },
  location:Schema.Types.Mixed,
  friends:[],
  requests:[],
  created: {
    type: Date,
    default: Date.now
  }
});

UserSchema.index( { location : "2dsphere" } );
mongoosePages.skip(UserSchema);
/**
 * Compare the passed password with the value in the database. A model method.
 *
 * @param {string} password
 * @returns {object} callback
 */
UserSchema.methods.comparePassword = function comparePassword(password, callback) {
    bcrypt.compare(password, this.password, callback);
};


/**
 * The pre-save hook method.
 */
UserSchema.pre('save', function saveHook(next) {
    const user = this;

    // proceed further only if the password is modified or the user is new
    if (!user.isModified('password')) return next();


    return bcrypt.genSalt((saltError, salt) => {
        if (saltError) { return next(saltError); }

        return bcrypt.hash(user.password, salt, (hashError, hash) => {
            if (hashError) { return next(hashError); }

            // replace a password string with hash value
            user.password = hash;

            return next();
        });
    });
});

module.exports = mongoose.model('Users', UserSchema);
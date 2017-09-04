const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const SALT_WORK_FACTOR = 10;

// User schema
const UserSchema = mongoose.Schema({
  firstname: String,
  lastname: String,
  local: {
    email: {
      type: String,
      lowercase: true
    },
    password: String
  },
  facebook: {
    facebookId: String,
    access_token: String,
    email: String
  },
  slack: {
    slackId: String,
    email: String
  },
  role: {
    type: String,
    trim: true,
    enum: ['admin', 'coach', 'leader', 'auxiliary', 'family', 'guest'],
    default: ['guest']
  },
  employee_id: {
    type: Number,
    trim: true
  },
  customer_id: {
    type: Number,
    trim: true
  },
  sector: {
    type: String,
    trim: true
  }
}, { timestamps: true });
// timestamps allows the db to automatically create 'created_at' and 'updated_at' fields

UserSchema.pre('save', async function (next) {
  try {
    const user = this;
    // Check email validity
    if (user.isModified('local.email')) {
      if (!validator.isEmail(user.local.email)) {
        const error = new Error();
        error.name = 'InvalidEmail';
        return next(error);
      }
    }
    // Check if password is modified, then encrypt it thanks to bcrypt
    if (!user.isModified('local.password')) return next();
    // Gen salt
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    // Hash password
    const hash = await bcrypt.hash(user.local.password, salt);
    // Store password
    user.local.password = hash;
    return next();
  } catch (e) {
    return next(e);
  }
});

module.exports = mongoose.model('User', UserSchema);

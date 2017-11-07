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
      lowercase: true,
      trim: true
    },
    password: String
  },
  facebook: {
    facebookId: String,
    access_token: String,
    email: String,
    address: {
      id: String,
      channelId: String,
      user: {
        id: Number,
        name: String
      },
      conversation: {
        isGroup: Boolean,
        id: String
      },
      bot: {
        id: Number,
        name: String
      },
      serviceUrl: String
    }
  },
  slack: {
    slackId: String,
    email: String
  },
  role: {
    type: String,
    trim: true,
    enum: ['admin', 'tech', 'coach', 'leader', 'auxiliary', 'family', 'guest'],
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
  },
  youtube: {
    link: {
      type: String,
      trim: true
    },
    location: {
      type: [String],
      trim: true
    }
  },
  picture: {
    type: String,
    trim: true
  },
  planningModification: [
    {
      content: String,
      involved: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      modificationType: String,
      check: {
        isChecked: {
          type: Boolean,
          default: false
        },
        checkBy: {
          type: mongoose.Schema.Types.ObjectId,
          default: null
        }
      }
    }
  ]
}, { timestamps: true });
// timestamps allows the db to automatically create 'created_at' and 'updated_at' fields

UserSchema.statics.findUserAddressById = async function (id) {
  try {
    const User = this;
    const filter = {
      _id: id,
      'facebook.address': {
        $exists: true
      }
    };
    return await User.findOne(filter, { 'facebook.address': 1 })
  } catch (e) {
    return Promise.reject(e);
  }
}

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

UserSchema.pre('findOneAndUpdate', async function (next) {
  try {
    // Use mongoDB string dot notation to get update password
    const password = this.getUpdate().$set['local.password'];
    if (!password) {
      return next();
    }
    // Gen salt
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    // Hash password
    const hash = await bcrypt.hash(password, salt);
    // Store password using dot notation
    this.getUpdate().$set['local.password'] = hash;
    return next();
  } catch (e) {
    return next(e);
  }
});


module.exports = mongoose.model('User', UserSchema);

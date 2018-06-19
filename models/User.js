const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const Role = require('./Role');

const SALT_WORK_FACTOR = 10;

// User schema
const UserSchema = mongoose.Schema({
  firstname: String,
  lastname: String,
  refreshToken: String,
  resetPassword: {
    token: {
      type: String,
      default: null
    },
    expiresIn: {
      type: Date,
      default: null
    },
    from: String
  },
  local: {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
      dropDups: true
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
        id: String,
        name: String
      },
      conversation: {
        isGroup: Boolean,
        id: String
      },
      bot: {
        id: String,
        name: String
      },
      serviceUrl: String
    }
  },
  slack: {
    slackId: String,
    email: String
  },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  // role: [Role],
  // type: String,
  // trim: true,
  // enum: ['admin', 'tech', 'coach', 'leader', 'auxiliary', 'family', 'guest'],
  // default: ['guest']
  // },
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
    publicId: String,
    link: {
      type: String,
      trim: true
    }
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
        },
        checkedAt: {
          type: Date,
          default: null
        }
      }
    }
  ],
  isConstrained: Boolean,
  mobilePhone: String,
  managerId: { type: mongoose.Schema.Types.ObjectId },
  administrative: {
    driveFolder: {
      id: String,
      link: String
    },
    // driveIdFolder: String,
    endorsement: {
      type: Boolean,
      default: false
    },
    signup: {
      firstSmsDate: Date,
      secondSmsDate: Date,
      step: {
        type: String,
        default: 'first'
      },
      complete: {
        type: Boolean,
        default: false
      }
    },
    payment: {
      rib: {
        iban: String,
        bic: String
      },
      cesu: [String],
      invoices: [String],
      fiscalAttests: [String]
    },
    idCardRecto: {
      driveId: String,
      link: String
    },
    idCardVerso: {
      driveId: String,
      link: String
    },
    healthAttest: {
      driveId: String,
      link: String,
      has: Boolean
    },
    vitalCard: {
      driveId: String,
      link: String
    },
    certificates: {
      has: Boolean,
      docs: [
        {
          driveId: String,
          link: String
        }
      ]
    },
    phoneInvoice: {
      driveId: String,
      link: String,
      has: Boolean
    },
    navigoInvoice: {
      driveId: String,
      link: String,
      has: Boolean
    },
    mutualFund: {
      driveId: String,
      link: String,
      has: Boolean
    },
  },
}, { timestamps: true });
// timestamps allows the db to automatically create 'created_at' and 'updated_at' fields

async function findUserAddressByEmployeeId(id) {
  try {
    const user = this;
    const filter = {
      employee_id: id,
      'facebook.address': {
        $exists: true
      }
    };
    return await user.findOne(filter, { 'facebook.address': 1 });
  } catch (e) {
    return Promise.reject(e);
  }
}

async function saveWithRoleId(roleName) {
  const user = this;
  try {
    // Replace Role name by role ID
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      const noRoleErr = new Error();
      noRoleErr.name = 'NoRole';
      throw noRoleErr;
    }
    user.role = role._id;
    return await user.save();
  } catch (e) {
    return Promise.reject(e);
  }
}

async function save(next) {
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
}

async function findOneAndUpdate(next) {
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
}

UserSchema.statics.findUserAddressByEmployeeId = findUserAddressByEmployeeId;
UserSchema.methods.saveWithRoleId = saveWithRoleId;
UserSchema.pre('save', save);
UserSchema.pre('findOneAndUpdate', findOneAndUpdate);

module.exports = mongoose.model('User', UserSchema);

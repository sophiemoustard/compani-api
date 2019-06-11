const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const bcrypt = require('bcrypt');
const validator = require('validator');
const moment = require('moment');

const Role = require('./Role');
const Company = require('./Company');

const SALT_WORK_FACTOR = 10;

// User schema
const UserSchema = mongoose.Schema({
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
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    autopopulate: {
      select: '-__v -createdAt -updatedAt',
      maxDepth: 3
    }
  },
  employee_id: {
    type: Number,
    trim: true
  },
  customer_id: {
    type: Number,
    trim: true
  },
  sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
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
  identity: {
    title: String,
    firstname: String,
    lastname: String,
    nationality: String,
    birthDate: Date,
    birthCountry: String,
    birthState: String,
    birthCity: String,
    socialSecurityNumber: Number
  },
  contact: {
    address: {
      street: String,
      additionalAddress: String,
      zipCode: String,
      city: String,
      fullAddress: String,
      location: {
        type: { type: String },
        coordinates: [Number]
      }
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
  emergencyPhone: String,
  mentor: String,
  ogustInterlocId: String,
  contracts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
  }],
  administrative: {
    driveFolder: {
      id: String,
      link: String
    },
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
      link: String,
    },
    idCardVerso: {
      driveId: String,
      link: String,
    },
    passport: {
      driveId: String,
      link: String
    },
    residencePermitRecto: {
      driveId: String,
      link: String
    },
    residencePermitVerso: {
      driveId: String,
      link: String
    },
    healthAttest: {
      driveId: String,
      link: String,
      has: Boolean,
    },
    vitalCard: {
      driveId: String,
      link: String,
    },
    identityDocs: String,
    certificates: [{
      driveId: String,
      link: String
    }],
    phoneInvoice: {
      driveId: String,
      link: String,
      has: Boolean,
    },
    navigoInvoice: {
      driveId: String,
      link: String,
      has: Boolean,
    },
    transportInvoice: {
      driveId: String,
      link: String,
      transportType: String
    },
    mutualFund: {
      driveId: String,
      link: String,
      has: Boolean,
    },
    medicalCertificate: {
      driveId: String,
      link: String
    },
    emergencyContact: {
      name: String,
      phoneNumber: String
    },
    absences: [{
      startDate: Date,
      endDate: Date,
      startDuration: String,
      endDuration: String,
      reason: String,
      driveId: String,
      link: String
    }]
  },
  procedure: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      autopopulate: {
        select: '-__v -createdAt -updatedAt',
        maxDepth: 2
      }
    },
    check: {
      isDone: {
        type: Boolean,
        default: false
      },
      at: {
        type: Date,
        default: null
      }
    }
  }],
  isConfirmed: {
    type: Boolean,
    default: false
  },
  historyChanges: [{
    updatedFields: [{
      name: String,
      value: String
    }],
    date: {
      type: Date,
      default: null
    },
    by: String
  }],
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    autopopulate: {
      select: '-__v -createdAt -updatedAt',
      maxDepth: 2
    }
  },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  inactivityDate: { type: Date, default: null },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});
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

async function saveByParams(params) {
  const user = this;
  try {
    // Replace Role name by role ID
    if (params.role) {
      const role = await Role.findOne({ name: params.role });
      if (!role) {
        const noRoleErr = new Error();
        noRoleErr.name = 'NoRole';
        throw noRoleErr;
      }
      user.role = role._id;
    }

    if (params.company) {
      const company = await Company.findOne({ name: params.company });
      if (company) {
        user.company = company._id;
      }
    }
    const userSaved = await user.save();
    return userSaved.toObject();
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

function setIsActive() {
  return !(this.inactivityDate && moment(this.inactivityDate).isSameOrBefore(moment()));
}

UserSchema.virtual('isActive').get(setIsActive);

UserSchema.statics.findUserAddressByEmployeeId = findUserAddressByEmployeeId;
UserSchema.methods.saveByParams = saveByParams;
UserSchema.pre('save', save);
UserSchema.pre('findOneAndUpdate', findOneAndUpdate);

UserSchema.plugin(autopopulate);

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const bcrypt = require('bcrypt');
const validator = require('validator');
const moment = require('moment');
const Boom = require('boom');

const Role = require('./Role');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const locationSchemaDefinition = require('./schemaDefinitions/location');
const identitySchemaDefinition = require('./schemaDefinitions/identity');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { AUXILIARY, PLANNING_REFERENT } = require('../helpers/constants');

const SALT_WORK_FACTOR = 10;

// User schema
const UserSchema = mongoose.Schema({
  refreshToken: String,
  resetPassword: {
    token: { type: String, default: null },
    expiresIn: { type: Date, default: null },
    from: String,
  },
  local: {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
      dropDups: true,
    },
    password: String,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    autopopulate: {
      select: '-__v -createdAt -updatedAt',
      maxDepth: 3,
    },
  },
  employee_id: { type: Number, trim: true },
  sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
  youtube: {
    link: { type: String, trim: true },
    location: { type: [String], trim: true },
  },
  picture: {
    publicId: String,
    link: { type: String, trim: true },
  },
  identity: {
    type: mongoose.Schema({
      ...identitySchemaDefinition,
      nationality: String,
      birthCountry: String,
      birthState: String,
      birthCity: String,
      socialSecurityNumber: Number,
    }, { _id: false }),
    required: true,
  },
  contact: {
    address: {
      ...addressSchemaDefinition,
      additionalAddress: String,
      location: locationSchemaDefinition,
    },
  },
  mobilePhone: String,
  emergencyPhone: String,
  mentor: String,
  contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
  administrative: {
    driveFolder: driveResourceSchemaDefinition,
    signup: {
      firstSmsDate: Date,
      secondSmsDate: Date,
      step: { type: String, default: 'first' },
      complete: { type: Boolean, default: false },
    },
    payment: {
      rib: {
        iban: String,
        bic: String,
      },
      cesu: [String],
      invoices: [String],
      fiscalAttests: [String],
    },
    idCardRecto: driveResourceSchemaDefinition,
    idCardVerso: driveResourceSchemaDefinition,
    passport: driveResourceSchemaDefinition,
    residencePermitRecto: driveResourceSchemaDefinition,
    residencePermitVerso: driveResourceSchemaDefinition,
    healthAttest: driveResourceSchemaDefinition,
    vitalCard: driveResourceSchemaDefinition,
    identityDocs: String,
    certificates: [driveResourceSchemaDefinition],
    phoneInvoice: driveResourceSchemaDefinition,
    navigoInvoice: driveResourceSchemaDefinition,
    transportInvoice: {
      ...driveResourceSchemaDefinition,
      transportType: String,
    },
    mutualFund: {
      ...driveResourceSchemaDefinition,
      has: Boolean,
    },
    medicalCertificate: driveResourceSchemaDefinition,
    emergencyContact: {
      name: String,
      phoneNumber: String,
    },
  },
  procedure: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    check: {
      isDone: { type: Boolean, default: false },
      at: { type: Date, default: null },
    },
  }],
  isConfirmed: { type: Boolean, default: false },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    autopopulate: {
      select: '-__v -createdAt -updatedAt',
      maxDepth: 2,
    },
  },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  inactivityDate: { type: Date, default: null },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

async function save(next) {
  try {
    const user = this;

    const roleCount = await Role.countDocuments({ _id: user.role });
    if (roleCount === 0) throw Boom.badRequest('Role does not exist');

    if (user.isModified('local.email')) {
      if (!validator.isEmail(user.local.email)) {
        const error = new Error();
        error.name = 'InvalidEmail';
        return next(error);
      }
    }

    if (!user.isModified('local.password')) return next();
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    const hash = await bcrypt.hash(user.local.password, salt);
    user.local.password = hash;

    return next();
  } catch (e) {
    return next(e);
  }
}

async function findOneAndUpdate(next) {
  try {
    const password = this.getUpdate().$set['local.password'];
    if (!password) {
      return next();
    }
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    const hash = await bcrypt.hash(password, salt);
    this.getUpdate().$set['local.password'] = hash;

    return next();
  } catch (e) {
    return next(e);
  }
}

function setIsActive() {
  if (this.role && [AUXILIARY, PLANNING_REFERENT].includes(this.role.name)) {
    return !((this.inactivityDate && moment(this.inactivityDate).isSameOrBefore(moment()))
      || ((!this.contracts || this.contracts.length === 0) && moment().diff(this.createdAt, 'd') > 45));
  }
}

UserSchema.virtual('isActive').get(setIsActive);
UserSchema.pre('save', save);
UserSchema.pre('findOneAndUpdate', findOneAndUpdate);

UserSchema.plugin(autopopulate);

module.exports = mongoose.model('User', UserSchema);

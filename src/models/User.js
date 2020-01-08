const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const autopopulate = require('mongoose-autopopulate');
const bcrypt = require('bcrypt');
const validator = require('validator');
const moment = require('moment');
const get = require('lodash/get');

const addressSchemaDefinition = require('./schemaDefinitions/address');
const { identitySchemaDefinition } = require('./schemaDefinitions/identity');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { AUXILIARY, PLANNING_REFERENT, COMPANY_CONTRACT } = require('../helpers/constants');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SALT_WORK_FACTOR = 10;

const procedureSchema = mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  check: {
    isDone: { type: Boolean, default: false },
    at: { type: Date, default: null },
  },
}, { id: false });

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
    autopopulate: { select: '-__v -createdAt -updatedAt', maxDepth: 3 },
    required: true,
  },
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
    address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false }) },
    phone: String,
  },
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
  procedure: [procedureSchema],
  isConfirmed: { type: Boolean, default: false },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    autopopulate: { select: '-__v -updatedAt', maxDepth: 2 },
    required: true,
  },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  inactivityDate: { type: Date, default: null },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
  id: false,
});

async function save(next) {
  try {
    const user = this;

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

const isActive = (auxiliary) => {
  if (auxiliary.role && [AUXILIARY, PLANNING_REFERENT].includes(auxiliary.role.name)) {
    const { contracts, inactivityDate, createdAt } = auxiliary;
    const hasCompanyContract = contracts && contracts.some(c => c.status === COMPANY_CONTRACT);
    const isNew = (!auxiliary.contracts || auxiliary.contracts.length === 0) && moment().diff(createdAt, 'd') < 45;
    const isInactive = inactivityDate && moment().isAfter(inactivityDate);

    return !isInactive && (hasCompanyContract || isNew);
  }
};

function setIsActive() {
  return isActive(this);
}

async function populateAfterSave(doc, next) {
  try {
    await doc
      .populate({
        path: 'role',
        select: '-__v -createdAt -updatedAt',
        populate: { path: 'role.right_id', select: 'description permission _id' },
      })
      .populate({ path: 'company', select: '-__v -createdAt -updatedAt' })
      .populate({ path: 'sector', select: '_id sector', match: { company: doc.company } })
      .execPopulate();

    if (doc.sector) doc.sector = doc.sector.sector._id;

    return next();
  } catch (e) {
    return next(e);
  }
}

function populateSector(doc, next) {
  if (get(doc, 'sector.sector._id')) doc.sector = doc.sector.sector._id;

  return next();
}

function populateSectors(docs, next) {
  for (const doc of docs) {
    if (doc && doc.sector) {
      doc.sector = doc.sector.sector;
    }
  }

  return next();
}

UserSchema.virtual('sector', {
  ref: 'SectorHistory',
  localField: '_id',
  foreignField: 'auxiliary',
  justOne: true,
  options: { sort: { startDate: -1 } },
});

UserSchema.virtual('sectorHistories', {
  ref: 'SectorHistory',
  localField: '_id',
  foreignField: 'auxiliary',
  options: { sort: { startDate: -1 } },
});

UserSchema.statics.isActive = isActive;
UserSchema.virtual('isActive').get(setIsActive);
UserSchema.pre('save', save);
UserSchema.pre('findOneAndUpdate', findOneAndUpdate);
UserSchema.pre('find', validateQuery);
UserSchema.pre('validate', validatePayload);
UserSchema.pre('aggregate', validateAggregation);
UserSchema.post('save', populateAfterSave);
UserSchema.post('findOne', populateSector);
UserSchema.post('findOneAndUpdate', populateSector);
UserSchema.post('find', populateSectors);

UserSchema.plugin(mongooseLeanVirtuals);
UserSchema.plugin(autopopulate);

module.exports = mongoose.model('User', UserSchema);

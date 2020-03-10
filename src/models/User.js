const Boom = require('@hapi/boom');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const autopopulate = require('mongoose-autopopulate');
const bcrypt = require('bcrypt');
const validator = require('validator');
const moment = require('moment');
const get = require('lodash/get');

const Role = require('./Role');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { identitySchemaDefinition } = require('./schemaDefinitions/identity');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { AUXILIARY, PLANNING_REFERENT, COMPANY_CONTRACT, INTERNAL, EXTERNAL, TRAINER } = require('../helpers/constants');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SALT_WORK_FACTOR = 10;
const TOKEN_EXPIRE_TIME = 86400;
const USER_STATUS = [INTERNAL, EXTERNAL];

const procedureSchema = mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  check: {
    isDone: { type: Boolean, default: false },
    at: { type: Date, default: null },
  },
}, { id: false });

const roleSchemaDefinition = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Role',
  autopopulate: { select: '-__v -createdAt -updatedAt', maxDepth: 3 },
};

// User schema
const UserSchema = mongoose.Schema({
  refreshToken: String,
  passwordToken: {
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
    password: { type: String },
  },
  role: {
    client: {
      ...roleSchemaDefinition,
      required() { return !this.role.vendor; },
    },
    vendor: {
      ...roleSchemaDefinition,
      required() { return !this.role.client; },
    },
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
  },
  establishment: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment' },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  inactivityDate: { type: Date, default: null },
  status: { type: String, enum: USER_STATUS },
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
  const auxiliaryRoleName = get(auxiliary, 'role.client.name');
  if (auxiliaryRoleName && [AUXILIARY, PLANNING_REFERENT].includes(auxiliaryRoleName)) {
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

const serialNumber = (auxiliary) => {
  const createdAt = moment(auxiliary.createdAt).format('YYMMDDHHmm');
  const initials = `${auxiliary.identity.lastname.substring(0, 2)}${auxiliary.identity.firstname.charAt(0)}`;

  return `${initials.toUpperCase()}${createdAt}`;
};

function setContractCreationMissingInfo() {
  const mandatoryInfo = [
    'identity.lastname',
    'identity.firstname',
    'identity.birthDate',
    'identity.birthCity',
    'identity.birthState',
    'identity.nationality',
    'identity.socialSecurityNumber',
    'contact.address.fullAddress',
    'establishment',
  ];

  const contractCreationMissingInfo = [];
  for (const info of mandatoryInfo) {
    if (!get(this, info)) contractCreationMissingInfo.push(info);
  }

  return contractCreationMissingInfo;
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

async function validateUserPayload(next) {
  if (this.role.vendor) {
    const role = await Role.findById(this.role.vendor).lean();
    if (role.name === TRAINER && !USER_STATUS.includes(this.status)) throw Boom.badRequest();
  }
  validatePayload.call(this, next, !!this.role.vendor);
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

UserSchema.statics.serialNumber = serialNumber;
UserSchema.statics.isActive = isActive;

UserSchema.virtual('isActive').get(setIsActive);
UserSchema.virtual('contractCreationMissingInfo').get(setContractCreationMissingInfo);

UserSchema.pre('save', save);
UserSchema.pre('findOneAndUpdate', findOneAndUpdate);
UserSchema.pre('find', validateQuery);
UserSchema.pre('validate', validateUserPayload);
UserSchema.pre('aggregate', validateAggregation);

UserSchema.post('findOne', populateSector);
UserSchema.post('findOneAndUpdate', populateSector);
UserSchema.post('find', populateSectors);

UserSchema.plugin(mongooseLeanVirtuals);
UserSchema.plugin(autopopulate);

module.exports = mongoose.model('User', UserSchema);
module.exports.TOKEN_EXPIRE_TIME = TOKEN_EXPIRE_TIME;

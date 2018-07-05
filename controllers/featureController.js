const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Feature = require('../models/Feature');
const Role = require('../models/Role');

const { language } = translate;

const create = async (req) => {
  try {
    const feature = new Feature(req.payload);
    await feature.save();
    const payload = {
      _id: feature._id,
      name: feature.name,
    };
    await Role.updateMany({
      name: {
        $not: /^Admin$/
      }
    }, {
      $push: {
        features: {
          feature_id: payload._id,
          permission_level: 0
        }
      }
    });
    await Role.update({
      name: 'Admin'
    }, {
      $push: {
        features: {
          feature_id: payload._id,
          permission_level: 2
        }
      }
    });
    return {
      message: translate[language].featureCreated,
      data: {
        feature: payload
      }
    };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].featureExists);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};


const update = async (req) => {
  try {
    const featureUpdated = await Feature.findOneAndUpdate({
      _id: req.params._id
    }, {
      $set: flat(req.payload)
    }, {
      new: true
    });
    if (!featureUpdated) {
      return Boom.notFound(translate[language].featureNotFound);
    }
    return {
      message: translate[language].featureUpdated,
      data: {
        feature: featureUpdated
      }
    };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].featureExists);
    }
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showAll = async (req) => {
  try {
    const features = await Feature.find(req.query).select('_id name').lean();
    if (features.length === 0) {
      return Boom.notFound(translate[language].featuresShowAllNotFound);
    }
    return {
      message: translate[language].featuresShowAllFound,
      data: {
        features
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showById = async (req) => {
  try {
    const feature = await Feature.findOne({
      _id: req.params._id
    }).lean();
    if (!feature) {
      return Boom.notFound(translate[language].featureNotFound);
    }
    return {
      success: true,
      message: translate[language].featureFound,
      data: {
        feature
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const featureDeleted = await Feature.findByIdAndRemove({
      _id: req.params._id
    });
    if (!featureDeleted) {
      return Boom.notFound(translate[language].featureNotFound);
    }
    await Role.update({}, {
      $pull: {
        features: {
          feature_id: req.params._id
        }
      }
    }, {
      multi: true
    });
    return {
      message: translate[language].featureRemoved,
      data: {
        featureDeleted
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  create,
  update,
  showAll,
  showById,
  remove
};

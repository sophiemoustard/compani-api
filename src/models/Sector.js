const mongoose = require('mongoose');
const User = require('./User');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SectorSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId,
}, {
  timestamps: true,
});

const countAuxiliaries = async (docs) => {
  if (docs.length > 0) {
    for (const sector of docs) {
      sector.auxiliaryCount = await User.countDocuments({ sector: sector._id });
    }
  }
};

SectorSchema.pre('find', validateQuery);
SectorSchema.pre('validate', validatePayload);
SectorSchema.pre('aggregate', validateAggregation);
SectorSchema.post('find', countAuxiliaries);

module.exports = mongoose.model('Sector', SectorSchema);

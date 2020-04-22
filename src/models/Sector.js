const mongoose = require('mongoose');
const SectorHistory = require('./SectorHistory');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SectorSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId,
}, {
  timestamps: true,
});

const hasAuxiliaries = async (docs) => {
  if (docs.length > 0) {
    for (const sector of docs) {
      sector.hasAuxiliaries = !!(await SectorHistory.countDocuments({ sector: sector._id }));
    }
  }
};

SectorSchema.pre('find', validateQuery);
SectorSchema.pre('validate', validatePayload);
SectorSchema.pre('aggregate', validateAggregation);
SectorSchema.post('find', hasAuxiliaries);

module.exports = mongoose.model('Sector', SectorSchema);

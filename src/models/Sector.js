const mongoose = require('mongoose');
const SectorHistory = require('./SectorHistory');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const SectorSchema = mongoose.Schema({
  name: String,
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
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
SectorSchema.pre('aggregate', validateAggregation);
SectorSchema.post('find', hasAuxiliaries);
formatQueryMiddlewareList().map(middleware => SectorSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Sector', SectorSchema);

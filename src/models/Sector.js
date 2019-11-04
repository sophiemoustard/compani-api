const mongoose = require('mongoose');
const Boom = require('boom');
const User = require('./User');

const SectorSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId,
}, {
  timestamps: true,
});

function validateQuery() {
  const query = this.getQuery();
  if (!query.company) throw Boom.badRequest();
}

const countAuxiliaries = async (docs) => {
  if (docs.length > 0) {
    for (const sector of docs) {
      sector.auxiliaryCount = await User.countDocuments({ sector: sector._id });
    }
  }
};

SectorSchema.pre('find', validateQuery);
SectorSchema.post('find', countAuxiliaries);

module.exports = mongoose.model('Sector', SectorSchema);

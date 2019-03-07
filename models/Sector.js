const mongoose = require('mongoose');

const SectorSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

SectorSchema.virtual('auxiliaryCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'sector',
  count: true
});

const populateAuxiliaryCount = async (docs) => {
  for (const doc of docs) {
    await doc.populate('auxiliaryCount').execPopulate();
  }
};

SectorSchema.post('find', populateAuxiliaryCount);

module.exports = mongoose.model('Sector', SectorSchema);

const mongoose = require('mongoose');

const SectorSchema = mongoose.Schema({
  name: String,
  company: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

SectorSchema.virtual('numAuxiliary', {
  ref: 'User',
  localField: '_id',
  foreignField: 'sector',
  count: true
});

async function populateNumAuxiliary(docs) {
  for (const doc of docs) {
    await doc.populate('numAuxiliary').execPopulate();
  }
}

SectorSchema.post('find', populateNumAuxiliary);

module.exports = mongoose.model('Sector', SectorSchema);

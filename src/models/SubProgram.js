const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const { DRAFT, PUBLISHED, E_LEARNING } = require('../helpers/constants');

const STATUS_TYPES = [DRAFT, PUBLISHED];

const SubProgramSchema = mongoose.Schema({
  name: { type: String, required: true },
  steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
  status: { type: String, default: DRAFT, enum: STATUS_TYPES },
}, { timestamps: true, id: false });

SubProgramSchema.virtual('program', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'subPrograms',
  justOne: true,
});

SubProgramSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'subProgram',
});

function setIsStrictlyELearning() {
  if (this.steps && this.steps.length && this.steps[0].type) {
    return this.steps.every(step => step.type === E_LEARNING);
  }

  return false;
}

// eslint-disable-next-line consistent-return
function setAreStepsValid() {
  if (this.steps && this.steps.length === 0) return false;

  if (this.steps && this.steps.length && this.steps[0].activities) {
    return this.steps.every(step => step.areActivitiesValid);
  }
}

SubProgramSchema.virtual('areStepsValid').get(setAreStepsValid);

SubProgramSchema.virtual('isStrictlyELearning').get(setIsStrictlyELearning);

SubProgramSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('SubProgram', SubProgramSchema);
module.exports.STATUS_TYPES = STATUS_TYPES;

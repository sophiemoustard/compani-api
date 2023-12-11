const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const TrainerMissionSchema = mongoose.Schema({
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  courses: { type: [mongoose.Schema.Types.ObjectId], ref: 'Course', required: true, immutable: true },
  date: { type: Date, default: Date.now },
  file: {
    publicId: { type: String, required: true },
    link: { type: String, trim: true, required: true },
  },
  fee: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => TrainerMissionSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('TrainerMission', TrainerMissionSchema);

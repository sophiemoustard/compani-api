module.exports = {
  unitTTCRate: Number,
  estimatedWeeklyVolume: Number,
  evenings: Number,
  sundays: Number,
  service: { name: String, nature: String, surcharge: { evening: Number, sunday: Number } },
};

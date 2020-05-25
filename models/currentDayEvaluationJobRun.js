const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CurrentDayEvaluationJobRunSchema = new Schema({
  created: { type: Date, index: true },
  results: { type: Schema.Types.Mixed },
});

const CurrentDayEvaluationJobRun = mongoose.model(
  'currentDayEvaluationJobRun',
  CurrentDayEvaluationJobRunSchema
);

module.exports = CurrentDayEvaluationJobRun;

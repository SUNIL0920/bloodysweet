import mongoose from 'mongoose';

const { Schema } = mongoose;

const PledgeSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'BloodRequest', required: true, index: true },
  donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  etaMinutes: { type: Number, min: 0, max: 300 },
  availableForMinutes: { type: Number, min: 0, max: 480 },
  status: { type: String, enum: ['pledged','arrived','cancelled'], default: 'pledged' },
  code: { type: String, required: true },
  feedbackRating: { type: Number, min: 1, max: 5 },
  feedbackComment: { type: String },
  feedbackAt: { type: Date },
  // wellness report captured at donation time
  reportAt: { type: Date },
  bpSys: { type: Number, min: 60, max: 220 },
  bpDia: { type: Number, min: 40, max: 150 },
  hemoglobin: { type: Number, min: 0, max: 25 },
  sugar: { type: Number, min: 0, max: 400 },
  unitsDonated: { type: Number, min: 0, max: 20 },
  certificateId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

PledgeSchema.index({ request: 1, donor: 1 }, { unique: true });

const Pledge = mongoose.model('Pledge', PledgeSchema);
export default Pledge; 
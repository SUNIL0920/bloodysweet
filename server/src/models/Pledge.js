import mongoose from 'mongoose';

const { Schema } = mongoose;

const PledgeSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'BloodRequest', required: true, index: true },
  donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  etaMinutes: { type: Number, min: 0, max: 300 },
  status: { type: String, enum: ['pledged','arrived','cancelled'], default: 'pledged' },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

PledgeSchema.index({ request: 1, donor: 1 }, { unique: true });

const Pledge = mongoose.model('Pledge', PledgeSchema);
export default Pledge; 
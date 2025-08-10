import mongoose from 'mongoose';

const { Schema } = mongoose;

const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], required: true, default: 'Point' },
  coordinates: {
    type: [Number], // [lng, lat]
    required: true,
  }
}, { _id: false });

const BloodRequestSchema = new Schema({
  hospital: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bloodType: { type: String, required: true, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
  status: { type: String, enum: ['active', 'fulfilled', 'closed'], default: 'active', index: true },
  location: { type: GeoPointSchema, required: true },
  createdAt: { type: Date, default: Date.now }
});

BloodRequestSchema.index({ location: '2dsphere' });

const BloodRequest = mongoose.model('BloodRequest', BloodRequestSchema);
export default BloodRequest; 
import mongoose from 'mongoose'

const { Schema } = mongoose

const SwapRequestSchema = new Schema({
  fromHospital: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  toHospital: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bloodType: { type: String, required: true, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
  units: { type: Number, required: true, min: 1, max: 50 },
  status: { type: String, enum: ['pending','accepted','declined'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now }
})

const SwapRequest = mongoose.model('SwapRequest', SwapRequestSchema)
export default SwapRequest




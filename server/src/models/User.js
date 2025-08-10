import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const GeoPointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length === 2
          && val[0] >= -180 && val[0] <= 180
          && val[1] >= -90 && val[1] <= 90;
      },
      message: 'coordinates must be [lng, lat]'
    }
  }
}, { _id: false });

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  bloodType: {
    type: String,
    required: true,
    enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-']
  },
  location: { type: GeoPointSchema, required: true },
  role: {
    type: String,
    required: true,
    enum: ['donor', 'hospital'],
    default: 'donor'
  },
  lastDonationDate: { type: Date }
}, { timestamps: true });

UserSchema.index({ location: '2dsphere' });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
export default User; 
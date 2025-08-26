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
  age: { type: Number, min: 16, max: 100 },
  gender: { type: String, enum: ['male','female','other'], default: undefined },
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
  // optional contact fields for WhatsApp notifications
  phone: { type: String }, // store in E.164, e.g., +9198XXXXXXXX
  waApiKey: { type: String }, // CallMeBot per-recipient key (optional)
  lastDonationDate: { type: Date },
  responsivenessScore: { type: Number, min: 0, max: 1, default: 0.5 },
  availabilityWindows: [{ day: { type: Number, min: 0, max: 6 }, start: String, end: String }],
  availableNow: { type: Boolean, default: true },
  creditPoints: { type: Number, default: 0, min: 0 },
  capacityUnits: { type: Number, min: 0, max: 50, default: 0 }, // for hospitals: stock units per blood
  lastHealthCheckAt: { type: Date },
  whatsappOptIn: { type: Boolean, default: false },
  // medical information (self-reported)
  medicalConditions: { type: String }, // brief notes, e.g., chronic conditions
  certificates: [{
    name: { type: String },
    url: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Hospital verification (for users with role === 'hospital')
  verification: {
    status: { type: String, enum: ['unverified','pending','verified','rejected'], default: 'unverified' },
    documents: [{
      type: { type: String }, // e.g., license, registrationProof, authorityLetter, accreditation
      name: { type: String },
      url: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      uploadedAt: { type: Date, default: Date.now }
    }],
    notes: { type: String },
    reviewedAt: { type: Date }
  },
  // Password reset fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
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
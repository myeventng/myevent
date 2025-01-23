import { Schema, model, models, Document } from 'mongoose';

// export interface IUser extends Document {
//   clerkId: string;
//   email: string;
//   username: string;
//   firstName: string;
//   lastName: string;
//   photo: string;
//   // bio?: string;
//   // phone?: string;
//   // address?: string;
//   // accountNumber?: string;
//   // bankName: string;
//   // socialLinks?: { platform: string; url: string }[];
//   // role: 'admin' | 'organizer' | 'user';
//   // organizerProfile?: {
//   //   organizationName: string;
//   //   bio?: string;
//   //   website?: string;
//   // };
//   // isVerified: boolean;
// }

const SocialLinkSchema = new Schema({
  platform: { type: String },
  url: { type: String },
});

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  photo: { type: String, required: true },
  bio: { type: String },
  phone: { type: String },
  address: { type: String },
  accountNumber: { type: String },
  bankName: { type: String },
  socialLinks: [SocialLinkSchema],
  role: { type: String, enum: ['admin', 'organizer', 'user'], default: 'user' },
  organizerProfile: {
    organizationName: { type: String },
    bio: { type: String },
    website: { type: String },
  },
  isVerified: { type: Boolean, default: false },
  eventsHosted: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
});

const User = models.User || model('User', UserSchema);

export default User;

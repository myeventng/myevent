import { Document, Schema, model, models } from 'mongoose';

export interface IEvent extends Document {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  city?: string;
  createdAt: Date;
  imageUrl: string;
  coverImageUrl?: string;
  startDateTime: Date;
  endDateTime: Date;
  isFree: boolean;
  url?: string;
  category: { _id: string; name: string };
  organizer: { _id: string; firstName: string; lastName: string };
  tags?: string[];
  attendeeLimit?: number;
  ratings?: { userId: string; rating: number; comment?: string }[];
  featured?: boolean;
  ticketTypes?: { name: string; price: number; quantity: number }[];
  embeddedVideoUrl?: string;
  publishedStatus: 'draft' | 'pending review';
}

const EventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  city: { type: String },
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, required: true },
  coverImageUrl: { type: String },
  startDateTime: { type: Date, default: Date.now },
  endDateTime: { type: Date, default: Date.now },
  isFree: { type: Boolean, default: false },
  url: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  organizer: { type: Schema.Types.ObjectId, ref: 'User' },
  venue: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  attendeeLimit: { type: Number },
  ratings: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
    },
  ],
  featured: { type: Boolean, default: false },
  embeddedVideoUrl: { type: String },
  ticketTypes: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 0 },
      tickets: [
        {
          ticketId: { type: String, unique: true },
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          status: { type: String, enum: ['unused', 'used'], default: 'unused' },
        },
      ],
    },
  ],
  publishedStatus: {
    type: String,
    enum: ['draft', 'pending review'],
    default: 'draft',
  },
});

const Event = models.Event || model('Event', EventSchema);

export default Event;

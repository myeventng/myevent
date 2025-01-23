import { Schema, model, models, Document } from 'mongoose';

export interface IVenue extends Document {
  _id: string;
  name: string;
  address: string;
  city: { _id: string; name: string };
  capacity: number;
}

const VenueSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: Schema.Types.ObjectId, ref: 'City', required: true },
  capacity: { type: Number, required: true },
});

const Venue = models.Venue || model('Venue', VenueSchema);

export default Venue;

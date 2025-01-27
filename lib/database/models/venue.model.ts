import { Schema, model, models, Document } from 'mongoose';

export interface IVenue extends Document {
  _id: string;
  name: string;
  address: string;
  city: { _id: string; name: string };
  capacity: number;
  location: { type: 'Point'; coordinates: [number, number] }; // GeoJSON format
}

const VenueSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: Schema.Types.ObjectId, ref: 'City', required: true },
  capacity: { type: Number, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
});

// Add a geospatial index for efficient querying
VenueSchema.index({ location: '2dsphere' });

const Venue = models.Venue || model<IVenue>('Venue', VenueSchema);

export default Venue;

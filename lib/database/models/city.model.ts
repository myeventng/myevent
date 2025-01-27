import { Schema, model, models, Document, STATES } from 'mongoose';

export interface ICity extends Document {
  _id: string;
  name: string;
  state: string;
  population?: number;
}

const CitySchema = new Schema({
  name: { type: String, required: true, unique: true },
  state: { type: String, required: true, unique: true },
  population: { type: Number },
});

const City = models.City || model('City', CitySchema);

export default City;

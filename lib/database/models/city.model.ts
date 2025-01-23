import { Schema, model, models, Document } from 'mongoose';

export interface ICity extends Document {
  _id: string;
  name: string;
  population?: number;
}

const CitySchema = new Schema({
  name: { type: String, required: true, unique: true },
  population: { type: Number },
});

const City = models.City || model('City', CitySchema);

export default City;

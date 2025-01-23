import { Document, Schema, model, models } from 'mongoose';

export interface ICategory extends Document {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isFeatured: boolean;
}

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  imageUrl: { type: String },
  isFeatured: { type: Boolean, default: false },
});

const Category = models.Category || model('Category', CategorySchema);

export default Category;

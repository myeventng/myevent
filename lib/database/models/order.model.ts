import { Schema, model, models, Document } from 'mongoose';

export interface IOrder extends Document {
  _id: string;
  createdAt: Date;
  paystackId: string;
  totalAmount: string;
  quantity: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  refundStatus?: 'initiated' | 'processed' | 'failed';
  event: {
    _id: string;
    title: string;
  };
  buyer: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  purchaseNotes?: string;
}

const OrderSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  paystackId: { type: String, required: true, unique: true },
  totalAmount: { type: String, required: true },
  quantity: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  refundStatus: {
    type: String,
    enum: ['initiated', 'processed', 'failed'],
  },
  event: { type: Schema.Types.ObjectId, ref: 'Event' },
  buyer: { type: Schema.Types.ObjectId, ref: 'User' },
  purchaseNotes: { type: String },
});

const Order = models.Order || model('Order', OrderSchema);

export default Order;

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: String, required: true },
  attendeeName: { type: String, required: true },
  attendeeEmail: { type: String, required: true },
  tickets: { type: Number, required: true, min: 1, default: 1 },
  ticketCode: { type: String, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Free', 'Pending'], default: 'Paid' },
  paymentMethod: { type: String, default: 'Card' },
  transactionId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
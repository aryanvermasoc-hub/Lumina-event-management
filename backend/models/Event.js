const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String, required: true },
    category: { type: String, default: 'Conference' },
    eventType: { type: String, default: 'In person' },
    status: { type: String, default: 'Planning' },
    liveStatus: { type: String, default: 'Upcoming' },
    approvalStatus: { type: String, default: 'Pending' },
    totalCapacity: { type: Number, required: true },
    ticketsSold: { type: Number, default: 0 },
    ticketPrice: { type: Number, default: 0 },
    organizer: { type: String },
    contactEmail: { type: String },
    registrationDeadline: { type: Date },
    imageUrl: { type: String },
    gallery: [{ type: String }],
    videoUrl: { type: String },
    paymentProvider: { type: String, default: 'Demo checkout' },
    reviews: [{
        userName: String,
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    notes: { type: String },
    hostId: { type: String },
    hostName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
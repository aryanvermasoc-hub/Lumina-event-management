const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

// ROUTE 1: Create a new event (POST /api/events)
router.post('/', async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 2: Get all events (GET /api/events)
router.get('/', async (req, res) => {
  try {
    const allEvents = await Event.find();
    res.status(200).json(allEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 3: Delete an event (DELETE /api/events/:id)
router.delete('/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 4: Update an event (PUT /api/events/:id)
router.put('/:id', async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 5: Book tickets for an event (POST /api/events/:id/book)
router.post('/:id/book', async (req, res) => {
  try {
    let { userId, attendeeName, attendeeEmail, tickets = 1, paymentMethod = 'Card', transactionId } = req.body;
    
    if (transactionId && paymentMethod && !paymentMethod.includes(transactionId)) {
      paymentMethod = `${paymentMethod} (Ref: ${transactionId})`;
    }

    const requestedTickets = Number(tickets);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'A valid event is required.' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'Please sign in again before booking.' });
    }

    if (!attendeeName || !attendeeEmail || !Number.isInteger(requestedTickets) || requestedTickets < 1) {
      return res.status(400).json({ error: 'User, attendee details, and ticket count are required.' });
    }

    // Atomically check inventory and increment tickets sold to prevent race conditions
    const event = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'Published',
        $expr: {
          $gte: [
            { $ifNull: ['$totalCapacity', 0] },
            { $add: [{ $ifNull: ['$ticketsSold', 0] }, requestedTickets] }
          ]
        }
      },
      {
        $inc: { ticketsSold: requestedTickets }
      },
      { new: true }
    );

    // If the atomic update failed, determine the reason
    if (!event) {
      const checkEvent = await Event.findById(req.params.id);
      if (!checkEvent) return res.status(404).json({ error: 'Event not found.' });
      if (checkEvent.status !== 'Published') return res.status(400).json({ error: 'This event is not available for booking.' });
      
      return res.status(400).json({ error: 'Not enough seats available.' });
    }

    const booking = await Booking.create({
      eventId: event._id,
      userId,
      attendeeName,
      attendeeEmail,
      tickets: requestedTickets,
      ticketCode: `LUM-${Date.now().toString(36).toUpperCase()}-${String(event._id).slice(-4).toUpperCase()}`,
      paymentStatus: Number(event.ticketPrice || 0) > 0 ? (paymentMethod === 'Card' ? 'Paid' : 'Pending') : 'Free',
      paymentMethod,
      transactionId,
    });

    // If the event just sold out, update its status
    if (event.ticketsSold >= event.totalCapacity) {
      event.status = 'Sold out';
      await event.save();
    }

    res.status(201).json({ booking, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 6: Get bookings for a specific user (GET /api/events/bookings/user/:userId)
router.get('/bookings/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).populate('eventId').sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 7: Get all bookings for organization (GET /api/events/bookings)
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('eventId').sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 8: Update booking payment status (PUT /api/events/bookings/:id/status)
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { paymentStatus: req.body.paymentStatus }, { new: true }).populate('eventId');
    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
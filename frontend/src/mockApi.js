// ─── Offline / mock storage helpers ───────────────────────
function mockDb(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function mockDbSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { return false }
  return true
}

const MOCK_EVENTS_KEY  = 'lumina-mock-events'
const MOCK_USERS_KEY   = 'lumina-mock-users'
const MOCK_BOOKINGS_KEY = 'lumina-mock-bookings'

function genId() { return 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) }

export function seedMockEventsOnce() {}

export const MockAPI = {
  login: function(email, password) {
    var users = mockDb(MOCK_USERS_KEY, [])
    var user = users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase() && u.password === password })
    if (!user) throw new Error('Invalid email or password.')
    var safe = Object.assign({}, user)
    delete safe.password
    return safe
  },
  signup: function(data) {
    var users = mockDb(MOCK_USERS_KEY, [])
    if (users.find(function(u) { return u.email.toLowerCase() === data.email.toLowerCase() })) throw new Error('An account with this email already exists.')
    var newUser = Object.assign({}, data, { _id: genId(), orgRole: data.role === 'organization' ? 'super-admin' : '' })
    mockDbSet(MOCK_USERS_KEY, users.concat([newUser]))
    var safe = Object.assign({}, newUser)
    delete safe.password
    return safe
  },
  getOrganizations: function() {
    return mockDb(MOCK_USERS_KEY, []).filter(function(u) { return u.role === 'organization' })
  },
  getEvents: function() { return mockDb(MOCK_EVENTS_KEY, []) },
  createEvent: function(payload) {
    var events = mockDb(MOCK_EVENTS_KEY, [])
    var ev = Object.assign({}, payload, { _id: genId(), ticketsSold: payload.ticketsSold || 0 })
    mockDbSet(MOCK_EVENTS_KEY, events.concat([ev]))
    return ev
  },
  updateEvent: function(id, payload) {
    var events = mockDb(MOCK_EVENTS_KEY, [])
    var updated = events.map(function(e) { return e._id === id ? Object.assign({}, e, payload, { _id: id }) : e })
    mockDbSet(MOCK_EVENTS_KEY, updated)
    return updated.find(function(e) { return e._id === id })
  },
  deleteEvent: function(id) {
    var events = mockDb(MOCK_EVENTS_KEY, [])
    mockDbSet(MOCK_EVENTS_KEY, events.filter(function(e) { return e._id !== id }))
  },
  bookEvent: function(eventId, userId, attendeeName, attendeeEmail, tickets, paymentMethod, transactionId) {
    var events = mockDb(MOCK_EVENTS_KEY, [])
    var event = events.find(function(e) { return e._id === eventId })
    if (!event) throw new Error('Event not found.')
    var seatsLeft = Number(event.totalCapacity || 0) - Number(event.ticketsSold || 0)
    if (seatsLeft < tickets) throw new Error('Only ' + seatsLeft + ' seat(s) remaining.')
    var updatedEvent = Object.assign({}, event, { ticketsSold: Number(event.ticketsSold || 0) + tickets })
    mockDbSet(MOCK_EVENTS_KEY, events.map(function(e) { return e._id === eventId ? updatedEvent : e }))
    var bookings = mockDb(MOCK_BOOKINGS_KEY, [])
    var booking = { _id: genId(), eventId: updatedEvent, userId: userId, attendeeName: attendeeName, attendeeEmail: attendeeEmail, tickets: tickets, paymentStatus: Number(updatedEvent.ticketPrice || 0) > 0 ? (paymentMethod === 'Card' ? 'Paid' : 'Pending') : 'Free', paymentMethod: paymentMethod || 'Card', transactionId: transactionId || '', ticketCode: 'LUM-' + genId().slice(-6).toUpperCase(), createdAt: new Date().toISOString() }
    mockDbSet(MOCK_BOOKINGS_KEY, bookings.concat([booking]))
    return { event: updatedEvent, booking: booking }
  },
  getBookings: function(userId) {
    return mockDb(MOCK_BOOKINGS_KEY, []).filter(function(b) { return b.userId === userId })
  },
  getAllBookings: function() {
    return mockDb(MOCK_BOOKINGS_KEY, [])
  },
  updateBookingStatus: function(bookingId, status) {
    var bookings = mockDb(MOCK_BOOKINGS_KEY, [])
    var updated = bookings.map(function(b) { return b._id === bookingId ? Object.assign({}, b, { paymentStatus: status }) : b })
    mockDbSet(MOCK_BOOKINGS_KEY, updated)
    return updated.find(function(b) { return b._id === bookingId })
  }
}
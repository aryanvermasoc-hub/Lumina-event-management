export const initialFormData = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  category: 'Conference',
  eventType: 'In person',
  status: 'Published',
  totalCapacity: '',
  ticketPrice: '',
  organizer: '',
  contactEmail: '',
  registrationDeadline: '',
  imageUrl: '',
  gallery: '',
  videoUrl: '',
  acceptedPaymentMethods: 'Card, UPI, Net Banking, Cash on Visit',
  paymentInstructions: 'Add public payment instructions here. Do not publish personal UPI IDs or bank details.',
}

export const initialAuthData = {
  name: '',
  email: '',
  password: '',
  organizationName: '',
  role: 'attendee',
}

export const initialAdminForm = {
  name: '',
  email: '',
  password: '',
  permission: 'Events',
  orgRole: 'admin',
}

export const categories = ['Conference', 'Workshop', 'Meetup', 'Concert', 'Festival', 'Webinar', 'Private']
export const eventTypes = ['In person', 'Virtual', 'Hybrid']
export const statuses = ['Planning', 'Published', 'Sold out', 'Completed']
export const sortOptions = [
  { value: 'soonest', label: 'Soonest first' },
  { value: 'capacity', label: 'Capacity' },
  { value: 'title', label: 'Title' },
]
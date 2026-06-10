import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MockAPI, seedMockEventsOnce } from './mockApi.js'
import { initialFormData, initialAuthData, initialAdminForm, categories, eventTypes, statuses, sortOptions } from './constants.js'
import { readStorage, splitList, toDateInputValue, formatDate, formatCurrency, getCountdown, getInitials, slugify } from './helpers.js'
import { exportICS, downloadPDF, downloadReportPDF } from './exportUtils.js'

const LuxuryStyles = () => null

const API_URL = `${import.meta.env.VITE_API_URL}/api`
const AUTH_URL = `${import.meta.env.VITE_API_URL}/api/auth`
const USE_SAMPLE_DATA = false

function App() {
  const [currentUser, setCurrentUser] = useState(() => readStorage('lumina-user', null))
  const [authMode, setAuthMode] = useState('login')
  const [authData, setAuthData] = useState(initialAuthData)
  const [accessType, setAccessType] = useState('attendee')
  const [events, setEvents] = useState([])
  const [registeredOrganizations, setRegisteredOrganizations] = useState([])
  const [bookings, setBookings] = useState([])
  const [favorites, setFavorites] = useState(() => {
    const user = readStorage('lumina-user', null)
    return user ? readStorage(`lumina-favorites-${user._id || user.id}`, []) : []
  })
  const [notifications, setNotifications] = useState(() => {
    const user = readStorage('lumina-user', null)
    return user ? readStorage(`lumina-notifications-${user._id || user.id}`, []) : []
  })
  const [admins, setAdmins] = useState(() => readStorage('lumina-admins', []))
  const [tasks, setTasks] = useState(() => readStorage('lumina-tasks', []))
  const [theme, setTheme] = useState(() => localStorage.getItem('lumina-theme') || 'dark')
  const [formData, setFormData] = useState(initialFormData)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('soonest')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminForm, setAdminForm] = useState(initialAdminForm)
  const [adminFormError, setAdminFormError] = useState('')
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileEdit, setProfileEdit] = useState({ name: '', email: '' })
  const [paymentModal, setPaymentModal] = useState({ show: false, event: null, quantity: 1, method: 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } })
  const [isBooking, setIsBooking] = useState(false)

  const isOrganization = currentUser?.role === 'organization'
  const orgRole = currentUser?.orgRole || (isOrganization ? 'super-admin' : '')
  const isSuperAdmin = orgRole === 'super-admin'

  const fetchEvents = useCallback(async () => {
    try {
      seedMockEventsOnce()
      let data
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
        data = await response.json()
        data = Array.isArray(data) ? data : (data.events || data.data || [])
      } catch {
        data = MockAPI.getEvents()
      }
      setEvents(data)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchBookings = useCallback(async (userId) => {
    if (!userId) return
    try {
      let data
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events/bookings/user/${userId}`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
        data = await response.json()
        data = Array.isArray(data) ? data : (data.bookings || data.data || [])
      } catch {
        data = MockAPI.getBookings(userId)
      }
      const sorted = [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setBookings(sorted)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }, [])

  const fetchAllBookings = useCallback(async () => {
    try {
      let data
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events/bookings`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
        data = await response.json()
        data = Array.isArray(data) ? data : (data.bookings || data.data || [])
      } catch {
        data = MockAPI.getAllBookings()
      }
      const sorted = [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setBookings(sorted)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }, [])

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch(`${AUTH_URL}/organizations`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
      const isJson = response.headers.get('content-type')?.includes('application/json')
      let data = isJson ? await response.json() : {}
      data = Array.isArray(data) ? data : (data.organizations || data.users || data.data || [])
      setRegisteredOrganizations(data)
      
      // Auto-populate the Admins table with real database users!
      if (currentUser?.role === 'organization') {
        const teamMembers = data.filter(u => u.organizationName === (currentUser.organizationName || currentUser.name));
        const formattedTeam = teamMembers.map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          status: u.status || 'Active',
          permission: 'Dashboard Access',
          orgRole: u.orgRole,
          tasks: 0,
          completed: 0
        }));
        setAdmins(formattedTeam);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }, [currentUser])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lumina-theme', theme)
  }, [theme])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`lumina-favorites-${currentUser._id || currentUser.id}`, JSON.stringify(favorites))
    }
  }, [favorites, currentUser])
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`lumina-notifications-${currentUser._id || currentUser.id}`, JSON.stringify(notifications))
    }
  }, [notifications, currentUser])
  useEffect(() => { localStorage.setItem('lumina-admins', JSON.stringify(admins)) }, [admins])
  useEffect(() => { localStorage.setItem('lumina-tasks', JSON.stringify(tasks)) }, [tasks])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEvents()
      fetchOrganizations()
      if (currentUser?.role === 'attendee') fetchBookings(currentUser._id || currentUser.id)
      if (currentUser?.role === 'organization') fetchAllBookings()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentUser, fetchBookings, fetchAllBookings, fetchEvents, fetchOrganizations])

  const visibleEvents = useMemo(() => {
    const sourceEvents = isOrganization
      ? events.filter((event) => {
          const isOwner = event.hostId === (currentUser?._id || currentUser?.id);
          const isSameOrg = Boolean(event.hostName) && event.hostName === (currentUser?.organizationName || currentUser?.name);
          return !event.hostId || isOwner || isSameOrg;
        })
      : events.filter((event) => !event.status || ['published', 'sold out', 'planning'].includes(String(event.status).toLowerCase()))

    return sourceEvents
      .filter((event) => {
        const search = searchTerm.trim().toLowerCase()
        const matchesSearch =
          !search ||
          [event.title, event.description, event.location, event.organizer, event.hostName, event.contactEmail, event.category, event.eventType]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search))
        const matchesCategory = categoryFilter === 'All' || event.category === categoryFilter
        const matchesStatus = statusFilter === 'All' || event.status === statusFilter
        return matchesSearch && matchesCategory && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
        if (sortBy === 'capacity') return Number(b.totalCapacity || 0) - Number(a.totalCapacity || 0)
        return new Date(a.date || 0) - new Date(b.date || 0)
      })
  }, [categoryFilter, currentUser, events, isOrganization, searchTerm, sortBy, statusFilter])

  const organizations = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    const byName = new Map()

    registeredOrganizations.forEach((organization) => {
      const name = organization.organizationName || organization.name || 'Organization'
      const key = name.toLowerCase()
      byName.set(key, {
        id: organization._id || organization.id || key,
        name,
        contactEmail: organization.contactEmail || '',
        originalEmail: organization.email || '',
        locations: new Set(),
        categories: new Set(),
        events: [],
        upcoming: 0,
      })
    })

    events.forEach((event) => {
      const name = event.organizer || event.hostName || 'Lumina Host'
      const key = name.toLowerCase()
      const current = byName.get(key) || {
        id: event.hostId || key,
        name,
        contactEmail: '',
        originalEmail: '',
        locations: new Set(),
        categories: new Set(),
        events: [],
        upcoming: 0,
      }

      if (event.location) current.locations.add(event.location)
      if (event.category) current.categories.add(event.category)
      if (new Date(event.date || 0) >= new Date()) current.upcoming += 1
      current.contactEmail = current.contactEmail || event.contactEmail || ''
      if (!event.status || ['published', 'sold out', 'planning'].includes(String(event.status).toLowerCase())) {
        current.events.push(event)
      }
      byName.set(key, current)
    })

    return Array.from(byName.values())
      .map((organization) => ({
        ...organization,
        displayEmail: organization.contactEmail || organization.originalEmail,
        locations: Array.from(organization.locations),
        categories: Array.from(organization.categories),
      }))
      .filter((organization) => {
        if (!search) return true
        return [
          organization.name,
          organization.displayEmail,
          ...organization.locations,
          ...organization.categories,
          ...organization.events.flatMap((event) => [event.title, event.description, event.location, event.category]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [events, registeredOrganizations, searchTerm])

  // Filter tasks to only show those belonging to the currently logged-in organization
  const visibleTasks = useMemo(() => {
    if (!currentUser) return []
    return tasks.filter((t) => t.orgId === (currentUser._id || currentUser.id))
  }, [tasks, currentUser])

  const stats = useMemo(() => buildStats(isOrganization ? visibleEvents : events, bookings, isOrganization), [bookings, events, isOrganization, visibleEvents])
  const revenue = useMemo(() => visibleEvents.reduce((sum, event) => sum + Number(event.ticketPrice || 0) * Number(event.ticketsSold || 0), 0), [visibleEvents])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'

    // Fallback for browsers that don't support View Transitions
    if (!document.startViewTransition) {
      setTheme(nextTheme)
      return
    }

    document.startViewTransition(() => {
      document.documentElement.dataset.theme = nextTheme
      setTheme(nextTheme)
    })
  }

  const handleAuthChange = (event) => {
    const { name, value } = event.target
    setAuthData((current) => ({ ...current, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    const endpoint = authMode === 'login' ? 'login' : 'signup'
    const payload = authMode === 'login'
      ? { email: authData.email, password: authData.password }
      : { ...authData, role: accessType }
      
    try {
      const response = await fetch(`${AUTH_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      const isJson = response.headers.get('content-type')?.includes('application/json')
      const data = isJson ? await response.json() : null
      
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Server Error ${response.status}: ${response.statusText}`)
      }
      
      if (!data) throw new Error('Received an unexpected non-JSON response from the server.')
      
      const normalizedUser = { ...data, orgRole: data.orgRole || (data.role === 'organization' ? 'super-admin' : '') }
      localStorage.setItem('lumina-user', JSON.stringify(normalizedUser))
      setCurrentUser(normalizedUser)
      setFavorites(readStorage(`lumina-favorites-${normalizedUser._id || normalizedUser.id}`, []))
      setNotifications(readStorage(`lumina-notifications-${normalizedUser._id || normalizedUser.id}`, []))
      setAuthData(initialAuthData)
      setTimeout(() => window.scrollTo(0, 0), 0)
    } catch (error) {
      console.error("Auth Error:", error);
      setMessage(error.message === "Failed to fetch" ? "Could not connect to database." : error.message);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('lumina-user')
    setCurrentUser(null)
    setBookings([])
    setFavorites([])
    setNotifications([])
    setMessage('')
    resetForm()
    setActiveTab('dashboard')
    setTimeout(() => window.scrollTo(0, 0), 0)
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    const payload = {
      ...formData,
      totalCapacity: Number(formData.totalCapacity),
      ticketPrice: formData.ticketPrice === '' ? 0 : Number(formData.ticketPrice),
      gallery: splitList(formData.gallery),
      hostId: currentUser._id || currentUser.id,
      hostName: currentUser.organizationName || currentUser.name,
      organizer: formData.organizer || currentUser.organizationName || currentUser.name,
      contactEmail: formData.contactEmail || currentUser.email,
    }
    try {
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(editingId ? `${API_URL}/events/${editingId}` : `${API_URL}/events`, {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Request failed')
      } catch {
        if (editingId) {
          MockAPI.updateEvent(editingId, payload)
        } else {
          MockAPI.createEvent(payload)
        }
      }
      resetForm()
      await fetchEvents()
      setMessage(editingId ? 'Event updated successfully.' : 'Event created and sent for publishing approval.')
    } catch (error) {
      console.error('Error saving event:', error)
      setMessage('Could not save the event. Check required fields.')
    }
  }

  const handleEdit = (event) => {
    setEditingId(event._id)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      date: toDateInputValue(event.date),
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      category: event.category || 'Conference',
      eventType: event.eventType || 'In person',
      status: event.status || 'Planning',
      totalCapacity: event.totalCapacity || '',
      ticketPrice: event.ticketPrice ?? '',
      organizer: event.organizer || '',
      contactEmail: event.contactEmail || '',
      registrationDeadline: toDateInputValue(event.registrationDeadline),
      imageUrl: event.imageUrl || '',
      gallery: Array.isArray(event.gallery) ? event.gallery.join(', ') : '',
      videoUrl: event.videoUrl || '',
      acceptedPaymentMethods: event.acceptedPaymentMethods || 'Card, UPI, Net Banking, Cash on Visit',
      paymentInstructions: event.paymentInstructions || '',
    })
    setActiveTab('events')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    try {
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Delete failed')
      } catch {
        MockAPI.deleteEvent(id)
      }
      await fetchEvents()
      setMessage('Event deleted.')
    } catch (error) {
      console.error('Error deleting event:', error)
      setMessage('Could not delete the event.')
    }
  }

  const handleBook = async (eventId, quantity = 1, paymentMethod = 'Card', transactionId = '') => {
    setMessage('')
    if (isBooking) return
    if (!currentUser || currentUser.role !== 'attendee') {
      setMessage('Please sign in as a user before booking.')
      return
    }
    const requestedTickets = Number(quantity)
    if (!eventId || !Number.isInteger(requestedTickets) || requestedTickets < 1) {
      setMessage('Choose a valid event and ticket quantity.')
      return
    }
    setIsBooking(true)
    try {
      let data
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events/${eventId}/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser._id || currentUser.id,
            attendeeName: currentUser.name,
            attendeeEmail: currentUser.email,
            tickets: requestedTickets,
            paymentMethod,
            transactionId,
          }),
        })
        data = await response.json()
        if (!response.ok) throw new Error(data.error || data.message || 'Could not book this event.')
      } catch {
        const userId = currentUser._id || currentUser.id
        data = MockAPI.bookEvent(eventId, userId, currentUser.name, currentUser.email, requestedTickets, paymentMethod, transactionId)
      }
      // Instantly update the UI state
      setEvents((current) => current.map((e) => (e._id || e.id) === (data.event._id || data.event.id) ? data.event : e))
      setBookings((current) => [data.booking, ...current])
      
      const isPendingStatus = data.booking.paymentStatus === 'Pending'
      const msgTitle = isPendingStatus ? 'Booking under review' : 'Booking confirmed'
      const msgBody = isPendingStatus ? 'Your booking request is sent. Pass will be issued once payment is verified.' : 'Your ticket is booked. The QR pass is ready in My Tickets.'
      pushNotification(setNotifications, msgTitle, msgBody)
      setMessage(msgBody)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBooking(false)
    }
  }

  const handleUpdateBookingStatus = async (id, status) => {
    try {
      let updated
      try {
        if (USE_SAMPLE_DATA) throw new Error('Using local sample data')
        const response = await fetch(`${API_URL}/events/bookings/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentStatus: status })
        })
        if (!response.ok) throw new Error('Failed to update status')
        updated = await response.json()
      } catch {
        updated = MockAPI.updateBookingStatus(id, status)
      }
      
      setBookings(current => current.map(b => b._id === id ? updated : b))
      
      if (updated?.userId) {
        if (status === 'Paid') {
          pushNotificationToUser(updated.userId, 'Payment Verified', `Your ticket for ${updated.eventId?.title || 'an event'} has been approved!`)
        } else if (status === 'Rejected') {
          pushNotificationToUser(updated.userId, 'Payment Rejected', `Your payment for ${updated.eventId?.title || 'an event'} could not be verified.`)
        }
      }
    } catch (error) {
      console.error('Error updating booking:', error)
    }
  }

  const toggleFavorite = (eventId) => {
    setFavorites((current) => current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId])
  }

  // Professional Create Admin
  const openAdminModal = () => {
    setAdminForm(initialAdminForm)
    setAdminFormError('')
    setShowAdminModal(true)
  }

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target
    setAdminForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setAdminFormError('')
    if (!adminForm.name.trim()) return setAdminFormError('Full name is required.')
    if (!adminForm.email.trim() || !/\S+@\S+\.\S+/.test(adminForm.email)) return setAdminFormError('A valid email is required.')
    if (!adminForm.password || adminForm.password.length < 6) return setAdminFormError('Password must be at least 6 characters.')
    if (admins.some((a) => a.email.toLowerCase() === adminForm.email.toLowerCase())) return setAdminFormError('An admin with this email already exists.')

    try {
      const response = await fetch(`${AUTH_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminForm.name.trim(),
          email: adminForm.email.trim().toLowerCase(),
          password: adminForm.password,
          role: 'organization',
          orgRole: adminForm.orgRole,
          organizationName: currentUser.organizationName || currentUser.name
        })
      })

      const isJson = response.headers.get('content-type')?.includes('application/json')
      const data = isJson ? await response.json() : null
      
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Server Error ${response.status}: ${response.statusText}`)
      }
      if (!data) throw new Error('Received an unexpected non-JSON response from the server.')

      const newAdmin = {
        id: data._id || data.id || `adm-${Date.now()}`,
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        status: 'Active',
        permission: adminForm.permission,
        orgRole: adminForm.orgRole,
        tasks: 0,
        completed: 0,
      }
      setAdmins((current) => [newAdmin, ...current])
      pushNotification(setNotifications, 'New admin added', `${newAdmin.name} has been added as an admin with ${newAdmin.permission} permissions.`)
      setShowAdminModal(false)
    } catch (err) {
      setAdminFormError(err.message)
    }
  }

  const updateAdminStatus = (id, status) => {
    setAdmins((current) => current.map((admin) => admin.id === id ? { ...admin, status } : admin))
  }

  const deleteAdmin = (id) => {
    if (!window.confirm('Remove this admin? They will lose all access.')) return
    setAdmins((current) => current.filter((admin) => admin.id !== id))
  }

  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id)
    setTasks((current) => current.map((t) => t.id === id ? { ...t, status: 'Completed' } : t))
    if (task) {
      const admin = admins.find((a) => a.name === task.owner)
      if (admin) {
        setAdmins((current) => current.map((a) => a.id === admin.id ? { ...a, completed: a.completed + 1 } : a))
      }
    }
  }

  const addTask = (taskData) => {
    // Attach the current organization's ID to the new task
    const newTask = { id: `task-${Date.now()}`, ...taskData, status: 'Pending', orgId: currentUser?._id || currentUser?.id }
    setTasks((current) => [newTask, ...current])
  }

  const markNotifsRead = () => {
    setNotifications((current) => current.map((n) => ({ ...n, unread: false })))
  }

  const clearNotifs = () => {
    setNotifications([])
  }

  const openProfileEdit = () => {
    setProfileEdit({ name: currentUser.name, email: currentUser.email })
    setShowProfileModal(true)
  }

  const saveProfile = (e) => {
    e.preventDefault()
    if (!profileEdit.name.trim()) return
    const updated = { ...currentUser, name: profileEdit.name.trim(), email: profileEdit.email.trim() }
    localStorage.setItem('lumina-user', JSON.stringify(updated))
    setCurrentUser(updated)
    setShowProfileModal(false)
  }

  if (!currentUser) {
    return (
      <>
      <LuxuryStyles />
      <AuthScreen
        accessType={accessType}
        authData={authData}
        authMode={authMode}
        message={message}
        theme={theme}
        onAccessChange={setAccessType}
        onAuthChange={handleAuthChange}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
        onThemeToggle={toggleTheme}
      />
      </>
    )
  }

  return (
    <main className="app-shell">
      <LuxuryStyles />
      
      <TopBar
        currentUser={currentUser}
        theme={theme}
        notifications={notifications}
        showNotifPanel={showNotifPanel}
        onLogout={handleLogout}
        onThemeToggle={toggleTheme}
        onToggleNotif={() => { setShowNotifPanel((v) => !v); markNotifsRead() }}
        onOpenProfile={openProfileEdit}
        onClearNotifs={clearNotifs}
      />

      <section className="hero-section cinematic-hero" aria-label="Event dashboard overview">
        <div className="hero-content" style={{ position: 'relative', zIndex: 1, maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }} className="eyebrow">{isOrganization ? `${isSuperAdmin ? 'Super Admin' : 'Admin'} Console` : 'User Event Portal'}</motion.p>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }} style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 24, lineHeight: 1.1 }}>
              {isOrganization ? 'Run events with role-aware command.' : 'Discover, save, and book upcoming events.'}
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }} className="hero-copy" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6, padding: '0', textAlign: 'center' }}>
            {isOrganization
                ? 'Manage publishing, teams, tasks, activity, analytics, registrations, media, schedules, and approvals.'
                : 'Browse upcoming events, track QR tickets, keep favorites, receive reminders, and manage your attendee profile.'}
            </motion.p>
            {!isOrganization ? (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40, marginTop: 48 }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="primary-button inline" onClick={() => {
                  const el = document.querySelector('.workspace')
                  if (el) {
                    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
                  } else {
                    window.scrollTo({top: 600, behavior: 'smooth'})
                  }
                }}>Explore Events</motion.button>
              </motion.div>
            ) : (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }} style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48, marginTop: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 30, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }} />
                  Secure Connection
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 30, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-gold)', boxShadow: '0 0 8px var(--accent-gold)' }} />
                  {isSuperAdmin ? 'Super Admin' : 'Admin'} Access
                </div>
              </motion.div>
            )}
          </motion.div>

          {!isOrganization && organizations.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 32, marginTop: 32, width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>Organizations hosting now</p>
              <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', opacity: 0.5, filter: 'grayscale(100%)' }}>
                {[...organizations].sort((a, b) => b.events.length - a.events.length).slice(0, 5).map(org => (
                  <strong key={org.id} style={{ fontSize: '1.2rem' }}>{org.name}</strong>
                ))}
              </div>
            </motion.div>
          )}

          {isOrganization && (
          <motion.div className="hero-panel" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ width: '100%' }}>
            <motion.div className="stat-grid" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" aria-label="Event statistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 10 }}>
              {stats.map((item) => (
                <motion.div className="stat-card glass-panel" key={item.label} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -5, scale: 1.02 }} style={{ padding: 24, borderRadius: 16, textAlign: 'center' }}>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>{item.label}</span>
                  <strong style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{item.value}</strong>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          )}
        </div>
      </section>

      {isOrganization ? (
        <OrganizationWorkspace
          activeTab={activeTab}
          admins={admins}
          events={visibleEvents}
          allEvents={events}
          formData={formData}
          editingId={editingId}
          isLoading={isLoading}
          isSuperAdmin={isSuperAdmin}
          message={message}
          revenue={revenue}
          tasks={visibleTasks}
          categoryFilter={categoryFilter}
          searchTerm={searchTerm}
          sortBy={sortBy}
          statusFilter={statusFilter}
          bookings={bookings}
          onTabChange={setActiveTab}
          onAddAdmin={openAdminModal}
          onAdminStatus={updateAdminStatus}
          onCompleteTask={completeTask}
          onAddTask={addTask}
          onDeleteAdmin={deleteAdmin}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onReset={resetForm}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSearchChange={setSearchTerm}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          onSortChange={setSortBy}
          onUpdateBookingStatus={handleUpdateBookingStatus}
        />
      ) : (
        <AttendeeWorkspace
          currentUser={currentUser}
          events={visibleEvents}
          organizations={organizations}
          bookings={bookings}
          favorites={favorites}
          isLoading={isLoading}
          message={message}
          notifications={notifications}
          categoryFilter={categoryFilter}
          searchTerm={searchTerm}
          sortBy={sortBy}
          statusFilter={statusFilter}
          onBook={(event) => setPaymentModal({ show: true, event, quantity: 1, method: event.acceptedPaymentMethods ? event.acceptedPaymentMethods.split(',')[0].trim() : 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } })}
          onFavorite={toggleFavorite}
          onSearchChange={setSearchTerm}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          onSortChange={setSortBy}
          onMarkNotifsRead={markNotifsRead}
          onClearNotifs={clearNotifs}
          onOpenProfile={openProfileEdit}
        />
      )}

      {/* Create Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={() => setShowAdminModal(false)}>
            <motion.div className="modal-panel glass-panel" style={{ width: '100%', maxWidth: 500, padding: 'clamp(20px, 5vw, 32px)', borderRadius: 'clamp(16px, 4vw, 24px)' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <p className="eyebrow">Super Admin Control</p>
                  <h2 style={{ margin: 0 }}>Create new admin</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>Fill in the details below. The new admin will be able to log in with these credentials.</p>
                </div>
                <button className="ghost-button small" type="button" onClick={() => setShowAdminModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreateAdmin}>
                <div className="form-grid" style={{ marginBottom: 24 }}>
                  <label className="field">
                    <span>Full name <span style={{ color: 'var(--accent-gold)' }}>*</span></span>
                    <input name="name" value={adminForm.name} onChange={handleAdminFormChange} placeholder="e.g. Priya Kapoor" required />
                  </label>
                  <label className="field">
                    <span>Email address <span style={{ color: 'var(--accent-gold)' }}>*</span></span>
                    <input type="email" name="email" value={adminForm.email} onChange={handleAdminFormChange} placeholder="priya@yourorg.com" required />
                  </label>
                  <label className="field">
                    <span>Temporary password <span style={{ color: 'var(--accent-gold)' }}>*</span></span>
                    <input type="password" name="password" value={adminForm.password} onChange={handleAdminFormChange} placeholder="Min. 6 characters" required />
                  </label>
                  <label className="field">
                    <span>Role level</span>
                    <select name="orgRole" value={adminForm.orgRole} onChange={handleAdminFormChange}>
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </label>
                  <label className="field wide">
                    <span>Primary permission area</span>
                    <select name="permission" value={adminForm.permission} onChange={handleAdminFormChange}>
                      <option>Events</option>
                      <option>Attendees</option>
                      <option>Support</option>
                      <option>Reports</option>
                      <option>Finance</option>
                      <option>Full Access</option>
                    </select>
                  </label>
                </div>
                {adminFormError && <p className="form-message" style={{ color: '#ef4444', marginTop: 12 }}>{adminFormError}</p>}
                <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="ghost-button" type="button" onClick={() => setShowAdminModal(false)}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="submit">Create account</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={() => setShowProfileModal(false)}>
            <motion.div className="modal-panel glass-panel" style={{ maxWidth: 460, padding: 'clamp(20px, 5vw, 32px)', width: '100%', borderRadius: 'clamp(16px, 4vw, 24px)' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <p className="eyebrow">Account</p>
                  <h2 style={{ margin: 0 }}>Edit profile</h2>
                </div>
                <button className="ghost-button small" type="button" onClick={() => setShowProfileModal(false)}>✕</button>
              </div>
              <form onSubmit={saveProfile}>
                <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  <label className="field">
                    <span>Display name</span>
                    <input value={profileEdit.name} onChange={(e) => setProfileEdit((p) => ({ ...p, name: e.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" value={profileEdit.email} onChange={(e) => setProfileEdit((p) => ({ ...p, email: e.target.value }))} required />
                  </label>
                </div>
                <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="ghost-button" type="button" onClick={() => setShowProfileModal(false)}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="submit">Save changes</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModal.show && (
          <motion.div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={() => setPaymentModal({ show: false, event: null, quantity: 1, method: 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } })}>
            <motion.div className="modal-panel glass-panel" style={{ maxWidth: 420, width: '100%', padding: 'clamp(20px, 5vw, 32px)', borderRadius: 'clamp(16px, 4vw, 24px)' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <p className="eyebrow">Ticket checkout</p>
                  <h2 style={{ margin: 0 }}>Book Tickets</h2>
                </div>
                <button className="ghost-button small" type="button" onClick={() => setPaymentModal({ show: false, event: null, quantity: 1, method: 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } })}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: '0' }}>{paymentModal.event?.title}</h3>
                <label className="field">
                  <span>Number of tickets</span>
                  <input type="number" min="1" max={paymentModal.event?.totalCapacity ? (paymentModal.event.totalCapacity - (paymentModal.event.ticketsSold || 0)) : 100} value={paymentModal.quantity} onChange={e => {
                    const val = parseInt(e.target.value);
                    setPaymentModal(p => ({ ...p, quantity: isNaN(val) ? '' : Math.max(1, Math.min(val, (paymentModal.event?.totalCapacity ? (paymentModal.event.totalCapacity - (paymentModal.event.ticketsSold || 0)) : 100))) }))
                  }} />
                </label>
                {Number(paymentModal.event?.ticketPrice || 0) > 0 && (
                  <>
                  <label className="field">
                    <span>Payment Method</span>
                    <select value={paymentModal.method || 'Card'} onChange={e => setPaymentModal(p => ({ ...p, method: e.target.value, transactionId: '' }))}>
                      {(paymentModal.event?.acceptedPaymentMethods || 'Card, UPI, Net Banking, Cash on Visit').split(',').map(m => m.trim()).filter(Boolean).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  {paymentModal.method === 'Card' ? (
                    <div style={{ padding: 16, border: '1px solid var(--glass-border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure Card Payment</p>
                      <input type="text" placeholder="Card Number" value={paymentModal.cardInfo?.number || ''} onChange={e => setPaymentModal(p => ({ ...p, cardInfo: { ...(p.cardInfo || {}), number: e.target.value } }))} style={{ width: '100%', marginBottom: 8 }} required />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" placeholder="MM/YY" value={paymentModal.cardInfo?.expiry || ''} onChange={e => setPaymentModal(p => ({ ...p, cardInfo: { ...(p.cardInfo || {}), expiry: e.target.value } }))} style={{ flex: 1 }} required />
                        <input type="text" placeholder="CVC" value={paymentModal.cardInfo?.cvc || ''} onChange={e => setPaymentModal(p => ({ ...p, cardInfo: { ...(p.cardInfo || {}), cvc: e.target.value } }))} style={{ flex: 1 }} required />
                      </div>
                    </div>
                  ) : paymentModal.method === 'Cash on Visit' ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--warning)', margin: 0 }}>You will pay in cash at the venue. Your ticket will be pending approval.</p>
                  ) : (
                    <div style={{ padding: 16, border: '1px solid var(--glass-border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payment Instructions</p>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{paymentModal.event?.paymentInstructions || 'Please transfer the amount to the organizer.'}</p>
                      <input type="text" placeholder="Enter Transaction ID / UTR" value={paymentModal.transactionId || ''} onChange={e => setPaymentModal(p => ({ ...p, transactionId: e.target.value }))} style={{ width: '100%' }} required />
                    </div>
                  )}
                  </>
                )}
                <div style={{ background: 'var(--bg-element)', padding: 16, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--text-muted)' }}>
                    <span>Price per ticket</span>
                    <span>{formatCurrency(paymentModal.event?.ticketPrice || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--glass-border)', paddingTop: 8, color: 'var(--text-main)' }}>
                    <span>Total Amount</span>
                    <span>{formatCurrency((paymentModal.event?.ticketPrice || 0) * paymentModal.quantity)}</span>
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="ghost-button" type="button" onClick={() => setPaymentModal({ show: false, event: null, quantity: 1, method: 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } })}>Cancel</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="button" onClick={async () => {
              if (paymentModal.method === 'Card') {
                const { number, expiry, cvc } = paymentModal.cardInfo || {};
                if (!number || !expiry || !cvc) {
                  window.alert('Please enter your complete card details.');
                  return;
                }
              } else if (paymentModal.method && !['Card', 'Cash on Visit'].includes(paymentModal.method) && !paymentModal.transactionId) {
                window.alert('Please enter your Transaction ID for verification.');
                return;
              }
              
              const finalMethod = paymentModal.method && !['Card', 'Cash on Visit'].includes(paymentModal.method) && paymentModal.transactionId 
                ? `${paymentModal.method} (Ref: ${paymentModal.transactionId})` 
                : (paymentModal.method || 'Card');
                
              await handleBook(paymentModal.event._id || paymentModal.event.id, paymentModal.quantity || 1, finalMethod, paymentModal.transactionId);
              setPaymentModal({ show: false, event: null, quantity: 1, method: 'Card', transactionId: '', cardInfo: { number: '', expiry: '', cvc: '' } });
                }} disabled={isBooking || !paymentModal.event}>{isBooking ? 'Booking...' : 'Confirm booking'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function AuthScreen({ accessType, authData, authMode, message, theme, onAccessChange, onAuthChange, onModeChange, onSubmit, onThemeToggle }) {
  const isSignup = authMode === 'signup'
  return (
    <main className="auth-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: 24 }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, var(--accent-cyan) 0%, transparent 50%)', opacity: 0.06, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, var(--accent-gold) 0%, transparent 50%)', opacity: 0.04, filter: 'blur(100px)' }} />
      </div>
      <motion.section className="glass-panel auth-panel" style={{ width: 'min(100%, 1000px)', maxWidth: 'calc(100vw - 32px)', borderRadius: 'clamp(16px, 5vw, 24px)', overflow: 'hidden', zIndex: 1, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', willChange: 'transform, opacity' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
  <div className="auth-copy" style={{ padding: 'clamp(20px, 5vw, 48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="eyebrow" style={{ margin: 0 }}>Lumina Events</p>
            <button className="ghost-button small" style={{ margin: 0, padding: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} type="button" onClick={onThemeToggle} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 7vw, 2.5rem)', lineHeight: 1.12, marginBottom: 16, maxWidth: '100%', overflowWrap: 'break-word' }}>Event management for teams and guests.</h1>
          <p className="hero-copy" style={{ color: 'var(--text-muted)', marginBottom: 40 }}>Choose a dedicated user or organization entry, then sign in to the correct workspace.</p>
          <div className="access-grid" style={{ display: 'grid', gap: '16px' }}>
            <button type="button" style={{ background: accessType === 'attendee' ? 'rgba(45, 212, 191, 0.1)' : 'transparent', border: `1px solid ${accessType === 'attendee' ? 'var(--accent-cyan)' : 'var(--glass-border)'}`, padding: 20, borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => onAccessChange('attendee')}>
              <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>User Login / Signup</span>
              <strong style={{ display: 'block', fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Book tickets, save favorites, view QR passes, and receive reminders.</strong>
            </button>
            <button type="button" style={{ background: accessType === 'organization' ? 'rgba(251, 191, 36, 0.1)' : 'transparent', border: `1px solid ${accessType === 'organization' ? 'var(--accent-gold)' : 'var(--glass-border)'}`, padding: 20, borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => onAccessChange('organization')}>
              <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Organization Login / Signup</span>
              <strong style={{ display: 'block', fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create a Super Admin account to manage events, admins, tasks, and reports.</strong>
            </button>
          </div>
        </div>
        <form className="auth-form" onSubmit={onSubmit} style={{ padding: 'clamp(24px, 5vw, 48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="role-tabs" aria-label="Account mode" style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'var(--bg-surface)', padding: 6, borderRadius: 12 }}>
            <button type="button" style={{ flex: 1, padding: '10px 0', border: 'none', background: authMode === 'login' ? 'var(--bg-element-active)' : 'transparent', color: 'var(--text-main)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s' }} onClick={() => onModeChange('login')}>Login</button>
            <button type="button" style={{ flex: 1, padding: '10px 0', border: 'none', background: authMode === 'signup' ? 'var(--bg-element-active)' : 'transparent', color: 'var(--text-main)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s' }} onClick={() => onModeChange('signup')}>Sign up</button>
          </div>
          {isSignup && (
            <>
              <label className="field">
                <span>{accessType === 'organization' ? 'Super Admin name' : 'Your name'}</span>
                <input name="name" value={authData.name} onChange={onAuthChange} required />
              </label>
              {accessType === 'organization' && (
                <label className="field">
                  <span>Organization name</span>
                  <input name="organizationName" value={authData.organizationName} onChange={onAuthChange} placeholder="Lumina Events Co." />
                </label>
              )}
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" value={authData.email} onChange={onAuthChange} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" value={authData.password} onChange={onAuthChange} placeholder="At least 6 characters" required />
          </label>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button" type="submit" style={{ marginTop: 16 }}>{isSignup ? `Create ${accessType === 'organization' ? 'organization' : 'user'} account` : 'Login'}</motion.button>
          {message && <p className="form-message" style={{ color: '#ef4444', marginTop: 16, textAlign: 'center' }}>{message}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', margin: '16px 0' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--glass-border)' }}></span>
              <span style={{ padding: '0 8px' }}>OR</span>
              <span style={{ flex: 1, height: 1, background: 'var(--glass-border)' }}></span>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" className="ghost-button" onClick={() => window.alert('Google Authentication flow coming soon!')}>
              <span style={{ marginRight: 8, fontWeight: 'bold' }}>G</span> Continue with Google
            </motion.button>
            {authMode === 'login' && (
              <button type="button" className="ghost-button small" style={{ border: 'none', background: 'transparent' }} onClick={() => window.alert('This feature is currently not available')}>
                Forgot your password?
              </button>
            )}
          </div>
        </form>
      </motion.section>
    </main>
  )
}
function TopBar({ currentUser, theme, onLogout, onThemeToggle, onOpenProfile }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  return (
        <header style={{ position: 'sticky', top: 'clamp(8px, 2vw, 24px)', zIndex: 100, padding: '0 clamp(8px, 2vw, 24px)', pointerEvents: 'none' }}>
        <motion.div style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(8px, 1.5vw, 14px) clamp(12px, 2.5vw, 24px)', borderRadius: 'clamp(16px, 4vw, 999px)', maxWidth: '1400px', margin: '0 auto', background: 'var(--bg-panel)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--text-main)', background: 'linear-gradient(90deg, var(--text-main), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Lumina.</span>
        </div>
        
         <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '1.1rem' }} onClick={onThemeToggle}>
            {theme === 'light' ? '🌙' : '☀️'}
          </motion.button>
          
          <div style={{ position: 'relative' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" type="button" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', position: 'relative', background: 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)', color: '#fff', fontWeight: 800, fontSize: '1.1rem', marginLeft: 8, border: 'none' }}>
              {getInitials(currentUser.name)}
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="glass-panel" style={{ position: 'absolute', top: 'calc(100% + 16px)', right: 0, width: '280px', borderRadius: '24px', padding: '0', overflow: 'hidden', zIndex: 200, boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', background: 'var(--bg-panel-solid)' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--bg-surface)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                      {getInitials(currentUser.name)}
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: 4 }}>{currentUser.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentUser.email}</span>
                    <span style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, padding: '4px 10px', background: 'rgba(251,191,36,0.1)', borderRadius: 20, marginTop: 12 }}>{currentUser.role}</span>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <button className="ghost-button" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, padding: '12px 16px', border: 'none', background: 'transparent' }} onClick={() => { onOpenProfile(); setShowProfileMenu(false); }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ marginRight: 12 }}>👤</span> Edit Profile
                    </button>
                    <button className="ghost-button" style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--danger)' }} onClick={() => { onLogout(); setShowProfileMenu(false); }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ marginRight: 12 }}>🚪</span> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </motion.div>
    </header>
  )
}

function OrganizationWorkspace(props) {
  const { activeTab, onTabChange, isSuperAdmin } = props
  return (
    <section className="workspace organization-layout">
      <aside className="side-rail">
        <strong>Workspace</strong>
       {[
  { id: 'dashboard', label: 'Dashboard', icon: '01' },
  { id: 'events', label: 'Events', icon: '02' },
  { id: 'registrations', label: 'Registrations', icon: '03' },
  ...(isSuperAdmin ? [{ id: 'admins', label: 'Admins', icon: '04' }] : []),
  { id: 'reports', label: 'Reports', icon: '05' },
].map((tab) => (
  <motion.span
    whileHover={{ x: 4 }}
    key={tab.id}
    className={activeTab === tab.id ? 'active' : ''}
    style={{ cursor: 'pointer', padding: '10px 16px', borderRadius: 8, background: activeTab === tab.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent', color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 700 : 500, transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
    onClick={() => {
      onTabChange(tab.id)
      if (window.innerWidth <= 980) {
        const el = document.querySelector('.workspace')
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
      }
    }}
  >
    <span>{tab.icon}</span>
    <span>{tab.label}</span>
  </motion.span>
))} 
      </aside>
      <div className="org-main">
        {activeTab === 'dashboard' && <OrgDashboard {...props} />}
        {activeTab === 'events' && (
          <>
            <EventForm {...props} />
            <EventBoard {...props} mode="organization" />
          </>
        )}
        {activeTab === 'registrations' && <RegistrationsTab events={props.events} bookings={props.bookings} onUpdateBookingStatus={props.onUpdateBookingStatus} />}
        {activeTab === 'admins' && isSuperAdmin && <AdminsTab admins={props.admins} onAddAdmin={props.onAddAdmin} onAdminStatus={props.onAdminStatus} onDeleteAdmin={props.onDeleteAdmin} />}
        {activeTab === 'reports' && <ReportsTab events={props.events} admins={props.admins} tasks={props.tasks} revenue={props.revenue} />}
      </div>
    </section>
  )
}

function OrgDashboard({ admins, events, isSuperAdmin, revenue, tasks, onAddAdmin, onAdminStatus, onCompleteTask, onDeleteAdmin, onAddTask }) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', owner: '', due: '' })
  const registrations = events.reduce((sum, event) => sum + Number(event.ticketsSold || 0), 0)

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    onAddTask({ title: newTask.title, owner: newTask.owner || 'Unassigned', due: newTask.due || 'TBD' })
    setNewTask({ title: '', owner: '', due: '' })
    setShowAddTask(false)
  }

  return (
    <motion.section className="dashboard-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">{isSuperAdmin ? 'Super Admin Control' : 'Admin Workbench'}</p>
          <h2>{isSuperAdmin ? 'Organization overview' : 'Assigned operations'}</h2>
        </div>
        {isSuperAdmin && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="button" onClick={onAddAdmin}>Create admin</motion.button>}
      </div>

      <motion.div className="metric-row" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }} initial="hidden" animate="show" style={{ marginBottom: 32 }}>
        <Metric label="Total events" value={events.length} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Revenue" value={formatCurrency(revenue)} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Registrations" value={registrations} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Pending tasks" value={tasks.filter((task) => task.status !== 'Completed').length} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
      </motion.div>

      <div className="dashboard-grid" style={{ gap: 32, marginBottom: 32 }}>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3>Event performance</h3>
          {events.slice(0, 5).map((event) => <Bar key={event._id} label={event.title} value={Number(event.ticketsSold || 0)} max={Number(event.totalCapacity || 1)} />)}
          {events.length === 0 && <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.9rem' }}>No events yet.</p>}
        </motion.div>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3>{isSuperAdmin ? 'Admin-wise work' : 'Assigned tasks'}</h3>
          {(isSuperAdmin ? admins : admins.slice(0, 1)).map((admin) => <Bar key={admin.id} label={admin.name} value={admin.completed} max={Math.max(admin.tasks, 1)} />)}
        </motion.div>
      </div>

      <div className="dashboard-grid" style={{ gap: 32, marginBottom: 32 }}>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3 style={{ marginBottom: 24 }}>Upcoming Events Timeline</h3>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            {events.filter(e => new Date(e.date) > new Date()).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 6).map(event => (
              <motion.div key={event._id} whileHover={{ y: -5 }} style={{ minWidth: 250, maxWidth: 300, padding: 16, background: 'var(--bg-surface)', borderRadius: 12, borderLeft: `4px solid var(--accent-cyan)` }}>
                <small style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{formatDate(event.date)}</small>
                <h4 className="truncate" style={{ margin: '8px 0', color: 'var(--text-main)' }} title={event.title}>{event.title}</h4>
                <span className="truncate" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{event.location}</span>
              </motion.div>
            ))}
            {events.filter(e => new Date(e.date) > new Date()).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No upcoming events scheduled.</p>}
          </div>
        </motion.div>
      </div>

      <div className="dashboard-grid" style={{ gap: 32 }}>
       {isSuperAdmin && (
          <motion.div className="table-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)', overflowX: 'auto' }}>
            <div className="mini-heading" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24, minWidth: '100%' }}><h3>Admin accounts</h3><span style={{ color: 'var(--text-muted)' }}>Permissions and access</span></div>
            {admins.map((admin) => (
              <article className="admin-row" key={admin.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--glass-border)', minWidth: '100%' }}>
       <div><strong style={{ display: 'block' }}>{admin.name}</strong><small style={{ color: 'var(--text-muted)' }}>{admin.email} | {admin.permission}</small></div>
                <span className={`status-chip ${admin.status.toLowerCase()}`}>{admin.status}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="ghost-button small" type="button" onClick={() => onAdminStatus(admin.id, admin.status === 'Active' ? 'Suspended' : 'Active')}>{admin.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                  <button className="danger-button small" type="button" onClick={() => onDeleteAdmin(admin.id)}>Delete</button>
                </div>
              </article>
            ))}
            <button className="ghost-button small" type="button" style={{ marginTop: 12, width: '100%' }} onClick={onAddAdmin}>+ Add new admin</button>
          </motion.div>
        )}
        <motion.div className="table-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <div className="mini-heading" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3>Tasks and activity</h3>
            <button className="ghost-button small" type="button" onClick={() => setShowAddTask((v) => !v)}>+ New task</button>
          </div>
          <AnimatePresence>
            {showAddTask && (
              <motion.form initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 12 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ overflow: 'hidden' }} onSubmit={handleAddTask}>
                <div style={{ display: 'grid', gap: 8, padding: '16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                  <input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} required style={{ minHeight: 36 }} />
                  <input placeholder="Assign to (name)" value={newTask.owner} onChange={(e) => setNewTask((p) => ({ ...p, owner: e.target.value }))} style={{ minHeight: 36 }} />
                  <input placeholder="Due (e.g. Today, Friday)" value={newTask.due} onChange={(e) => setNewTask((p) => ({ ...p, due: e.target.value }))} style={{ minHeight: 36 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="submit" style={{ marginTop: 0, flex: 1 }}>Add task</motion.button>
                    <button className="ghost-button small" type="button" onClick={() => setShowAddTask(false)}>Cancel</button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          {tasks.map((task) => (
            <article className="task-row" key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, padding: '16px 0', borderBottom: '1px solid var(--glass-border)' }}>
  <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', wordBreak: 'break-word' }}>{task.title}</strong><small style={{ color: 'var(--text-muted)' }}>{task.owner} | Due {task.due}</small></div>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
    <span className={`status-chip ${slugify(task.status)}`}>{task.status}</span>
    {task.status !== 'Completed' && <button className="ghost-button small" type="button" onClick={() => onCompleteTask(task.id)}>Mark done</button>}
  </div>
</article>
          ))}
          {tasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>No tasks yet.</p>}
        </motion.div>
      </div>
    </motion.section>
  )
}

function AdminsTab({ admins, onAddAdmin, onAdminStatus, onDeleteAdmin }) {
  const [search, setSearch] = useState('')
  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <motion.section className="dashboard-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">Super Admin Control</p>
          <h2>Admin management</h2>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline" type="button" onClick={onAddAdmin}>Create admin</motion.button>
      </div>
      <div style={{ marginBottom: 24 }}>
        <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, width: '100%', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--glass-border)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
      </div>
      <div className="table-card glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)' }}>
              {['Name', 'Email', 'Role', 'Permission', 'Status', 'Tasks', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((admin) => (
              <tr key={admin.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td data-label="Name" style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-main)' }}>{admin.name}</td>
                <td data-label="Email" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{admin.email}</td>
                <td data-label="Role" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{admin.orgRole || 'admin'}</td>
                <td data-label="Permission" style={{ padding: '16px 20px' }}><span className="category-pill" style={{ fontSize: '0.75rem', background: 'var(--bg-element-active)', padding: '4px 10px', borderRadius: 20 }}>{admin.permission}</span></td>
                <td data-label="Status" style={{ padding: '16px 20px' }}><span className={`status-chip ${admin.status.toLowerCase()}`}>{admin.status}</span></td>
                <td data-label="Tasks" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{admin.completed}/{admin.tasks}</td>
                <td data-label="Actions" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="ghost-button small" type="button" onClick={() => onAdminStatus(admin.id, admin.status === 'Active' ? 'Suspended' : 'Active')} style={{ fontSize: '0.78rem', minHeight: 30 }}>
                      {admin.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button className="danger-button small" type="button" onClick={() => onDeleteAdmin(admin.id)} style={{ fontSize: '0.78rem', minHeight: 30 }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No admins found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}

function RegistrationsTab({ events, bookings = [], onUpdateBookingStatus }) {
  const orgBookings = bookings.filter(b => events.some(e => (e._id || e.id) === (b.eventId?._id || b.eventId?.id || b.eventId)));
  const allRegistrations = events.flatMap((event) =>
    Array.from({ length: Number(event.ticketsSold || 0) }, (_, i) => ({
      id: `${event._id}-${i}`,
      eventTitle: event.title,
      eventDate: event.date,
      tickets: 1,
      status: event.paymentProvider === 'Demo checkout' ? 'Demo' : 'Paid',
    }))
  )
  const totalRev = events.reduce((s, e) => s + Number(e.ticketPrice || 0) * Number(e.ticketsSold || 0), 0)

  return (
    <motion.section className="dashboard-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">Registrations</p>
          <h2>All ticket registrations</h2>
        </div>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '1.2rem' }}>Total revenue: {formatCurrency(totalRev)}</span>
      </div>
      <motion.div className="metric-row" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }} initial="hidden" animate="show" style={{ marginBottom: 32 }}>
        <Metric label="Total registrations" value={allRegistrations.length} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Events with bookings" value={events.filter((e) => Number(e.ticketsSold) > 0).length} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Revenue" value={formatCurrency(totalRev)} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
      </motion.div>
      <motion.div className="table-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)' }}>
              {['Event', 'Date', 'Tickets sold', 'Capacity', 'Revenue', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td data-label="Event" style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-main)' }}>{event.title}</td>
                <td data-label="Date" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{formatDate(event.date)}</td>
                <td data-label="Tickets sold" style={{ padding: '16px 20px', color: 'var(--accent-cyan)', fontWeight: 700 }}>{event.ticketsSold || 0}</td>
                <td data-label="Capacity" style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{event.totalCapacity || '—'}</td>
                <td data-label="Revenue" style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 700 }}>{formatCurrency(Number(event.ticketPrice || 0) * Number(event.ticketsSold || 0))}</td>
                <td data-label="Status" style={{ padding: '16px 20px' }}><span className={`status-chip ${slugify(event.status || 'planning')}`}>{event.status || 'Planning'}</span></td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No events yet. Create events to track registrations.</td></tr>
            )}
          </tbody>
        </table>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }}>
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, marginTop: 40 }}>
        <div>
          <p className="eyebrow">Transactions</p>
          <h2>Recent Bookings & Payments</h2>
        </div>
      </div>
      <div className="table-card glass-panel" style={{ padding: 0, overflowX: 'auto', border: 'none', background: 'transparent' }}>
        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              {['Attendee', 'Event', 'Tickets', 'Amount', 'Payment Info', 'Status', 'Action'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0 20px 8px 20px', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgBookings.map((b) => {
              const eventId = b.eventId?._id || b.eventId?.id || b.eventId;
              const event = events.find(e => (e._id || e.id) === eventId) || b.eventId;
              const amount = Number(event?.ticketPrice || 0) * b.tickets;
              const isPending = b.paymentStatus === 'Pending';
              return (
              <tr key={b._id} style={{ background: 'var(--bg-surface)', boxShadow: isPending ? 'inset 3px 0 0 var(--warning)' : 'inset 3px 0 0 var(--success)', transition: 'transform 0.2s' }}>
                <td data-label="Attendee" style={{ padding: '16px 20px', borderRadius: '12px 0 0 12px' }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)' }}>{b.attendeeName}</strong>
                  <small style={{ color: 'var(--text-muted)' }}>{b.attendeeEmail}</small>
                </td>
                <td data-label="Event" style={{ padding: '16px 20px' }}>
                  <span className="truncate" style={{ display: 'block', maxWidth: 200 }}>{event?.title || 'Unknown Event'}</span>
                </td>
                <td data-label="Tickets" style={{ padding: '16px 20px' }}>
                  <span style={{ background: 'var(--bg-element-active)', color: 'var(--accent-cyan)', padding: '4px 10px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem' }}>{b.tickets}</span>
                </td>
                <td data-label="Amount" style={{ padding: '16px 20px', fontWeight: 700 }}>{formatCurrency(amount)}</td>
                <td data-label="Payment Info" style={{ padding: '16px 20px' }}>
                  <span style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: 4 }}>{b.paymentMethod || 'Card'}</span>
                  {b.transactionId && !String(b.paymentMethod || '').includes(b.transactionId) && <code style={{ background: 'var(--bg-element)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {b.transactionId}</code>}
                </td>
                <td data-label="Status" style={{ padding: '16px 20px' }}>
                  <span className={`status-chip ${isPending ? 'planning' : 'published'}`} style={{ border: isPending ? '1px solid var(--warning)' : (b.paymentStatus === 'Rejected' ? '1px solid var(--danger)' : '1px solid var(--success)'), color: isPending ? 'var(--warning)' : (b.paymentStatus === 'Rejected' ? 'var(--danger)' : 'var(--success)'), background: 'transparent' }}>
                    {isPending ? 'Pending Review' : (b.paymentStatus === 'Rejected' ? 'Rejected' : 'Verified')}
                  </span>
                </td>
                <td data-label="Action" style={{ padding: '16px 20px', borderRadius: '0 12px 12px 0' }}>
                   {isPending && (
                     <div style={{ display: 'flex', gap: 8 }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" title="Approve" style={{ fontSize: '0.8rem', padding: '6px 12px', minHeight: '32px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onUpdateBookingStatus(b._id, 'Paid')}><span style={{ fontSize: '0.9rem' }}>✓</span> Approve</motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" title="Reject" style={{ fontSize: '0.8rem', padding: '6px 12px', minHeight: '32px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onUpdateBookingStatus(b._id, 'Rejected')}><span style={{ fontSize: '0.9rem' }}>✕</span> Reject</motion.button>
                     </div>
                   )}
                   {b.paymentStatus === 'Rejected' && <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Rejected</span>}
                   {b.paymentStatus === 'Paid' && <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Approved</span>}
                </td>
              </tr>
            )})}
            {orgBookings.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 12 }}>No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </motion.div>
    </motion.section>
  )
}

function ReportsTab({ events, admins, tasks, revenue }) {
  const published = events.filter((e) => e.status === 'Published').length
  const completed = events.filter((e) => e.status === 'Completed').length
  const totalCapacity = events.reduce((s, e) => s + Number(e.totalCapacity || 0), 0)
  const totalSold = events.reduce((s, e) => s + Number(e.ticketsSold || 0), 0)
  const fillRate = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length

  return (
    <motion.section className="dashboard-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">Analytics & Reports</p>
          <h2>Organization performance</h2>
        </div>
        <button className="ghost-button small" type="button" onClick={() => downloadReportPDF({ events, admins, tasks, revenue })}>Export / Print</button>
      </div>
      <motion.div className="metric-row" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }} initial="hidden" animate="show" style={{ marginBottom: 32 }}>
        <Metric label="Total events" value={events.length} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Total revenue" value={formatCurrency(revenue)} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Avg fill rate" value={`${fillRate}%`} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
        <Metric label="Tasks done" value={`${completedTasks}/${tasks.length}`} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }} />
      </motion.div>
      <div className="dashboard-grid" style={{ gap: 32, marginBottom: 32 }}>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3 style={{ marginBottom: 24 }}>Event status breakdown</h3>
          {[
            { label: 'Published', value: published },
            { label: 'Completed', value: completed },
            { label: 'Planning', value: events.filter((e) => e.status === 'Planning').length },
            { label: 'Sold out', value: events.filter((e) => e.status === 'Sold out').length },
          ].map((row) => <Bar key={row.label} label={row.label} value={row.value} max={Math.max(events.length, 1)} />)}
        </motion.div>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3 style={{ marginBottom: 24 }}>Top events by capacity fill</h3>
          {[...events].sort((a, b) => Number(b.ticketsSold || 0) - Number(a.ticketsSold || 0)).slice(0, 5).map((event) => (
            <Bar key={event._id} label={event.title} value={Number(event.ticketsSold || 0)} max={Number(event.totalCapacity || 1)} />
          ))}
          {events.length === 0 && <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.9rem' }}>No events yet.</p>}
        </motion.div>
      </div>
      <div className="dashboard-grid" style={{ gap: 32 }}>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3 style={{ marginBottom: 24 }}>Admin productivity</h3>
          {admins.map((a) => <Bar key={a.id} label={a.name} value={a.completed} max={Math.max(a.tasks, 1)} />)}
          {admins.length === 0 && <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.9rem' }}>No admins yet.</p>}
        </motion.div>
        <motion.div className="analytics-card glass-panel" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
          <h3 style={{ marginBottom: 24 }}>Revenue by event</h3>
          {events.filter((e) => Number(e.ticketPrice) > 0).map((event) => (
            <Bar key={event._id} label={event.title} value={Number(event.ticketPrice || 0) * Number(event.ticketsSold || 0)} max={Math.max(...events.map((e) => Number(e.ticketPrice || 0) * Number(e.ticketsSold || 0)), 1)} />
          ))}
          {events.filter((e) => Number(e.ticketPrice) > 0).length === 0 && <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.9rem' }}>No paid events yet.</p>}
        </motion.div>
      </div>
    </motion.section>
  )
}

function AttendeeWorkspace(props) {
  const [activeTab, setActiveTab] = useState('home');
  const favoriteEvents = props.events.filter((event) => props.favorites.includes(event._id || event.id))
  
  return (
    <section className="workspace organization-layout">
      <aside className="side-rail">
        <strong>Menu</strong>
        {[
          { id: 'home', label: 'Discover', icon: '🏠' },
          { id: 'tickets', label: 'My Tickets', icon: '🎟️' },
          { id: 'notifications', label: 'Notifications', icon: '🔔' },
        ].map((tab) => (
          <motion.span
            whileHover={{ x: 4 }}
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            style={{ cursor: 'pointer', padding: '10px 16px', borderRadius: 8, background: activeTab === tab.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent', color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 700 : 500, transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            onClick={() => {
              setActiveTab(tab.id)
              if (window.innerWidth <= 980) {
                const el = document.querySelector('.workspace')
                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
              }
            }}
          >
            <span style={{ fontSize: '1.2rem', display: 'grid', placeItems: 'center', width: 24, height: 24 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'notifications' && props.notifications.filter(n => n.unread).length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '0.7rem' }}>
                {props.notifications.filter(n => n.unread).length}
              </span>
            )}
          </motion.span>
        ))}
      </aside>
      <div className="attendee-main" style={{ width: '100%', minWidth: 0 }}>
        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <EventBoard {...props} mode="attendee" />
            <OrganizationDirectory organizations={props.organizations} searchTerm={props.searchTerm} />
            <FavoriteStrip events={favoriteEvents} />
          </motion.div>
        )}
        {activeTab === 'tickets' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}><BookingPanel bookings={props.bookings} /></motion.div>}
        {activeTab === 'notifications' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}><NotificationPanel notifications={props.notifications} onMarkRead={props.onMarkNotifsRead} onClear={props.onClearNotifs} /></motion.div>}
      </div>
    </section>
  )
}

function OrganizationDirectory({ organizations, searchTerm }) {
  const search = searchTerm.trim()

  return (
    <section className="event-board glass-panel" style={{ padding: 'clamp(20px, 4vw, 40px)', borderRadius: 'clamp(16px, 4vw, 24px)' }}>
      <div className="section-heading" style={{ marginBottom: 24 }}>
        <div>
          <p className="eyebrow">Organizations</p>
          <h2>Explore event hosts</h2>
        </div>
        <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{organizations.length} found</span>
      </div>
      {organizations.length === 0 ? (
        <div className="empty-state compact-empty" style={{ padding: 32, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px dashed var(--glass-border)' }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>{search ? 'No organizations match your search.' : 'No organizations found.'}</strong>
          <span style={{ color: 'var(--text-muted)' }}>Search by organization, event, category, or location.</span>
        </div>
      ) : (
        <motion.div className="event-grid" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-50px' }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {organizations.map((organization) => (
            <motion.article
              className="event-card luxury-card"
              key={organization.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
              whileHover={{ y: -2 }}
              style={{ padding: 20, borderRadius: 16, gap: 14 }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent-cyan), #3b82f6)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, flexShrink: 0 }}>
                  {getInitials(organization.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem', lineHeight: 1.25 }}>{organization.name}</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{organization.events.length} event(s) listed</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 12 }}>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>Upcoming</span>
                  <strong style={{ display: 'block', marginTop: 6 }}>{organization.upcoming}</strong>
                </div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 12 }}>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>Categories</span>
                  <strong style={{ display: 'block', marginTop: 6 }}>{organization.categories.length}</strong>
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {organization.categories.slice(0, 3).join(', ') || 'General events'}
                {organization.locations[0] ? ` in ${organization.locations[0]}` : ''}
              </p>
            {organization.displayEmail && <small style={{ color: 'var(--accent-cyan)', overflowWrap: 'anywhere', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>✉️ {organization.displayEmail}</small>}
            </motion.article>
          ))}
        </motion.div>
      )}
    </section>
  )
}

function EventForm({ formData, editingId, message, onInputChange, onSubmit, onReset }) {
  return (
    <motion.form className="event-form glass-panel" onSubmit={onSubmit} style={{ padding: 'clamp(20px, 4vw, 40px)', borderRadius: 'clamp(16px, 4vw, 24px)', display: 'flex', flexDirection: 'column', gap: 32 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 0 }}>
        <div>
          <p className="eyebrow">{editingId ? 'Update Event' : 'Create Event'}</p>
          <h2>{editingId ? 'Edit event details' : 'New hosted event'}</h2>
        </div>
        {editingId && <button className="ghost-button" type="button" onClick={onReset}>Clear edit</button>}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Basic Information</h3>
          <div className="form-grid">
            <Field className="wide" label="Event title" name="title" value={formData.title} onChange={onInputChange} required />
            <label className="field wide"><span>Description</span><textarea name="description" value={formData.description} onChange={onInputChange} required style={{ minHeight: 100, resize: 'vertical' }} /></label>
            <SelectField label="Category" name="category" value={formData.category} options={categories} onChange={onInputChange} />
            <SelectField label="Format" name="eventType" value={formData.eventType} options={eventTypes} onChange={onInputChange} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Date & Location</h3>
          <div className="form-grid">
            <Field label="Date" type="date" name="date" value={formData.date} onChange={onInputChange} required />
            <Field label="Venue or link" name="location" value={formData.location} onChange={onInputChange} required />
            <Field label="Start time" type="time" name="startTime" value={formData.startTime} onChange={onInputChange} />
            <Field label="End time" type="time" name="endTime" value={formData.endTime} onChange={onInputChange} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Ticketing & Capacity</h3>
          <div className="form-grid">
            <Field label="Capacity" type="number" min="1" name="totalCapacity" value={formData.totalCapacity} onChange={onInputChange} required />
            <Field label="Ticket price (₹)" type="number" min="0" name="ticketPrice" value={formData.ticketPrice} onChange={onInputChange} />
            <Field className="wide" label="Accepted Payment Methods" name="acceptedPaymentMethods" value={formData.acceptedPaymentMethods} onChange={onInputChange} placeholder="Card, UPI, Net Banking, Cash on Visit" />
            <label className="field wide"><span>Payment Instructions (For manual/offline methods)</span><textarea name="paymentInstructions" value={formData.paymentInstructions} onChange={onInputChange} style={{ minHeight: 60, resize: 'vertical' }} placeholder="Provide UPI ID, Bank Details, etc." /></label>
            <Field label="Registration closes" type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={onInputChange} />
            <SelectField label="Publish status" name="status" value={formData.status} options={statuses} onChange={onInputChange} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Media & Contact</h3>
          <div className="form-grid">
            <Field label="Organizer" name="organizer" value={formData.organizer} onChange={onInputChange} />
            <Field label="Contact email" type="email" name="contactEmail" value={formData.contactEmail} onChange={onInputChange} />
            <Field className="wide" label="Cover image URL" type="url" name="imageUrl" value={formData.imageUrl} onChange={onInputChange} />
            <Field className="wide" label="Gallery image URLs" name="gallery" value={formData.gallery} onChange={onInputChange} placeholder="Comma-separated images" />
            <Field className="wide" label="Video URL" type="url" name="videoUrl" value={formData.videoUrl} onChange={onInputChange} />
          </div>
        </div>
      </div>
      
      <div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button" type="submit">{editingId ? 'Save changes' : 'Create event'}</motion.button>
        {message && <p className="form-message" style={{ marginTop: 16, color: 'var(--accent-cyan)' }}>{message}</p>}
      </div>
    </motion.form>
  )
}

function EventBoard(props) {
  const { events, isLoading, mode, message, onBook, onFavorite, favorites, onEdit, onDelete } = props
  return (
    <section className="event-board glass-panel" aria-label="Event list" style={{ padding: 'clamp(20px, 4vw, 40px)', borderRadius: 'clamp(16px, 4vw, 24px)' }}>
      <div className="section-heading" style={{ marginBottom: 32 }}>
        <div>
          <p className="eyebrow">{mode === 'organization' ? 'Hosted Inventory' : 'Book Events'}</p>
          <h2>{mode === 'organization' ? 'Your events' : 'Available events'}</h2>
        </div>
      </div>
      <EventToolbar {...props} />
      {mode === 'attendee' && message && <p className="form-message board-message" style={{ padding: 16, background: 'rgba(45, 212, 191, 0.1)', color: 'var(--accent-cyan)', borderRadius: 12, marginBottom: 24 }}>{message}</p>}
      {isLoading ? (
        <SkeletonGrid />
      ) : events.length === 0 ? (
        <div className="empty-state" style={{ padding: 60, textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px dashed var(--glass-border)' }}><strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: 8 }}>No events found.</strong><span style={{ color: 'var(--text-muted)' }}>Try another filter or create a new event.</span></div>
      ) : (
        <motion.div className="event-grid" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-50px' }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          <AnimatePresence>
            {events.map((event) => (
              <EventCard key={event._id || event.id} event={event} mode={mode} onEdit={onEdit} onDelete={onDelete} onBook={onBook} onFavorite={onFavorite} isFavorite={favorites?.includes(event._id || event.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}

function EventToolbar({ categoryFilter, searchTerm, sortBy, statusFilter, onSearchChange, onCategoryChange, onStatusChange, onSortChange, mode }) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  return (
    <div className="toolbar" style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <label className="search-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder={mode === 'attendee' ? 'Search events, organizations, venue, category...' : 'Search title, venue, organizer...'} style={{ background: 'var(--bg-element)', border: '1px solid var(--glass-border)', padding: '14px 20px', borderRadius: 12, color: 'var(--text-main)', outline: 'none', fontSize: '1rem' }} />
        </label>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="ghost-button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px' }}>
          Filters {isFiltersOpen ? '▲' : '▼'}
        </motion.button>
      </div>

      <AnimatePresence>
        {isFiltersOpen && (
              <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
              <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 8 }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>Category</span><select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)} style={{ background: 'var(--bg-element)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: 8, color: 'var(--text-main)', outline: 'none' }}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              {mode === 'organization' && <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 8 }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>Status</span><select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)} style={{ background: 'var(--bg-element)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: 8, color: 'var(--text-main)', outline: 'none' }}><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>}
              <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 8 }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>Sort by</span><select value={sortBy} onChange={(event) => onSortChange(event.target.value)} style={{ background: 'var(--bg-element)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: 8, color: 'var(--text-main)', outline: 'none' }}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EventCard({ event, mode, onEdit, onDelete, onBook, onFavorite, isFavorite }) {
  const capacity = event.totalCapacity ? Number(event.totalCapacity) : Infinity
  const ticketsSold = Number(event.ticketsSold || 0)
  const seatsLeft = Math.max(capacity - ticketsSold, 0)
  const fillRate = capacity !== Infinity && capacity > 0 ? Math.min(100, Math.round((ticketsSold / capacity) * 100)) : 0
  const price = Number(event.ticketPrice || 0)
  const statusNormalized = String(event.status || 'published').toLowerCase()
  const canBook = mode === 'attendee' && ['published', 'planning'].includes(statusNormalized) && seatsLeft > 0

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, url: window.location.href }).catch(()=>{})
    } else {
      window.alert(`Share link: ${window.location.href}?event=${event._id}`)
    }
  }

  return (
    <motion.article className="event-card luxury-card" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <div className="event-cover" style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
        {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="cover-fallback" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>{getInitials(event.title)}</div>}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))' }} />
        <span className={`status-pill ${slugify(event.status || 'published')}`} style={{ position: 'absolute', top: 12, left: 12 }}>{event.status || 'Published'}</span>
        {mode === 'organization' && <span className="live-pill" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>{event.status === 'Planning' ? 'Draft' : 'Live'}</span>}
      </div>
      <div className="event-card-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
       <div className="event-card-title" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}><span className="category-pill" style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--accent-gold)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{event.category || 'Event'}</span><h3 className="line-clamp-2" style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.3, color: 'var(--text-main)' }}>{event.title}</h3>
          <p className="truncate" style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>By {event.organizer || event.hostName || 'Lumina Host'}</p></div>
          <strong style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', flexShrink: 0 }}>{price > 0 ? formatCurrency(price) : 'Free'}</strong>
        </div>
        <p className="line-clamp-3" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 20, flex: 1 }}>{event.description}</p>
        <dl className="detail-list" style={{ fontSize: '0.85rem', marginBottom: 20, padding: 16, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
       <div style={{ display: 'flex', flexDirection: 'column' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Date</dt><dd style={{ margin: 0, fontWeight: 500 }}>{formatDate(event.date)} {event.startTime ? `at ${event.startTime}` : ''}</dd></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Venue</dt><dd style={{ margin: 0, fontWeight: 500 }}>{event.location || 'To be announced'}</dd></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Format</dt><dd style={{ margin: 0, fontWeight: 500 }}>{event.eventType || 'In person'}</dd></div>
          {mode === 'attendee' && <div style={{ display: 'flex', flexDirection: 'column' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Host</dt><dd style={{ margin: 0, fontWeight: 500 }}>{event.organizer || event.hostName || 'Lumina Host'}</dd></div>}
          {mode === 'attendee' && event.contactEmail && <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Contact</dt><dd style={{ margin: 0, fontWeight: 500 }}>{event.contactEmail}</dd></div>}
          {mode === 'organization' && <div style={{ display: 'flex', flexDirection: 'column' }}><dt style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Approval</dt><dd style={{ margin: 0, fontWeight: 500 }}>{event.approvalStatus || 'Pending'}</dd></div>}
        </dl>
        <div className="countdown-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent-gold)' }}><span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Countdown</span><strong style={{ fontSize: '1rem' }}>{getCountdown(event.date)}</strong></div>
        <div className="capacity-meter" style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}><span>{mode === 'attendee' ? 'Seats left' : 'Capacity'}</span><strong>{mode === 'attendee' ? seatsLeft : `${ticketsSold}/${capacity || 'Open'}`}</strong></div><div className="meter-track" style={{ height: 6, background: 'var(--bg-element-active)', borderRadius: 3, overflow: 'hidden' }}><motion.span initial={{ width: 0 }} animate={{ width: `${fillRate}%` }} transition={{ duration: 1, ease: 'easeOut' }} style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), #3b82f6)' }} /></div></div>
        <div className="card-actions" style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {mode === 'organization' ? (
            <>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button" style={{ flex: 1 }} type="button" onClick={() => onEdit(event)}>Edit</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="danger-button" style={{ flex: 1 }} type="button" onClick={() => onDelete(event._id)}>Delete</motion.button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" type="button" onClick={() => onFavorite(event._id || event.id)} style={{ color: isFavorite ? 'var(--accent-gold)' : 'var(--text-main)', borderColor: isFavorite ? 'var(--accent-gold)' : 'var(--glass-border)' }}>{isFavorite ? '★ Saved' : '☆ Save'}</motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" type="button" onClick={handleShare}>Share</motion.button>
              </div>
              <motion.button whileHover={canBook ? { scale: 1.02 } : {}} whileTap={canBook ? { scale: 0.98 } : {}} className="primary-button compact" type="button" disabled={!canBook} onClick={() => onBook(event)} style={{ flex: 1, padding: '8px 16px', opacity: canBook ? 1 : 0.5 }}>{canBook ? 'Book ticket' : 'Unavailable'}</motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}

function BookingPanel({ bookings }) {
  const now = new Date();
  const upcoming = bookings.filter(b => !b.eventId?.date || new Date(b.eventId.date) >= now);
  const past = bookings.filter(b => b.eventId?.date && new Date(b.eventId.date) < now);

  return (
    <motion.section className="booking-panel glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 24px)', borderRadius: 'clamp(16px, 4vw, 20px)' }}>
      <div className="section-heading" style={{ marginBottom: 24 }}><div><p className="eyebrow">My Tickets</p><h2 style={{ fontSize: '1.25rem' }}>Booking history</h2></div></div>
      {bookings.length === 0 ? (
        <div className="empty-state compact-empty" style={{ padding: 32, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px dashed var(--glass-border)' }}><strong style={{ display: 'block', marginBottom: 8 }}>No bookings yet.</strong><span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Book an event to see QR ticket details.</span></div>
      ) : (
        <div className="booking-list" style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
          {upcoming.length > 0 && <h4 style={{ margin: '8px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Upcoming Events</h4>}
          {upcoming.map((booking) => {
            const isPending = booking.paymentStatus === 'Pending';
            const isRejected = booking.paymentStatus === 'Rejected';
            const qrData = JSON.stringify({
              code: booking.ticketCode || booking._id,
              event: booking.eventId?.title || 'Event',
              name: booking.attendeeName,
              tickets: booking.tickets,
              status: booking.paymentStatus || 'Paid'
            });
            return (
            <article className="booking-item ticket-item" key={booking._id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', color: isRejected ? 'var(--danger)' : (isPending ? 'var(--warning)' : 'var(--accent-cyan)'), fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{isRejected ? 'Rejected' : (isPending ? 'Verifying' : (booking.paymentStatus || 'Paid'))}{booking.paymentMethod && booking.paymentMethod !== 'Card' ? ` - ${booking.paymentMethod}` : ''} | {booking.tickets} ticket(s)</span>
              <strong className="line-clamp-2" style={{ display: 'block', fontSize: '1.05rem', marginBottom: 4 }}>{booking.eventId?.title || 'Event removed'}</strong>
              <small className="truncate" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>{booking.eventId?.date ? formatDate(booking.eventId.date) : 'Date unavailable'}</small>
              {isRejected ? (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 8, textAlign: 'center', marginBottom: 12, fontSize: '0.85rem' }}>
                  <strong>Booking Cancelled</strong><br/>
                  Transaction could not be verified.
                </div>
              ) : isPending ? (
                <div style={{ padding: '16px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)', borderRadius: 8, textAlign: 'center', marginBottom: 12, fontSize: '0.85rem' }}>
                  <strong>{booking.paymentMethod === 'Cash on Visit' ? 'Payment Due' : 'Payment Under Review'}</strong><br/>
                  {booking.paymentMethod === 'Cash on Visit' ? 'Pay at the venue to receive your pass.' : 'Transaction ID is being verified.'}
                </div>
              ) : (
                <>
                  <div className="qr-box" style={{ width: 64, height: 64, background: '#fff', margin: '0 auto 12px auto', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`} alt="QR Code" style={{ width: '100%', height: '100%' }} crossOrigin="anonymous" />
                  </div>
                  <code style={{ display: 'block', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 0', borderRadius: 6, fontSize: '0.85rem', letterSpacing: 2, marginBottom: 12 }}>{booking.ticketCode || `LUM-${String(booking._id).slice(-6)}`}</code>
                </>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: 8, flexWrap: 'wrap' }}>
                {isPending || isRejected ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket unlocks upon confirmation.</span>
                ) : (
                  <>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" type="button" style={{ flex: 1, minWidth: '100px' }} onClick={() => exportICS(booking)}>Export ICS</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="primary-button inline small" type="button" style={{ flex: 1, minWidth: '100px', padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => downloadPDF(booking)}>Get PDF</motion.button>
                  </>
                )}
              </div>
            </article>
          )})}
          {past.length > 0 && <h4 style={{ margin: '24px 0 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Past Events</h4>}
          {past.map((booking) => {
            const isPending = booking.paymentStatus === 'Pending';
            const isRejected = booking.paymentStatus === 'Rejected';
            return (
            <article className="booking-item ticket-item" key={booking._id} style={{ opacity: 0.6, background: 'var(--bg-surface-hover)', border: '1px solid var(--glass-border)', padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{isRejected ? 'Rejected' : (isPending ? 'Verifying' : (booking.paymentStatus || 'Paid'))}{booking.paymentMethod && booking.paymentMethod !== 'Card' ? ` - ${booking.paymentMethod}` : ''} | {booking.tickets} ticket(s)</span>
              <strong className="line-clamp-2" style={{ display: 'block', fontSize: '1.05rem', marginBottom: 4 }}>{booking.eventId?.title || 'Event removed'}</strong>
              <small className="truncate" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>{booking.eventId?.date ? formatDate(booking.eventId.date) : 'Date unavailable'}</small>
              <div style={{ display: 'flex', gap: '8px', marginTop: 8, flexWrap: 'wrap' }}>
                {!isPending && !isRejected && <motion.button whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }} className="ghost-button small" type="button" style={{ flex: 1, minWidth: '100px' }} onClick={() => downloadPDF(booking)}>Receipt</motion.button>}
                {!isPending && !isRejected && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="ghost-button small" type="button" style={{ flex: 1, minWidth: '100px' }} onClick={() => downloadPDF(booking)}>Receipt</motion.button>}
              </div>
            </article>
          )})}
        </div>
      )}
    </motion.section>
  )
}

function FavoriteStrip({ events }) {
  return (
    <section className="dashboard-panel glass-panel" style={{ padding: 'clamp(16px, 4vw, 32px)', borderRadius: 'clamp(16px, 4vw, 24px)', marginTop: 32 }}>
      <div className="mini-heading" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Favorite events</h3><span style={{ color: 'var(--text-muted)' }}>{events.length} saved</span></div>
      <div className="favorite-strip" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {events.length === 0 ? <span className="muted" style={{ color: 'var(--text-muted)' }}>Saved events will appear here.</span> : events.map((event) => <motion.span whileHover={{ y: -2 }} className="favorite-pill" key={event._id} style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '8px 16px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>★ {event.title}</motion.span>)}
      </div>
    </section>
  )
}

function NotificationPanel({ notifications, onMarkRead, onClear }) {
  return (
    <motion.section className="booking-panel glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ padding: 'clamp(16px, 4vw, 24px)', borderRadius: 'clamp(16px, 4vw, 20px)' }}>
      <div className="mini-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Notifications</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost-button small" type="button" style={{ border: 'none' }} onClick={onMarkRead}>Mark all read</button>
          {notifications.length > 0 && (
            <button className="ghost-button small" type="button" style={{ border: 'none' }} onClick={onClear}>Clear</button>
          )}
        </div>
      </div>
      <div className="booking-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
        {notifications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>No notifications yet.</p>}
        {notifications.map((item) => (
          <article className="booking-item" key={item.id} style={{ borderLeft: item.unread ? '3px solid var(--accent-cyan)' : '3px solid transparent', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '0 12px 12px 0' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: item.unread ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{item.unread ? '🔔 New' : 'Seen'}</span>
            <strong className="line-clamp-2" style={{ display: 'block', fontSize: '0.95rem', marginBottom: 4 }}>{item.title}</strong>
            <small className="line-clamp-3" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4, display: 'block' }}>{item.body}</small>
          </article>
        ))}
      </div>
    </motion.section>
  )
}

function Field({ className = '', label, ...props }) {
  return <label className={`field ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span>{label}</span><input {...props} style={{ width: '100%' }} /></label>
}

function SelectField({ label, name, value, options, onChange }) {
  return <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span>{label}</span><select name={name} value={value} onChange={onChange} style={{ width: '100%' }}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function Metric({ label, value, variants }) {
  return <motion.div variants={variants} className="metric-card glass-panel" whileHover={{ y: -2 }} style={{ padding: 'clamp(16px, 4vw, 24px)', borderRadius: 16 }}><span className="truncate" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</span><strong className="truncate" style={{ display: 'block', fontSize: '2rem', color: 'var(--text-main)' }}>{value}</strong></motion.div>
}

function Bar({ label, value, max }) {
  const width = Math.min(100, Math.round((Number(value || 0) / Number(max || 1)) * 100))
  return <div className="bar-row" style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 8 }}><span>{label}</span><strong style={{ color: 'var(--accent-cyan)' }}>{value}</strong></div><div className="bar-track" style={{ height: 8, background: 'var(--bg-element-active)', borderRadius: 4, overflow: 'hidden' }}><motion.span initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 1, ease: 'easeOut' }} style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-gold))' }} /></div></div>
}

function SkeletonGrid() {
  return (
    <div className="event-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
      {[1, 2, 3].map((item) => (
        <motion.div className="skeleton-card" key={item} initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} style={{ minHeight: 360, borderRadius: 20, background: 'var(--bg-element-active)', border: '1px solid var(--glass-border)' }} />
      ))}
    </div>
  )
}

function buildStats(sourceEvents, bookings, isOrganization) {
  const totalCapacity = sourceEvents.reduce((sum, event) => sum + Number(event.totalCapacity || 0), 0)
  const ticketsSold = sourceEvents.reduce((sum, event) => sum + Number(event.ticketsSold || 0), 0)
  return isOrganization
    ? [
        { label: 'Hosted events', value: sourceEvents.length },
        { label: 'Revenue', value: formatCurrency(sourceEvents.reduce((sum, event) => sum + Number(event.ticketPrice || 0) * Number(event.ticketsSold || 0), 0)) },
        { label: 'Registrations', value: ticketsSold },
        { label: 'Published', value: sourceEvents.filter((event) => event.status === 'Published').length },
      ]
    : [
        { label: 'Available events', value: sourceEvents.filter((event) => event.status === 'Published').length },
        { label: 'My bookings', value: bookings.length },
        { label: 'Open seats', value: Math.max(totalCapacity - ticketsSold, 0) },
        { label: 'Categories', value: new Set(sourceEvents.map((event) => event.category)).size },
      ]
}

function pushNotification(setNotifications, title, body) {
  setNotifications((current) => {
    const next = [{ id: `n-${Date.now()}`, title, body, unread: true }, ...current];
    return next.slice(0, 50); // Keep max 50 notifications
  });
}

function pushNotificationToUser(userId, title, body) {
  const key = `lumina-notifications-${userId}`
  const current = readStorage(key, [])
  const next = [{ id: `n-${Date.now()}`, title, body, unread: true }, ...current].slice(0, 50)
  localStorage.setItem(key, JSON.stringify(next))
}

export default App;

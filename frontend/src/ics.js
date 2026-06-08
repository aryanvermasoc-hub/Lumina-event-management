/**
 * Generates and downloads an .ics (iCalendar) file for an event.
 * 
 * @param {Object} event - The event object.
 * @param {string} event.title - The title of the event.
 * @param {string} event.description - The description of the event.
 * @param {string} event.location - The location of the event.
 * @param {Date|string} event.startDate - The start date/time of the event.
 * @param {Date|string} event.endDate - The end date/time of the event.
 */
export function downloadICS(event) {
  const formatDate = (dateInput) => {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Default to current date if missing/invalid
  const start = formatDate(event.startDate) || formatDate(new Date());
  
  // Default end date to 1 hour after start date if missing/invalid
  const end = formatDate(event.endDate) || formatDate(new Date(new Date(event.startDate || new Date()).getTime() + 60 * 60 * 1000));

  // Safely format description by escaping newlines and removing carriage returns
  const formattedDescription = (event.description || '')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');

  const safeTitle = (event.title || 'event').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumina Events//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@lumina.events`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title || 'Event'}`,
    `DESCRIPTION:${formattedDescription}`,
    `LOCATION:${event.location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
import { formatDate, formatCurrency } from './helpers.js';

export function exportICS(booking) {
  const event = booking.eventId
  if (!event || !event.date) {
    window.alert('No valid date available to export.')
    return
  }
  
  let startStr;
  let endStr;
  
  if (event.startTime) {
    const [hours, minutes] = event.startTime.split(':');
    const d = new Date(event.date);
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    startStr = d.toISOString();
  } else {
    startStr = new Date(event.date).toISOString();
  }

  if (event.endTime) {
    const [hours, minutes] = event.endTime.split(':');
    const d = new Date(event.date);
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    endStr = d.toISOString();
  } else {
    const d = new Date(event.date);
    d.setHours(d.getHours() + 1);
    endStr = d.toISOString();
  }
  
  const formatICSDate = (isoStr) => isoStr.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startICS = formatICSDate(startStr);
  const endICS = formatICSDate(endStr);
  const nowICS = formatICSDate(new Date().toISOString());

  const organizerEmail = event.contactEmail || 'noreply@lumina.events';
  const organizerName = event.organizer || event.hostName || 'Event Host';
  const ticketCode = booking.ticketCode || `LUM-${String(booking._id).slice(-6)}`;
  const safeDescription = `Ticket Code: ${ticketCode}\\n\\n${(event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumina Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${booking._id}@lumina.events`,
    `DTSTAMP:${nowICS}`,
    `DTSTART:${startICS}`,
    `DTEND:${endICS}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${safeDescription}`,
    `LOCATION:${event.location || ''}`,
    `ORGANIZER;CN="${organizerName}":mailto:${organizerEmail}`,
    `STATUS:CONFIRMED`,
    event.videoUrl ? `URL:${event.videoUrl}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `event-${booking._id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadPDF(booking) {
  const event = booking.eventId;
  if (!event) return;
  const ticketCode = booking.ticketCode || `LUM-${String(booking._id).slice(-6)}`;
  const orderDate = booking.createdAt ? formatDate(booking.createdAt) : formatDate(new Date().toISOString());
  const ticketPrice = Number(event.ticketPrice || 0);
  const totalAmount = ticketPrice * booking.tickets;
  const priceDisplay = ticketPrice > 0 ? formatCurrency(ticketPrice) : 'Free';
  const totalDisplay = ticketPrice > 0 ? formatCurrency(totalAmount) : 'Free';

  const qrData = JSON.stringify({
    code: ticketCode,
    event: event.title || 'Event',
    name: booking.attendeeName,
    tickets: booking.tickets,
    status: booking.paymentStatus || 'Paid'
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket - ${event.title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; padding: 40px; margin: 0; background: #f6f8fb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ticket-container { max-width: 700px; margin: 0 auto; }
          .ticket { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: #0f172a; color: #fff; padding: 32px; text-align: center; position: relative; }
          .header h1 { margin: 0 0 12px 0; font-size: 28px; letter-spacing: -0.5px; }
              .header p { margin: 0; font-size: 16px; color: #cbd5e1; }
              .category-badge { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #7dd3fc; }
          .body { padding: 32px; display: flex; flex-wrap: wrap; gap: 24px; border-bottom: 2px dashed #e2e8f0; }
          .details { flex: 2; min-width: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .detail-item { margin-bottom: 8px; }
          .detail-item strong { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
          .detail-item span { display: block; font-size: 15px; font-weight: 600; color: #0f172a; }
          .qr-section { flex: 1; min-width: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .qr-placeholder { width: 120px; height: 120px; background: #fff; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 2px solid #cbd5e1; margin-bottom: 16px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); overflow: hidden; }
          .ticket-code { font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: bold; background: #e2e8f0; padding: 8px 16px; border-radius: 6px; letter-spacing: 2px; }
          .payment-info { padding: 24px 32px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
          .payment-info div { display: flex; flex-direction: column; }
          .payment-info strong { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .payment-info span { font-size: 16px; font-weight: 600; color: #0f172a; }
          .payment-info .total { text-align: right; }
          .payment-info .total span { font-size: 20px; color: #14b8a6; }
          .footer { background: #fff; padding: 24px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          .footer strong { color: #0f172a; }
          @media print {
            body { background: #fff; padding: 0; }
            .ticket { box-shadow: none; border: 1px solid #cbd5e1; max-width: 100%; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
         <div class="ticket" id="ticket-content">
          <div class="header">
            <div class="category-badge">${event.category || 'Event'}</div>
            <h1>${event.title}</h1>
            <p>${formatDate(event.date)} ${event.startTime ? 'at ' + event.startTime : ''} ${event.endTime ? '- ' + event.endTime : ''}</p>
          </div>
          <div class="body">
            <div class="details">
              <div class="detail-item">
                <strong>Attendee Name</strong>
                <span>${booking.attendeeName}</span>
              </div>
              <div class="detail-item">
                <strong>Attendee Email</strong>
                <span>${booking.attendeeEmail}</span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1;">
                <strong>Venue / Location</strong>
                <span>${event.location || 'To be announced'}</span>
              </div>
              <div class="detail-item">
                <strong>Event Format</strong>
                <span>${event.eventType || 'In person'}</span>
              </div>
              <div class="detail-item">
                <strong>Order Date</strong>
                <span>${orderDate}</span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1; margin-top: 8px;">
                <strong>Event Description</strong>
                <span style="font-weight: normal; font-size: 13px; line-height: 1.5; color: #475569;">${event.description || 'No description provided.'}</span>
              </div>
            </div>
            <div class="qr-section">
              <div class="qr-placeholder">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" crossorigin="anonymous" />
              </div>
              <div class="ticket-code">${ticketCode}</div>
            </div>
          </div>
          <div class="payment-info">
            <div>
              <strong>Order ID</strong>
              <span>${booking._id}</span>
            </div>
            <div>
              <strong>Tickets</strong>
              <span>${booking.tickets} x ${priceDisplay}</span>
            </div>
            <div>
              <strong>Payment Status</strong>
              <span>${booking.paymentStatus || 'Paid'} ${booking.paymentMethod ? `(${booking.paymentMethod})` : ''}</span>
            </div>
            ${booking.transactionId ? `
            <div>
              <strong>Transaction ID</strong>
              <span>${booking.transactionId}</span>
            </div>
            ` : ''}
            <div class="total">
              <strong>Total Amount</strong>
              <span>${totalDisplay}</span>
            </div>
          </div>
          <div class="footer">
            Please present this ticket (digital or printed) at the entrance.<br/>
            Organized by <strong>${event.organizer || event.hostName || 'Event Host'}</strong><br/>
            Need help? Contact <a href="mailto:${event.contactEmail}" style="color: #14b8a6; text-decoration: none;">${event.contactEmail || 'Support'}</a>
          </div>
         </div>
         <div class="no-print" style="text-align: center; margin-top: 32px;">
           <button onclick="window.print()" style="padding: 12px 24px; font-size: 14px; margin-right: 12px; cursor: pointer; border: none; background: #14b8a6; color: #fff; border-radius: 8px; font-weight: bold;">Print / Save PDF</button>
           <button onclick="window.close()" style="padding: 12px 24px; font-size: 14px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; font-weight: bold;">Close Tab</button>
         </div>
        </div>
        <script>
          window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
          };
        </script>
      </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (!printWindow) {
    window.alert('Please allow popups to download your ticket.');
  }
}

export function downloadReportPDF({ events, admins, tasks, revenue }) {
  const published = events.filter((e) => e.status === 'Published').length;
  const completed = events.filter((e) => e.status === 'Completed').length;
  const planning = events.filter((e) => e.status === 'Planning').length;
  const soldOut = events.filter((e) => e.status === 'Sold out').length;

  const totalCapacity = events.reduce((s, e) => s + Number(e.totalCapacity || 0), 0);
  const totalSold = events.reduce((s, e) => s + Number(e.ticketsSold || 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;

  const topEvents = [...events].sort((a, b) => Number(b.ticketsSold || 0) - Number(a.ticketsSold || 0)).slice(0, 5);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Organization Performance Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0 0 8px 0; font-size: 28px; letter-spacing: -0.5px; }
          .header p { margin: 0; color: #64748b; font-size: 14px; }
          .brand { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -1px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
          .metric { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .metric span { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: bold; }
          .metric strong { display: block; font-size: 24px; color: #0f172a; }
          h2 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #e2e8f0; }
          th { color: #64748b; font-weight: bold; }
          .footer { margin-top: 60px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">Print / Save PDF</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #fff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; margin-left: 8px;">Close Tab</button>
          </div>
          
          <div class="header">
            <div>
              <h1>Performance Report</h1>
              <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div class="brand">Lumina.</div>
          </div>

          <div class="grid">
            <div class="metric"><span>Total Events</span><strong>${events.length}</strong></div>
            <div class="metric"><span>Total Revenue</span><strong>${formatCurrency(revenue)}</strong></div>
            <div class="metric"><span>Avg Fill Rate</span><strong>${fillRate}%</strong></div>
            <div class="metric"><span>Tasks Done</span><strong>${completedTasks}/${tasks.length}</strong></div>
          </div>

          <h2>Event Status Breakdown</h2>
          <table>
            <thead><tr><th>Status</th><th>Count</th><th>% of Total</th></tr></thead>
            <tbody>
              <tr><td>Published</td><td>${published}</td><td>${events.length ? Math.round((published/events.length)*100) : 0}%</td></tr>
              <tr><td>Completed</td><td>${completed}</td><td>${events.length ? Math.round((completed/events.length)*100) : 0}%</td></tr>
              <tr><td>Planning</td><td>${planning}</td><td>${events.length ? Math.round((planning/events.length)*100) : 0}%</td></tr>
              <tr><td>Sold Out</td><td>${soldOut}</td><td>${soldOut}</td><td>${events.length ? Math.round((soldOut/events.length)*100) : 0}%</td></tr>
            </tbody>
          </table>

          <h2>Top Events by Attendance</h2>
          <table>
            <thead><tr><th>Event Title</th><th>Date</th><th>Tickets Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              ${topEvents.length > 0 ? topEvents.map(e => `<tr><td><strong>${e.title}</strong></td><td>${formatDate(e.date)}</td><td>${e.ticketsSold || 0} / ${e.totalCapacity || 'Open'}</td><td>${formatCurrency(Number(e.ticketPrice || 0) * Number(e.ticketsSold || 0))}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align: center; color: #64748b;">No events data available</td></tr>'}
            </tbody>
          </table>

          <h2>Admin Productivity</h2>
          <table>
            <thead><tr><th>Admin Name</th><th>Role</th><th>Completed Tasks</th><th>Total Assigned</th></tr></thead>
            <tbody>
              ${admins.length > 0 ? admins.map(a => `<tr><td><strong>${a.name}</strong></td><td>${a.orgRole || 'admin'}</td><td>${a.completed || 0}</td><td>${a.tasks || 0}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align: center; color: #64748b;">No admin data available</td></tr>'}
            </tbody>
          </table>

          <div class="footer">Confidential & Proprietary. Generated securely by Lumina Events.</div>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
      </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (!printWindow) {
    window.alert('Please allow popups to download your report.');
  }
}
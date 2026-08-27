import { WeddingEvent } from './models/wedding-event.model';

const calendarParams = new URLSearchParams({
  action: 'TEMPLATE',
  text: 'Boda de Cristina & Antonio',
  dates: '20270904T170000Z/20270905T000000Z',
  details: 'Celebramos la boda de Cristina & Antonio. Horario pendiente de confirmar (aprox. 19:30).',
  location: 'Recreo San Luis',
});

export const WEDDING_EVENT: WeddingEvent = {
  coupleNames: 'Cristina & Antonio',
  dateLabel: '4 de septiembre',
  timeLabel: 'Pendiente de confirmar · aprox. 19:30',
  venue: 'Recreo San Luis',
  startsAt: '2027-09-04T19:30:00+02:00',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=El%20Recreo%20San%20Luis',
  calendarUrl: `https://calendar.google.com/calendar/render?${calendarParams.toString()}`,
};

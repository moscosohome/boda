import { WeddingEvent } from './models/wedding-event.model';

const calendarParams = new URLSearchParams({
  action: 'TEMPLATE',
  text: 'Boda de Cristina & Antonio',
  dates: '20270904T173000Z/20270905T000000Z',
  details: 'Celebramos la boda de Cristina & Antonio.',
  location: 'El Recreo San Luis',
});

export const WEDDING_EVENT: WeddingEvent = {
  coupleNames: 'Cristina & Antonio',
  dateLabel: '4 de septiembre',
  timeLabel: '19:30',
  venue: 'El Recreo San Luis',
  startsAt: '2027-09-04T19:30:00+02:00',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=El%20Recreo%20San%20Luis',
  calendarUrl: `https://calendar.google.com/calendar/render?${calendarParams.toString()}`,
};

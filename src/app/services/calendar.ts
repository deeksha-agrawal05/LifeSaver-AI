import { Injectable, signal } from '@angular/core';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  // Client ID fallback - Users can customize in their own .env or UI
  private defaultClientId = '1071930112218-devclientid.apps.googleusercontent.com';
  
  // Connection state
  isConnected = signal<boolean>(false);
  googleAccessToken = signal<string | null>(null);
  loadingEvents = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  // Live/Simulated mode state
  isSimulated = signal<boolean>(true);

  // Events list
  events = signal<CalendarEvent[]>([]);

  constructor() {
    // Check if there is an existing access token in sessionStorage (in-memory)
    const cachedToken = sessionStorage.getItem('google_calendar_token');
    const wasSimulated = sessionStorage.getItem('google_calendar_simulated');
    
    if (cachedToken) {
      this.googleAccessToken.set(cachedToken);
      this.isConnected.set(true);
      this.isSimulated.set(false);
      this.fetchEvents(cachedToken);
    } else if (wasSimulated !== 'false') {
      this.loadSimulatedEvents();
    }

    // Set up message listener for the popup callback
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        const token = event.data.accessToken;
        this.handleSuccessfulConnection(token);
      }
    });
  }

  // Set Client ID
  getClientId(): string {
    return this.defaultClientId;
  }

  // Trigger Google OAuth implicit grant flow
  connect() {
    this.errorMsg.set(null);
    this.loadingEvents.set(true);
    
    const clientId = this.getClientId();
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=consent`;

    // Open standard size Google OAuth pop-up
    const popup = window.open(oauthUrl, 'Connect Google Calendar', 'width=550,height=650,left=150,top=100');
    
    if (!popup) {
      this.errorMsg.set('Pop-up window was blocked. Please enable pop-ups for this site and try again.');
      this.loadingEvents.set(false);
    }
  }

  // Handle connection
  handleSuccessfulConnection(token: string) {
    this.googleAccessToken.set(token);
    this.isConnected.set(true);
    this.isSimulated.set(false);
    
    // Save in-memory token (session storage is permitted for in-memory-like tab persistence)
    sessionStorage.setItem('google_calendar_token', token);
    sessionStorage.setItem('google_calendar_simulated', 'false');
    
    this.fetchEvents(token);
  }

  // Disconnect Calendar
  disconnect() {
    this.googleAccessToken.set(null);
    this.isConnected.set(false);
    this.isSimulated.set(true);
    sessionStorage.removeItem('google_calendar_token');
    sessionStorage.setItem('google_calendar_simulated', 'true');
    this.loadSimulatedEvents();
  }

  // Fetch real events from Google Calendar API
  async fetchEvents(token: string) {
    this.loadingEvents.set(true);
    this.errorMsg.set(null);

    try {
      const now = new Date();
      // Fetch upcoming events from now to next 7 days
      const maxDate = new Date();
      maxDate.setDate(now.getDate() + 7);

      const timeMin = encodeURIComponent(now.toISOString());
      const timeMax = encodeURIComponent(maxDate.toISOString());

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=25`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const googleEvents = (data.items || []).map((item: {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }) => ({
        id: item.id,
        summary: item.summary || 'No Summary',
        description: item.description || '',
        start: {
          dateTime: item.start?.dateTime || item.start?.date,
          date: item.start?.date
        },
        end: {
          dateTime: item.end?.dateTime || item.end?.date,
          date: item.end?.date
        }
      }));

      this.events.set(googleEvents);
    } catch (err: unknown) {
      console.error('Error fetching Google Calendar events:', err);
      this.errorMsg.set('Unable to sync live calendar events. We have activated standard simulated workspace events for testing.');
      this.isSimulated.set(true);
      this.loadSimulatedEvents();
    } finally {
      this.loadingEvents.set(false);
    }
  }

  // Load realistic mock calendar events relative to the current time so they are always current and interactive
  loadSimulatedEvents() {
    const now = new Date();
    
    // Create simulated event times (e.g. today/tomorrow)
    const todayMorningStart = new Date(now);
    todayMorningStart.setHours(9, 30, 0, 0);
    const todayMorningEnd = new Date(now);
    todayMorningEnd.setHours(11, 0, 0, 0);

    const todayAfternoonStart = new Date(now);
    todayAfternoonStart.setHours(13, 0, 0, 0);
    const todayAfternoonEnd = new Date(now);
    todayAfternoonEnd.setHours(14, 30, 0, 0);

    const todayLateStart = new Date(now);
    todayLateStart.setHours(15, 30, 0, 0);
    const todayLateEnd = new Date(now);
    todayLateEnd.setHours(16, 30, 0, 0);

    // Tomorrow events
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const tomorrowMorningStart = new Date(tomorrow);
    tomorrowMorningStart.setHours(10, 0, 0, 0);
    const tomorrowMorningEnd = new Date(tomorrow);
    tomorrowMorningEnd.setHours(12, 0, 0, 0);

    const tomorrowAfternoonStart = new Date(tomorrow);
    tomorrowAfternoonStart.setHours(14, 0, 0, 0);
    const tomorrowAfternoonEnd = new Date(tomorrow);
    tomorrowAfternoonEnd.setHours(15, 30, 0, 0);

    const mockEvents: CalendarEvent[] = [
      {
        id: 'sim-1',
        summary: '👥 Weekly Sprint Sync & Team Alignment',
        description: 'Discuss remaining sprint goals and subtask priorities.',
        start: { dateTime: todayMorningStart.toISOString() },
        end: { dateTime: todayMorningEnd.toISOString() }
      },
      {
        id: 'sim-2',
        summary: '🎨 UI Design Review & Feedback Session',
        description: 'Review interface layout, Tailwind specs, and aesthetic refinements.',
        start: { dateTime: todayAfternoonStart.toISOString() },
        end: { dateTime: todayAfternoonEnd.toISOString() }
      },
      {
        id: 'sim-3',
        summary: '🚀 LifeSaver AI Integration Alignment',
        description: 'Sync with product owners on Google Workspace scope definitions.',
        start: { dateTime: todayLateStart.toISOString() },
        end: { dateTime: todayLateEnd.toISOString() }
      },
      {
        id: 'sim-4',
        summary: '💻 Technical Deep-Dive & Code Review',
        description: 'Analyze component bindings and Express endpoint resilience.',
        start: { dateTime: tomorrowMorningStart.toISOString() },
        end: { dateTime: tomorrowMorningEnd.toISOString() }
      },
      {
        id: 'sim-5',
        summary: '🤝 Client Showcase & Demo Sandbox Run',
        description: 'Deliver the finalized single-screen visual layouts for end-user approval.',
        start: { dateTime: tomorrowAfternoonStart.toISOString() },
        end: { dateTime: tomorrowAfternoonEnd.toISOString() }
      }
    ];

    // Filter to only include future events (or events ending in the future)
    this.events.set(mockEvents.filter(ev => {
      const endT = new Date(ev.end.dateTime || ev.end.date || '').getTime();
      return endT > now.getTime() - (60 * 60 * 1000); // Keep events ending in the last hour or later
    }));
  }

  // Check if a specific time range overlaps with any calendar events
  checkOverlap(startIso: string, endIso: string): CalendarEvent[] {
    const checkStart = new Date(startIso).getTime();
    const checkEnd = new Date(endIso).getTime();

    if (isNaN(checkStart) || isNaN(checkEnd)) return [];

    return this.events().filter(event => {
      const evStart = new Date(event.start.dateTime || event.start.date || '').getTime();
      const evEnd = new Date(event.end.dateTime || event.end.date || '').getTime();

      if (isNaN(evStart) || isNaN(evEnd)) return false;

      // Overlap formula: (startA < endB) and (endA > startB)
      return (checkStart < evEnd) && (checkEnd > evStart);
    });
  }

  // Get list of busy events between now and a task's deadline
  getBusyEventsInWindow(deadlineIso: string): CalendarEvent[] {
    const now = new Date().toISOString();
    return this.checkOverlap(now, deadlineIso);
  }
}

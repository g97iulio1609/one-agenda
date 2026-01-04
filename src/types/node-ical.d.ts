declare module 'node-ical' {
  export interface VEvent {
    type: 'VEVENT';
    summary?: string;
    start?: Date;
    end?: Date;
    url?: string | null;
    attendee?: (string | { val?: string; params?: Record<string, string> })[];
  }

  export interface SyncApi {
    parseFile: (path: string) => Record<string, VEvent | unknown>;
  }

  const ical: {
    sync: SyncApi;
  };

  export default ical;
}

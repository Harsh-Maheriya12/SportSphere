// Generate a Google Calendar link for an event
export const generateGoogleCalendarLink = (title: string, start: Date, end: Date, location: string) => {
  // Format dates as YYYYMMDDTHHMMSSZ eg: 20231015T090000Z
  const formatDate = (d: Date) =>
    d.toISOString().replace(/[-:.]/g, "").split(".")[0] + "Z";

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  // Construct the Google Calendar URL
  const url = new URL("https://calendar.google.com/calendar/render");

  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", title);
  url.searchParams.append("dates", `${startStr}/${endStr}`);
  url.searchParams.append("location", location);

  return url.toString();
};

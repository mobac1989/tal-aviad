
import { Episode } from './types';

export const MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export const parseCSV = (csvText: string): Episode[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header
  return lines.slice(1).map((line, index) => {
    // Simple CSV split (assuming no commas in notes/urls or they are quoted)
    // For more complex CSVs, a library like PapaParse is better, but this is lightweight
    const columns = line.split(',');
    
    return {
      id: columns[1] || `ep-${index}`, // Use ISO Date as ID
      date: columns[0],
      dateISO: columns[1],
      weekday: columns[2],
      year: parseInt(columns[3]),
      month: parseInt(columns[4]),
      monthName: columns[5],
      day: parseInt(columns[6]),
      url: columns[7],
      notes: columns[8] || "",
      display: columns[9] || columns[0]
    };
  }).filter(ep => ep.url); // Ensure we have a URL
};

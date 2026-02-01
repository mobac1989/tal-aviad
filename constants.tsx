import { Episode } from './types';

export const MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export const parseCSV = (csvText: string): Episode[] => {
  // Use regex to split lines to handle both \n and \r\n
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  return lines.slice(1).map((line, index) => {
    // Basic CSV split, but trim each value to remove potential \r or extra spaces
    const columns = line.split(',').map(col => col.trim());
    
    if (columns.length < 8) return null;

    return {
      id: columns[1] || `ep-${index}`,
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
  }).filter((ep): ep is Episode => ep !== null && !!ep.url);
};
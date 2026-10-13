// Minimal stroke icon set (Lucide-style paths) so we avoid an icon dependency.
const PATHS = {
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  mapPin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  bed: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01',
  building: 'M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h1M17 17h1M3 21h18',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  snow: 'M12 2v20M4.9 6l14.2 12M19.1 6L4.9 18',
  tv: 'M3 6h18v12H3zM8 21h8',
  coffee: 'M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM17 10h2a2 2 0 0 1 0 4h-2M7 3v3M11 3v3',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  waves: 'M2 8c2.5 2 5 2 7.500 0s5-2 7.500 0 3 1.500 5 0M2 14c2.500 2 5 2 7.500 0s5-2 7.500 0 3 1.500 5 0',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  card: 'M3 6h18v12H3zM3 10h18',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
  logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.600 6.100A9.500 9.500 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.500M6.500 7.500A17 17 0 0 0 2 12s4 7 10 7a9.500 9.500 0 0 0 4-.9',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z',
  refresh: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  chart: 'M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3',
  key: 'M14 10a4 4 0 1 1-3-3.900M11 10l-8 8v3h3l1-1v-2h2v-2h2l1-1',
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  shield: 'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z',
  sparkles: 'M12 3l1.800 4.800L18.500 9.500l-4.700 1.700L12 16l-1.800-4.800L5.500 9.500l4.700-1.700zM19 15l.8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8z',
  concierge: 'M3 18h18M5 18a7 7 0 0 1 14 0M12 8V5M10 5h4',
  car: 'M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3M7.500 13h.01M16.500 13h.01',
  shirt: 'M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z',
  utensils: 'M6 3v8a2 2 0 0 0 2 2v8M10 3v8a2 2 0 0 1-2 2M17 3c-2 2-3 5-3 8h3v10',
  lotus: 'M12 20c-4 0-8-3-8-8 4 0 7 2 8 5 1-3 4-5 8-5 0 5-4 8-8 8zM12 17c-2-3-2-9 0-13 2 4 2 10 0 13z',
};

export default function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.8 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

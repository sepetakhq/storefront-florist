// The design's line icons (24px grid, stroked with currentColor), one
// component so every glyph shares stroke and sizing.
const PATHS = {
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6',
  flask: 'M9 3h6 M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3 M7 15h10',
  truck: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2 M15 18H9 M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38A1 1 0 0 0 17.52 9H14 M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  return: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5',
  chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z M9 12l2 2 4-4',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2',
  box: 'M21 8 12 3 3 8v8l9 5 9-5Z M3 8l9 5 9-5 M12 13v8',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  cart: 'M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6 M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z M19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M18 6 6 18 M6 6l12 12',
  next: 'M9 18l6-6-6-6',
  prev: 'M15 18l-6-6 6-6',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M22 6l-10 7L2 6',
  gift: 'M20 12v10H4V12 M2 7h20v5H2Z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
  card: 'M2 5h20v14H2Z M2 10h20',
  check: 'M20 6 9 17l-5-5',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z',
  lamp: 'M8 2h8l3.5 9h-15Z M12 11v8 M8 21h8 M10 19h4',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  // The design's five-petal mark: section headings, the hero button, the
  // announcement bar. Decoration only, never chosen from merchant input.
  flower:
    'M9.4 6.6a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0 M14.6 10.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0 M12.6 16.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0 M6.2 16.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0 M4.2 10.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0 M10.6 11.8a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0',
  plus: 'M12 5v14 M5 12h14',
  copy: 'M8 8h12v12H8Z M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M17.5 6.5h.01',
  facebook: 'M15 3h-2a4 4 0 0 0-4 4v3H7v3h2v8h3v-8h3l1-3h-4V7a1 1 0 0 1 1-1h2Z',
  tiktok: 'M15 3a5 5 0 0 0 5 5 M15 3v12a4 4 0 1 1-4-4',
  whatsapp: 'M4 20l1.3-4A8 8 0 1 1 8 18.7Z M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z',
};

export const ICONS = Object.keys(PATHS);

export default function Icon({ name, size = 20, strokeWidth = 1.8, fill = 'none', style, className }) {
  const d = PATHS[name] ?? PATHS.heart;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', ...style }}
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

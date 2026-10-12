// Chart colours for recharts, which needs raw values rather than Tailwind classes.
// These mirror the tokens in tailwind.config.js (spec 11 §2, §6); change both together.
// Series order is fixed: tea-700 first, then ink-300. ink-300 is under 3:1 on white,
// so charts using it must carry direct value labels and a table view.
export const CHART = {
  series: ['#24513D', '#A9B2AC'], // tea-700, ink-300
  grid: '#E4E7E3', // ink-100
  axis: '#4A554F', // ink-600
  text: '#17201B', // ink-900
  surface: '#FFFFFF', // paper-50, also the 2px gap between stacked segments
  cursor: '#EEEBE3', // paper-200
};

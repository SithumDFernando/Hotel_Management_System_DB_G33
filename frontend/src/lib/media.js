// Static imagery + copy. The API has no photos, so we map branch city and
// room type to curated images. Every <img> using these must fall back to a
// gradient on error (see <Photo/>).

const u = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const HERO_IMAGE = u('photo-1566073771259-6a8506099945', 1800);

export const BRANCH_MEDIA = {
  Colombo: {
    image: u('photo-1566073771259-6a8506099945'),
    tag: 'Oceanfront urban oasis',
    blurb: 'Panoramic views of the Indian Ocean and city skyline, framed by teak finishing and curated art.',
  },
  Kandy: {
    image: u('photo-1520250497591-112f2f40a3f4'),
    tag: 'Highland tea sanctuary',
    blurb: 'Perched above emerald tea slopes and sacred river valleys, offering crisp mountain air and quiet.',
  },
  Galle: {
    image: u('photo-1582719508461-905c673771fd'),
    tag: 'UNESCO colonial gem',
    blurb: 'Dutch vaulted archways, candle-lit stone courtyards and sea breezes inside the Fort walls.',
  },
};

export const ROOM_TYPE_MEDIA = {
  Single: u('photo-1631049307264-da0ec9d70304'),
  Double: u('photo-1590490360182-c33d57733427'),
  Suite: u('photo-1578683010236-d716f9a3f461'),
  Deluxe: u('photo-1618773928121-c32242e63f39'),
};

export const ROOM_TYPE_BLURB = {
  Single: 'Compact and calm — ideal for solo travellers.',
  Double: 'A comfortable retreat for two with refined furnishings.',
  Suite: 'Spacious signature suite with premium amenities.',
  Deluxe: 'Elevated comfort with a king bed and private balcony.',
};

export const FALLBACK_GRADIENT = 'linear-gradient(135deg,#EEEBE3 0%,#E3EEE7 100%)';

export const branchMedia = (city) =>
  BRANCH_MEDIA[city] || { image: HERO_IMAGE, tag: 'SkyNest boutique stay', blurb: '' };
export const roomImage = (typeName) => ROOM_TYPE_MEDIA[typeName] || ROOM_TYPE_MEDIA.Double;

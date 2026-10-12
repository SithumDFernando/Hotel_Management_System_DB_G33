// Static imagery + one plain sentence per branch. The API has no photos, so we map branch
// city and room type to Unsplash images (Unsplash License). Every <img> using these must
// fall back to a flat wash on error (see <Photo/>).
//
// Copy rule (spec 11 §7.2, §9): only facts from the seed addresses or the photo itself.

const u = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

// Home opening photo. Galle Fort rampart walk, daytime.
// unsplash.com/photos/a-group-of-people-walking-on-a-sidewalk-next-to-a-body-of-water-jh-y6AONhF8
export const OPENING_IMAGE = {
  image: u('photo-1654561773591-57b9413c45c0', 1400),
  alt: 'People walking on the Galle Fort ramparts beside the sea',
};

export const BRANCH_MEDIA = {
  Colombo: {
    // unsplash.com/photos/a-grassy-field-in-front-of-tall-buildings-at-night-o26zCEltocw
    image: u('photo-1706954532520-e46c19ce6749'),
    alt: 'Galle Face Green at night, with Colombo’s towers behind',
    blurb: 'On Galle Face Terrace, beside Galle Face Green.',
  },
  Kandy: {
    // unsplash.com/photos/a-large-white-building-sitting-on-top-of-a-lake-FZ6RTpiYi6w
    image: u('photo-1705730428836-b54e12aa8ea5'),
    alt: 'Kandy Lake with the wooded hills behind',
    blurb: 'On Temple Road, in Kandy.',
  },
  Galle: {
    // unsplash.com/photos/a-lighthouse-and-buildings-overlook-the-ocean-YaOhW7uZKE4
    image: u('photo-1743585826344-aea35e952642'),
    alt: 'Galle Fort ramparts, the lighthouse and the sea',
    blurb: 'On Lighthouse Street, inside the walls of Galle Fort.',
  },
};

export const ROOM_TYPE_MEDIA = {
  Single: u('photo-1631049307264-da0ec9d70304'),
  Double: u('photo-1590490360182-c33d57733427'),
  Suite: u('photo-1578683010236-d716f9a3f461'),
  Deluxe: u('photo-1618773928121-c32242e63f39'),
};

// Flat paper → tea wash shown only when a photo fails to load.
export const FALLBACK_GRADIENT = 'linear-gradient(135deg,#EEEBE3 0%,#E3EEE7 100%)';

export const branchMedia = (city) =>
  BRANCH_MEDIA[city] || { image: OPENING_IMAGE.image, alt: '', blurb: '' };
export const roomImage = (typeName) => ROOM_TYPE_MEDIA[typeName] || ROOM_TYPE_MEDIA.Double;

const piexif = require('piexifjs');

// 1x1 white JPEG
const BASE = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const toDms = (deg) => {
  const d = Math.floor(Math.abs(deg));
  const mFull = (Math.abs(deg) - d) * 60;
  const m = Math.floor(mFull);
  const s = Math.round((mFull - m) * 60 * 10000);
  return [[d, 1], [m, 1], [s, 10000]];
};

/** Builds a JPEG buffer with optional EXIF capture time (local "YYYY:MM:DD HH:MM:SS"), GPS and software tag. `salt` makes each file unique. */
function makeJpeg({ takenAt, lat, lng, software, salt = '' } = {}) {
  const exif = { '0th': {}, Exif: {}, GPS: {} };
  exif['0th'][piexif.ImageIFD.ImageDescription] = `rc-test-${salt}-${Math.random()}`;
  if (software) exif['0th'][piexif.ImageIFD.Software] = software;
  if (takenAt) exif.Exif[piexif.ExifIFD.DateTimeOriginal] = takenAt;
  if (lat != null && lng != null) {
    exif.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
    exif.GPS[piexif.GPSIFD.GPSLatitude] = toDms(lat);
    exif.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';
    exif.GPS[piexif.GPSIFD.GPSLongitude] = toDms(lng);
  }
  const dataUrl = `data:image/jpeg;base64,${BASE}`;
  const withExif = piexif.insert(piexif.dump(exif), dataUrl);
  return Buffer.from(withExif.split(',')[1], 'base64');
}

module.exports = { makeJpeg };

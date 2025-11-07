const sharp = require('sharp');

sharp('public/ztfbleu.png')
  .resize({ width: 200, height: 200 })
  .sharpen()
  .toFile('output.jpg')
  .then(() => console.log('✓ Image redimensionnée'))
  .catch(err => console.error(err));
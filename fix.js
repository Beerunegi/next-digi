const fs = require('fs');
const content = fs.readFileSync('views/geo-optimization-services.ejs', 'utf8');
fs.writeFileSync('views/geo-optimization-services.ejs', content.replace(/\\"/g, '"'));

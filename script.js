const ColorThief = require('colorthief');
const skmeans = require("skmeans");

const testFolder = 'temp/';
const fs = require('fs');
const colorPromises = [];

fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    console.log(file);

    const imageSrc = process.cwd() + '/' + testFolder + file;
    colorPromises.push(ColorThief.getColor(imageSrc));
  });

  Promise.all(colorPromises)
    .then(colors => { 
      console.log(skmeans(colors, 5, "kmpp", 1000));
    })
    .catch(err => { console.log(err) });
});


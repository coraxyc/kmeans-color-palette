const ColorThief = require('colorthief');
const fetch = require("node-fetch");
const Magic = require('mmmagic').Magic;
const mimeTypeDetector = new Magic();
const http = require('http');
const FormData = require('form-data');
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const url = 'http://localhost:8001'
// const url = 'http://www.principle-gallery.ucsd.edu:8000/uploads/2beefa07-7c66-422e-af27-c4e7cc37245b.png'
// ColorThief.getColor(url).then((color) => console.log(color));

const referenceColors = {
  red: {rgb: { r: 226, g: 82, b: 65 }}, 
  orange: {rgb: { r: 242, g: 156, b: 56 }}, 
  yellow: {rgb: { r: 253, g: 235, b: 96 }}, 
  green: {rgb: { r: 103, g: 172, b: 91 }}, 
  lightBlue: {rgb: { r: 82, g: 185, b: 209 }}, 
  blue: {rgb: { r: 69, g: 149, b: 236 }}, 
  purple: {rgb: { r: 144, g: 52, b: 170 }},
  pink: {rgb: { r: 215, g: 56, b: 100 }}, 
  white: {rgb: { r: 255, g: 255, b: 255 }}, 
  grey: {rgb: { r: 158, g: 158, b: 158 }}, 
  black: {rgb: { r: 0, g: 0, b: 0 }}, 
  brown: {rgb: { r: 89, g: 65, b: 57 }},
};

const result = {};

/******/
const getDesignList = async () =>
  await fetch('http://principle-gallery.ucsd.edu:8000/api/designs')
    .then(res => res.text())
    .then(text => JSON.parse(text));

async function getImage(id) {
  return await fetch(`http://principle-gallery.ucsd.edu:8000/api/images/${id}`)
    .then(res => res.text())
    .then(text => JSON.parse(text))
    .then(obj => `http://${obj.url}`);
}

async function getMainAndMatchedColors() {
    const designList = await getDesignList();
    const idList = designList.map(design => design.imageId);
    const imageList = await Promise.allSettled(
      idList.map(async (id) => {
        const url = await getImage(id);
        return {imageId: id, url: url}
      })
    );

    console.log(imageList[0].value);
    console.log(imageList[0].value.imageId);
    const failedImageList = imageList
      .filter(p => p != undefined && p.status === 'rejected')
      .map(p => p.value.imageId);
    
    console.log('failed image list: ');
    console.log(failedImageList);

    const fulfilledImageList = imageList
      .filter(p => p != undefined && p.status === 'fulfilled');

    const mainColors = await Promise.allSettled(
      fulfilledImageList.map(async (promise) => {
        const dominantColor = await ColorThief.getColor(promise.value.url);
        return { 
          imageId: promise.value.imageId, 
          url: promise.value.url,
          rgbArray: dominantColor
        };
      })
    );

    // const failedColorList = [];
    // mainColors.map((promise, index) => {
    //   if (promise === undefined || promise.status === 'rejected') {
    //     failedColorList.push(promise.value.imageId);
    //   }
    // });

    const failedColorList = imageList
      .filter(p => p != undefined && p.status === 'rejected')
      .map(p => p.value.imageId);

    console.log('failed color list: ');
    console.log(failedColorList);

    console.log('finding main colors...');
  
    const fulfilledMainColors = mainColors
      .filter(p => p !== undefined && p.status === 'fulfilled')
      .map(p => ({
        imageId: p.value.imageId,
        url: p.value.url, 
        rgb: {
          r: p.value.rgbArray[0], 
          g: p.value.rgbArray[1], 
          b: p.value.rgbArray[2]
        }
      }));

    const matchedColors = fulfilledMainColors.map(({imageId, url, rgb}) => {
      const referenceRGB = getClosestColorName(rgb);
      return { 
        imageId,
        url, 
        mainRGB: rgb, 
        matchedRGB: referenceColors[referenceRGB].rgb 
      };
    });

    console.log('matched colors created');
    fs.writeFileSync('colors.json', JSON.stringify(matchedColors));
    return matchedColors;
}

/******/
/*
<div>
  <input type="radio" id="${colorName}" name="${colorName}" value="${colorHex}">
  <label for="huey">    
    <svg width="60" height="60">
      <rect width="60" height="60" style="fill:#1c87c9;stroke-width:3;stroke:rgb(255,255,255)" />
    </svg>
  </label>
</div>
*/
function createRefColorRadioButtons(rowId, checkedColorName) {
  let radioHTML = "";
  Object.keys(referenceColors).map((colorName) => {
    const colorHex = rgbToHex(referenceColors[colorName].rgb);
    radioHTML +=
    `
      <input 
        type="radio" 
        id="radio${rowId}" 
        name="radio${rowId}" 
        value="${colorHex}" 
        ${colorName === checkedColorName ? ' checked' : ''}>
      <label for="${rowId}">
        <svg width="60" height="60" style="padding-right:10px;">
          <rect width="60" height="60" style="fill:${colorHex};stroke-width:1;stroke:rgb(0,0,0);" />
        </svg>
      </label>
    `;
  });
  return radioHTML;
}

getMainAndMatchedColors().then(colorObjs => {
  console.log('creating web content...');

  let htmlContent = `Reference Colors <div style="display: grid; grid-template-columns: ${new Array(20).fill(0).map(x => '60px ').join('')}">`;
  Object.keys(referenceColors).map(refColor => {
    const refRGB = referenceColors[refColor].rgb;
    const refHex = rgbToHex(refRGB);

    htmlContent +=
    `
      <div style="width: 50px; height: 50px; background-color: ${refHex}"></div>
    `;
  });
  htmlContent += `</div>`;


  htmlContent += `All Colors <div>`;
  console.log(colorObjs[0]);
  colorObjs.filter(p => p != undefined);
  colorObjs.map(({imageId, url, mainRGB, matchedRGB}, index) => {
      if (mainRGB === undefined || matchedRGB === undefined) {
        console.log('undefined');
        console.log(colorObjs[index]);
        return;
      }
      console.log(colorObjs[index]);
      const targetHex = rgbToHex(mainRGB);
      const closestMatchedColorName = getClosestColorName(matchedRGB);
      htmlContent += 
        `
        <style>
          #image${imageId}:hover + .tooltipPoster {
            transform: scale(1.5);
          }
        </style>
        <div class="colorRow" style="transition: .4s;">
          <span style="padding:20px;">${index}</span>
          <svg id="image${imageId}" width="50" height="50" style="padding-right:30px;">
            <rect width="50" height="50" style="fill:${targetHex};stroke-width:3;stroke:rgb(255,255,255);" />
          </svg>
          <img class="tooltipPoster" src="${url}" style="left:105%; display: inline; width:60px;">
          ${createRefColorRadioButtons(imageId, closestMatchedColorName)}
          <button onclick="() => ${onRowUpdate(imageId)}">Update</button>
        </div>
        `;
      console.log(htmlContent.length);
  });
  console.log(colorObjs.length);
  /*
    htmlContent += `Picked Colors`;
    // htmlContent = htmlContent + `</div> Picked Colors (nearest) <div style="display: grid; grid-template-columns: ${new Array(20).fill(0).map(x => '60px ').join('')}">`
    matchedColors.forEach((targetRGB) => {
      const referenceName = getClosestColorName(targetRGB);
      const referenceHex = rgbToHex(referenceColors[referenceName].rgb);
      htmlContent = htmlContent + `<div style="width: 60px; height: 60px; background-color: ${referenceHex}"></div>`
    });
  */
  htmlContent += `<br><input type="submit">`;
  htmlContent += `</div>`;

  console.log('creating server...');
  http.createServer(function(request, response) {  
    response.writeHeader(200, {"Content-Type": "text/html"});  
    response.write(htmlContent);  
    response.end();
  })
  .listen(8001);

});

function onRowUpdate(imageId) {

}
/*
function handleFormSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const formJSON = Object.fromEntries(data.entries());
  console.log(formJSON);
}

got(url).then(response => {
  const dom = new JSDOM(response.body);
  const form = dom.window.document.querySelector('form');
  console.log(form);
  form.addEventListener('submit', handleFormSubmit);

}).catch(err => {
  console.log(err);
});
*/
/*
fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    const imageSrc = process.cwd() + '/' + testFolder + file;
    colorPromises.push(ColorThief.getColor(imageSrc));
  });

  Promise.all(colorPromises)
    .then(colors => { 
      htmlContent += `All Colors <div style="display: grid; grid-template-columns: ${new Array(20).fill(0).map(x => '60px ').join('')}">`;
      colors.map((color, index) => {
        const targetRGB = {r: color[0], g: color[1], b: color[2]};
        const targetHex = rgbToHex(targetRGB);

        htmlContent = htmlContent + `<div style="width: 60px; height: 60px; background-color: ${targetHex}"></div>`
      })
      htmlContent = htmlContent + `</div> Picked Colors (nearest) <div style="display: grid; grid-template-columns: ${new Array(20).fill(0).map(x => '60px ').join('')}">`

      // console.log(skmeans(colors, 5, "kmpp", 1000));
      colors.forEach((color) => {
        const targetRGB = {r: color[0], g: color[1], b: color[2]};
        const targetHex = rgbToHex(targetRGB);

        const referenceRGB = getClosestColorName(targetRGB);
        const referenceHex = rgbToHex(referenceColors[referenceRGB].rgb);
        result[targetHex] = referenceHex;
        htmlContent = htmlContent + `<div style="width: 60px; height: 60px; background-color: ${referenceHex}"></div>`
      });

      htmlContent += `</div>`

      http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        response.write(htmlContent);  
        response.end();
      }).listen(8000);
    })
    .then(() => {
      console.log(result);
    })
    .catch(err => { console.log(err) });
 });
*/

// https://stackoverflow.com/a/31844649
function getClosestColorName (targetRGB) {
  let closestColorSoFar = 'red';
  let closestDistanceSoFar = Number.MAX_SAFE_INTEGER;

  Object.keys(referenceColors).forEach(refColorName => {
    const refRGB = referenceColors[refColorName].rgb;
    const distance = labDistance(refRGB, targetRGB);
    if (distance < closestDistanceSoFar) {
      closestColorSoFar = refColorName;
      closestDistanceSoFar = distance;
    }
  });
  return closestColorSoFar;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
  return "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
}

function labDistance (rgb1, rgb2) {
  let labA = rgb2lab(rgb1);
  let labB = rgb2lab(rgb2);
  let deltaL = labA[0] - labB[0];
  let deltaA = labA[1] - labB[1];
  let deltaB = labA[2] - labB[2];
  let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  let deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  let sc = 1.0 + 0.045 * c1;
  let sh = 1.0 + 0.015 * c1;
  let deltaLKlsl = deltaL / (1.0);
  let deltaCkcsc = deltaC / (sc);
  let deltaHkhsh = deltaH / (sh);
  let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function rgb2lab(rgb){
  let {r, g, b} = rgb;
  r = r / 255, g = g / 255, b = b / 255;
  let x, y, z;
  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}
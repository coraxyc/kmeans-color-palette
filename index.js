import ColorThief from './node_modules/colorthief/dist/color-thief.mjs';
const colorThief = new ColorThief();

const referenceColors = {
  red: {rgb: { r: 226, g: 82, b: 65 }, hex: "#e25241"}, 
  orange: {rgb: { r: 242, g: 156, b: 56 }, hex: "#f29c38"}, 
  yellow: {rgb: { r: 253, g: 235, b: 96 }, hex: "#fdeb60"}, 
  green: {rgb: { r: 103, g: 172, b: 91 }, hex: "#67ac5b"}, 
  lightBlue: {rgb: { r: 82, g: 185, b: 209 }, hex: "#52b9d1"}, 
  blue: {rgb: { r: 69, g: 149, b: 236 }, hex: "#4595ec"}, 
  purple: {rgb: { r: 144, g: 52, b: 170 }, hex: "#9034aa"},
  pink: {rgb: { r: 215, g: 56, b: 100 }, hex: "#d73864"}, 
  white: {rgb: { r: 255, g: 255, b: 255 }, hex: "#ffffff"}, 
  grey: {rgb: { r: 158, g: 158, b: 158 }, hex: "#9e9e9e"}, 
  black: {rgb: { r: 0, g: 0, b: 0 }, hex: "#000000"}, 
  brown: {rgb: { r: 89, g: 65, b: 57 }, hex: "#594139"},
};

window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');
  const referenceColorsDiv = document.querySelector('.referenceColors');
  referenceColorsDiv.style.display = 'grid';
  referenceColorsDiv.style.gridTemplateColumns = new Array(20).fill(0).map(x => '50px ').join('');
  Object.keys(referenceColors).map(refColor => {
    const refRGB = referenceColors[refColor].rgb;
    const refHex = rgbToHex(refRGB);
    const refColorItem = document.createElement('div');
    refColorItem.classList.add('refColorItem');
    refColorItem.style.backgroundColor = refHex;
    referenceColorsDiv.appendChild(refColorItem);
  });

  const allColors = document.querySelector('.allColors');
  getMainAndMatchedColors().then(colorObjs => {
    console.log('creating web content...');
    const _idList = [];

    colorObjs.filter(p => p != undefined);
    colorObjs.map((colorObj, index) => {
      _idList.push(colorObj._id);
      fillColorRow(colorObj, index, allColors);
    });

    const updateAllDomColorsButton = document.createElement('button');
    updateAllDomColorsButton.innerText = 'Update All Dominant Colors';
    updateAllDomColorsButton.addEventListener('click', (e) => onAllRowUpdateDomColors(e, colorObjs));
    referenceColorsDiv.append(updateAllDomColorsButton);

    const updateAllMainColorsButton = document.createElement('button');
    updateAllMainColorsButton.innerText = 'Update All Main Colors';
    updateAllMainColorsButton.addEventListener('click', (e) => onAllRowUpdateMainColors(e, _idList));
    referenceColorsDiv.append(updateAllMainColorsButton);

    const fetchMainColorsButton = document.createElement('button');
    fetchMainColorsButton.innerText = 'Fetch Main Colors';
    fetchMainColorsButton.addEventListener('click', (e) => onFetchAllColors(e, _idList));
    referenceColorsDiv.append(fetchMainColorsButton);

    console.log('done');
  });
});

const onFetchAllColors = (e, _idList) => {
  e.preventDefault();
  console.log('fetching all colors...');
  _idList.map(_id => {
    fetch(`http://principle-gallery.ucsd.edu:8000/api/designs/${_id}`)
      .then(res => res.text())
      .then(text => JSON.parse(text))
      .then(designBody => {
        const mainColorHex = designBody.mainColor;
        document.querySelector(`#radio-${_id}-${getColorName(mainColorHex)}`).checked = true;
        // document.querySelector(`input[name="radio-${_id}"]:checked`).value = mainColor;
      });
  });
  console.log('finished fetching');
}

const getColorName = (colorHex) => {
  let refColorName = "";
  Object.keys(referenceColors).forEach((colorName) => {
    if (referenceColors[colorName].hex === colorHex) {
      refColorName = colorName;
    }
  });
  return refColorName;
}

function fillColorRow({_id, imageId, url, domRGB, mainRGB}, index, allColors) {
  const targetHex = rgbToHex(domRGB);
  const closestMatchedColorName = getClosestColorName(mainRGB);
  const colorRow = document.createElement('div');
  colorRow.id = _id;
  colorRow.classList.add('colorRow');
  colorRow.style.transition = '.4s';

  const indexSpan = document.createElement('span');
  indexSpan.style.padding = '20px';
  indexSpan.innerText = index;
  colorRow.appendChild(indexSpan);

  const indexSpan2 = document.createElement('span');
  indexSpan2.style.padding = '20px';
  indexSpan2.innerText = imageId;
  colorRow.appendChild(indexSpan2);

  const imageSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  imageSvg.id = `image${_id}`;
  imageSvg.setAttribute('width', '30');
  imageSvg.setAttribute('height', '30');
  imageSvg.style.paddingRight = '15px';

  imageSvg.innerHTML =
    `<rect width="30" height="30" style="fill:${targetHex};stroke-width:1;stroke:rgb(255,255,255);" />`
  colorRow.append(imageSvg);

  const poster = document.createElement('img');
  poster.classList.add('tooltipPoster');
  poster.src = url;
  poster.display = 'inline';
  poster.style.width = '50px';
  colorRow.append(poster);

  createRefColorRadioButtons(_id, closestMatchedColorName, colorRow);

  const button = document.createElement('button');
  button.innerText = "Update"
  button.addEventListener('click', (e) => onRowUpdateMainColor(e, _id));
  colorRow.appendChild(button);

  allColors.appendChild(colorRow);
}

const onAllRowUpdateDomColors = (e, colorObjs) => {
  e.preventDefault();
  console.log('updating dominant colors...');
  console.log(colorObjs[0]);
  colorObjs.map((colorObj) => {
    const _id = colorObj._id;
    const domColorHex = rgbToHex(colorObj.domRGB);
    const url = `http://principle-gallery.ucsd.edu:8000/api/designs/${_id}`;
    const params = JSON.stringify({dominantColor: domColorHex});
    const http = new XMLHttpRequest();
    http.open('PATCH', url);
    http.setRequestHeader('Content-type', 'application/json');
    http.send(params); // Make sure to stringify
  });
  console.log('done updating dominant colors');
}

/****/
const onAllRowUpdateMainColors = (e, _idList) => {
  _idList.forEach((_id) => {
    onRowUpdateMainColor(e, _id);
  });
}

const onRowUpdateMainColor = (e, _id) => {
  e.preventDefault();
  console.log('updating row...');
  const colorHex = document.querySelector(`input[name="radio-${_id}"]:checked`).value;
  console.log(`${colorHex} is checked`);
  const url = `http://principle-gallery.ucsd.edu:8000/api/designs/${_id}`;
  const params = JSON.stringify({mainColor: colorHex});
  const http = new XMLHttpRequest();
  http.open('PATCH', url);
  http.setRequestHeader('Content-type', 'application/json');
  http.send(params); // Make sure to stringify
}

const createRefColorRadioButtons = (_id, checkedColorName, colorRow) => {
  Object.keys(referenceColors).map((colorName) => {
    const colorHex = rgbToHex(referenceColors[colorName].rgb);
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.id = `radio-${_id}-${colorName}`;
    radioInput.name = `radio-${_id}`;
    radioInput.value = colorHex;
    radioInput.checked = checkedColorName === colorName;

    const rowLabel = document.createElement('label');
    rowLabel.htmlFor = `radio-${_id}`;
    document.createElement('svg'); // xlms
    const imageSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    imageSvg.setAttribute('width', '30');
    imageSvg.setAttribute('height', '30');
    imageSvg.style.paddingRight = '15px';
    imageSvg.innerHTML = 
      `<rect width="30" height="30" style="fill:${colorHex};stroke-width:1;stroke:rgb(0,0,0);" />`;

    rowLabel.appendChild(imageSvg);

    colorRow.appendChild(radioInput);
    colorRow.appendChild(rowLabel);
  });
}

const getDesignList = async () =>
  await fetch('http://principle-gallery.ucsd.edu:8000/api/designs')
    .then(res => res.text())
    .then(text => JSON.parse(text));

async function getImage(id) {
  return await fetch(`http://principle-gallery.ucsd.edu:8000/api/images/${id}`)
    .then(res => res.text())
    .then(text => JSON.parse(text))
    .then(obj => `http://${obj.url}`)
    .then(url => new Promise((resolve, reject) => {
      const posterImage = new Image();
      posterImage.crossOrigin = "Anonymous";
      posterImage.onload = () => 
        resolve({
          url: url,
          posterImage,
          width: posterImage.width, 
          height: posterImage.height
        });
      posterImage.onerror = reject;
      posterImage.src = url;
    }))
    .then(({url, posterImage}) => {
      return {url, posterImage}
    });
}

async function getMainAndMatchedColors() {
    const designList = await getDesignList();
    const idList = designList.map(design => ({
      _id: design._id,
      imageId: design.imageId
    }));
    const imageList = await Promise.allSettled(
      idList.map(async ({_id, imageId}) => {
        const {url, posterImage} = await getImage(imageId);
        return {
          _id,
          imageId,
          url,
          posterImage
        };
      })
    );

    console.log('imageList[0]');
    console.log(imageList[0]);
    console.log(imageList[0].value);
    console.log(imageList[0].value.imageId);
    const failedImageList = imageList
      .filter(p => p != undefined && p.status === 'rejected')
      .map(p => p.value.imageId);
    
    console.log('failed image list: ');
    console.log(failedImageList);

    const fulfilledImageList = imageList
      .filter(p => p != undefined && p.status === 'fulfilled');

    console.log('fulfilledImageList[1]');
    console.log(fulfilledImageList[1]);
    console.log(fulfilledImageList[1].value);
    let dominantColors = await Promise.allSettled(
      fulfilledImageList.map(async (promise) => {
        const domColor = 
        await colorThief.getColor(promise.value.posterImage);
        return { 
          _id: promise.value._id,
          imageId: promise.value.imageId,
          url: promise.value.url,
          image: promise.value.posterImage,
          rgbArray: domColor
        };
      })
    );

    console.log('dominantColors: ');
    console.log(dominantColors);
    const failedColorList = dominantColors
      .filter(p => p != undefined && p.status === 'rejected')
      .map(p => p.value.imageId);

    console.log('failed color list: ');
    console.log(failedColorList);

    console.log('finding main colors...');
  
    const fulfilledDomColors = dominantColors
      .filter(p => p !== undefined && p.status === 'fulfilled')
      .map(p => ({
        _id: p.value._id,
        imageId: p.value.imageId,
        url: p.value.url, 
        rgb: {
          r: p.value.rgbArray[0], 
          g: p.value.rgbArray[1], 
          b: p.value.rgbArray[2]
        }
      }));

    const matchedColors = fulfilledDomColors.map(({_id, imageId, url, rgb}) => {
      const referenceRGB = getClosestColorName(rgb);
      return { 
        _id,
        imageId,
        url, 
        domRGB: rgb, 
        mainRGB: referenceColors[referenceRGB].rgb 
      };
    });
    console.log(`${matchedColors.length} number of matched colors created`);
    return matchedColors;
}
/****/
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
const FormData = require('form-data');
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = 'http://localhost:8001';

function handleFormSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const formJSON = Object.fromEntries(data.entries());
  console.log(formJSON);
}

got(url).then(response => {
  const dom = new JSDOM(response.body);
  console.log(dom.window.document);
  const form = dom.window.document.querySelector('form');
  console.log(form);
  form.addEventListener('submit', handleFormSubmit);

}).catch(err => {
  console.log(err);
});
var http = require('http');
var url = require('url');
const { parse } = require('querystring');
var fs = require('fs');

// Load config
const config = require('./config/config.json');
const defaultConfig = config.development;
global.gConfig = defaultConfig;

// HTML structure
var header = '<!doctype html><html><head>';

var body = '</head><body><div id="container">' +
  '<div id="logo">' + global.gConfig.app_name + '</div>' +
  '<div id="space"></div>' +
  '<div id="form">' +
  '<form id="form" action="/" method="post"><center>' +
  '<label class="control-label">Name:</label>' +
  '<input class="input" type="text" name="name"/><br />' +
  '<label class="control-label">Ingredients:</label>' +
  '<input class="input" type="text" name="ingredients" /><br />' +
  '<label class="control-label">Prep Time:</label>' +
  '<input class="input" type="number" name="prepTimeInMinutes" /><br />';

var submitButton = '<button class="button button1">Submit</button></center></form></div>';
var endBody = '</div></body></html>';

http.createServer(function (req, res) {

  console.log('App starting...');
  console.log(req.url);

  if (req.url === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });

  // Load CSS
  var fileContents = fs.readFileSync('./public/default.css', { encoding: 'utf8' });
  res.write(header);
  res.write('<style>' + fileContents + '</style>');
  res.write(body);
  res.write(submitButton);

  let timeout = 0;

  // ============================
  // POST: Save Recipe
  // ============================
  if (req.method === 'POST') {
    timeout = 500;

    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk.toString();
    });

    req.on('end', () => {
      const qs = require('querystring');
      const post = qs.parse(bodyData);

      const myJSONObject = {
        name: post["name"],
        ingredients: post["ingredients"] ? post["ingredients"].split(',') : [],
        prepTimeInMinutes: post["prepTimeInMinutes"]
      };

      const options = {
        hostname: global.gConfig.webservice_host,
        port: global.gConfig.webservice_port,
        path: '/recipe',
        method: 'POST',
        timeout: 2000
      };

      const req2 = http.request(options, (resp) => {
        resp.on('data', () => { });

        resp.on('end', () => {
          console.log("Recipe saved (backend responded)");
        });
      });

      req2.on('error', (err) => {
        console.error('Backend POST failed:', err.message);

        res.write('<div id="space"></div>');
        res.write('<div id="logo">⚠️ Backend unavailable — recipe not saved</div>');
        res.write('<div id="space"></div>');
      });

      req2.setHeader('content-type', 'application/json');
      req2.write(JSON.stringify(myJSONObject));
      req2.end();

      // Show success immediately (non-blocking UX)
      res.write('<div id="space"></div>');
      res.write('<div id="logo">Recipe submitted!</div>');
      res.write('<div id="space"></div>');
    });
  }

  // ============================
  // GET: Fetch Recipes (safe)
  // ============================
  setTimeout(function () {

    const options = {
      hostname: global.gConfig.webservice_host,
      port: global.gConfig.webservice_port,
      path: '/recipes',
      method: 'GET',
      timeout: 2000
    };

    const backendReq = http.request(options, (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {

        res.write('<div id="space"></div>');
        res.write('<div id="logo">Your Previous Recipes</div>');
        res.write('<div id="space"></div>');
        res.write('<div id="results">');

        try {
          const recipes = JSON.parse(data);

          if (!recipes.length) {
            res.write('No recipes found.<br/>');
          } else {
            res.write('Name | Ingredients | PrepTime<br/><br/>');

            recipes.forEach(r => {
              res.write(`${r.name} | ${r.ingredients} | ${r.prepTimeInMinutes}<br/>`);
            });
          }

        } catch (e) {
          console.error('JSON parse failed:', e.message);
          res.write('<b>⚠️ Backend returned invalid data</b><br/>');
        }

        res.write('</div>');
        res.write('<div id="space"></div>');
        res.end(endBody);
      });
    });

    // Backend DOWN
    backendReq.on('error', (err) => {
      console.error('Backend GET failed:', err.message);

      res.write('<div id="space"></div>');
      res.write('<div id="logo">Your Previous Recipes</div>');
      res.write('<div id="space"></div>');
      res.write('<div id="results">');
      res.write('<b>⚠️ Backend service unavailable</b><br/>');
      res.write('Recipes cannot be loaded right now.<br/>');
      res.write('</div>');
      res.write('<div id="space"></div>');
      res.end(endBody);
    });

    backendReq.end();

  }, timeout);

}).listen(global.gConfig.exposedPort, () => {
  console.log(`Server running on port ${global.gConfig.exposedPort}`);
});
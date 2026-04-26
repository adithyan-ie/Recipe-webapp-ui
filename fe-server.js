var http = require('http');
var https = require('https');
var url = require('url');
const { parse } = require('querystring');
var fs = require('fs');

// Load config
const config = require('./config/config.json');
const defaultConfig = config.development;
global.gConfig = defaultConfig;

// HTML parts
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

var submitButton = '<button class="button button1">Submit</button></div></form>';
var endBody = '</div></body></html>';

// Helper: choose http or https
function getHttpClient() {
  return global.gConfig.webservice_port == "443" ? https : http;
}

http.createServer(function (req, res) {

  console.log('UI Server request:', req.url);

  if (req.url === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    return res.end();
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });

  // Load CSS
  try {
    var fileContents = fs.readFileSync('./public/default.css', { encoding: 'utf8' });
    res.write(header);
    res.write('<style>' + fileContents + '</style>');
  } catch (e) {
    console.error("CSS load failed:", e.message);
    res.write(header);
  }

  res.write(body);
  res.write(submitButton);

  let timeout = 0;

  // =========================
  // POST (save recipe)
  // =========================
  if (req.method === 'POST') {
    timeout = 1000;

    let bodyData = '';
    req.on('data', chunk => bodyData += chunk.toString());

    req.on('end', () => {
      try {
        const qs = require('querystring');
        var post = qs.parse(bodyData);

        var payload = {
          name: post["name"],
          ingredients: (post["ingredients"] || "").split(','),
          prepTimeInMinutes: post["prepTimeInMinutes"]
        };

        const client = getHttpClient();

        const options = {
          hostname: global.gConfig.webservice_host,
          port: global.gConfig.webservice_port,
          path: '/recipe',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const backendReq = client.request(options, (resp) => {
          resp.on('data', () => { });
          resp.on('end', () => {
            console.log("Recipe saved");
          });
        });

        backendReq.on('error', (err) => {
          console.error('POST backend failed:', err.message);
        });

        backendReq.write(JSON.stringify(payload));
        backendReq.end();

      } catch (e) {
        console.error("POST processing error:", e.message);
      }
    });
  }

  // =========================
  // GET (fetch recipes)
  // =========================
  setTimeout(function () {

    const client = getHttpClient();

    const options = {
      hostname: global.gConfig.webservice_host,
      port: global.gConfig.webservice_port,
      path: '/recipes',
      method: 'GET',
    };

    const backendReq = client.request(options, (resp) => {
      let data = '';

      resp.on('data', (chunk) => data += chunk);

      resp.on('end', () => {
        res.write('<div id="space"></div>');
        res.write('<div id="logo">Your Previous Recipes</div>');
        res.write('<div id="space"></div>');
        res.write('<div id="results">Name | Ingredients | PrepTime<br/></div>');

        try {
          const arr = JSON.parse(data);

          arr.forEach(item => {
            res.write(`${item.name} | ${item.ingredients} | ${item.prepTimeInMinutes}<br/>`);
          });

        } catch (e) {
          console.error('Parse error:', e.message);
          res.write('<div>No recipes available (backend issue)</div>');
        }

        res.end(endBody);
      });
    });

    backendReq.on('error', (err) => {
      console.error('GET backend failed:', err.message);

      res.write('<div id="space"></div>');
      res.write('<div id="logo">Backend unavailable</div>');
      res.write('<div id="space"></div>');
      res.write('<div>Recipes cannot be loaded right now.</div>');

      res.end(endBody);
    });

    backendReq.setTimeout(2000, () => {
      console.error("Backend timeout");
      backendReq.destroy();

      res.write('<div id="space"></div>');
      res.write('<div id="logo">Backend timeout</div>');
      res.write('<div id="space"></div>');

      res.end(endBody);
    });

    backendReq.end();

  }, timeout);

}).listen(process.env.PORT || process.env.WEBSITES_PORT || global.gConfig.exposedPort, () => {
  console.log(`Server running on port ${process.env.PORT || process.env.WEBSITES_PORT || global.gConfig.exposedPort}`);
});

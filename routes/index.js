var express = require('express');
var router = express.Router();
const puppeteer = require('puppeteer');

/* GET home page. */
router.post('/redirect-history', async function (req, res, next) {
  console.log(req.body.url);
  const redirects = await checkLink(req.body.url);
  res.send(redirects);
});

async function checkLink(urlToCheck) {
  const initialURL = urlToCheck;

  let browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();
  await page.setRequestInterception(true);
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36');
  let redirects = [];
  page.on('request', request => {
    if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
      request.abort();
    } else {
      if (request.url().startsWith("http://") || request.url().startsWith("https://")) {
        request.continue();
      }
    }
  });
  // page.on('requestfailed', (req, resp) => {
  //     let failureText = req.failure().errorText;
  //     if (failureText == 'net::ERR_ABORTED' || failureText == 'net::ERR_UNKNOWN_URL_SCHEME') {
  //         redirects[req.url()] = {
  //             url: req.url(),
  //             status: req.response() ? req.response().status() : 200
  //         }
  //     }
  // });
  page.on('response', response => {
    let responseHeaders = response.headers();
    if (response.request().url().startsWith("http://") || response.request().url().startsWith("https://")) {
      if (!redirects.find((redirect) => redirect.url == response.request().url())) {
        console.log('response ' + response.request().url());

        redirects.push({
          url: response.request().url(),
          status: response.status(),
          response: true
        })
      }
    }
  })
  try {
    var flag = true
    var loopCounter = 0;
    while (flag) {
      if (redirects.length) {
        url = redirects[redirects.length - 1].url
      } else {
        url = initialURL
      }
      var response = await page.goto(url, {
        timeout: 60000,
        waitUntil: ['domcontentloaded', 'networkidle0', 'networkidle2']
      });
      try {

        var statusCode = response.status();
        console.log(statusCode + '  ' + response);

        if (statusCode == 200 || (statusCode >= 300 && statusCode < 400)) {
          loopCounter = loopCounter + 1
      
          flag = true
        } else {
          flag = false
        }
      } catch (error) {
        console.log('ERROR----------------');
        console.log(error);
      }
      if (loopCounter > 25) {
        flag = false
      }
    }

  } catch (e) {
    console.log(e);
  }
  await page.close();
  await browser.close();
  return redirects;
}

module.exports = router;

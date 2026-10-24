import puppeteer from 'puppeteer-core';

async function testLive() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--user-data-dir=/tmp/chrome-test-profile']
  });
  const page = await browser.newPage();
  await page.goto('https://type-null-rho.vercel.app/', { waitUntil: 'networkidle0' });
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href,
      pathname: a.pathname
    }));
  });
  console.log('Links on landing page:\n', JSON.stringify(links, null, 2));

  // Find link to login or pre-validation
  const loginAnchor = await page.$('a[href$="/login"], a[href*="/login"]');
  if (loginAnchor) {
    console.log('\nFound login anchor. Clicking...');
    await loginAnchor.click();
    await new Promise(r => setTimeout(r, 1000));
    console.log('Current URL after clicking login:', page.url());
    console.log('H1:', await page.$eval('h1', el => el.innerText).catch(() => 'no h1'));
    console.log('Body snippet:\n', await page.evaluate(() => document.body.innerText.slice(0, 300)));
  }

  // Check if Supabase warning banner is displayed on Login page
  const noticeText = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('div[class*="amber"], div[class*="border-amber"]'));
    return alerts.map(a => a.innerText.trim());
  });
  console.log('Alert notices on page:', noticeText);

  await browser.close();
}

testLive().catch(console.error);

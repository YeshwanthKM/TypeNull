import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LIVE_URL = 'https://type-null-rho.vercel.app/';

async function inspectAuth() {
  const userDataDir = fs.mkdtempSync('/tmp/chrome-auth-');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
  });

  const page = await browser.newPage();
  await page.goto(LIVE_URL, { waitUntil: 'networkidle0' });

  // Navigate to login
  await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((el) => el.innerText.trim() === 'Sign In');
    if (a) a.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  console.log('Login URL:', page.url());
  const formFields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
    }));
  });
  console.log('Form inputs on Login page:', formFields);

  // Check register link
  const hasRegisterLink = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((el) => el.innerText.includes('Register'));
    return a ? { text: a.innerText, href: a.href } : null;
  });
  console.log('Register link:', hasRegisterLink);

  // Navigate to Register page
  if (hasRegisterLink) {
    await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find((el) => el.innerText.includes('Register'));
      if (a) a.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    console.log('Register URL:', page.url());
    const regInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select')).map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder || '',
      }));
    });
    console.log('Register inputs:', regInputs);
  }

  await browser.close();
}

inspectAuth().catch(console.error);

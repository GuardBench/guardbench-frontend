const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('Navigating to CloudFront URL...');
    await page.goto('https://d1fn0cbu5juq2i.cloudfront.net', { waitUntil: 'networkidle' });

    console.log('Clicking on Suites tab in sidebar...');
    await page.click('text=테스트 스위트');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot_suites.png' });

    console.log('Clicking on 스위트 만들기 button...');
    const buttonExists = await page.isVisible('button:has-text("스위트 만들기")');
    console.log('Button visible:', buttonExists);

    if (buttonExists) {
      await page.click('button:has-text("스위트 만들기")');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshot_modal.png' });
      
      const modalVisible = await page.isVisible('text=새 테스트 스위트 만들기');
      console.log('Modal visible after click:', modalVisible);
    }

    await browser.close();
  } catch (e) {
    console.error('Playwright Test Error:', e);
  }
})();

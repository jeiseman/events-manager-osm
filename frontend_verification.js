
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to the main events page
    console.log('Navigating to the main events page...');
    await page.goto('https://mafw.org/test/events/');
    await page.screenshot({ path: 'verification_output/events_page.png' });

    // Find the first event link and click it
    console.log('Finding and clicking the first event link...');
    const firstEventLink = await page.locator('.em-item-info h3 a').first();
    if (await firstEventLink.count() > 0) {
      await firstEventLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      console.log('Navigated to event page:', page.url());
      await page.screenshot({ path: 'verification_output/single_event_page.png' });

      // Check for the map container
      console.log('Checking for map container...');
      // The new JS logic uses '#em-osm-map' as the container.
      await page.waitForSelector('#em-osm-map', { timeout: 10000 });
      const mapContainer = await page.locator('#em-osm-map');

      if (await mapContainer.count() > 0 && await mapContainer.isVisible()) {
        console.log('Map container found and is visible!');
        await page.screenshot({ path: 'verification_output/frontend_screenshot_success.png' });
        console.log('Successfully captured screenshot of the map.');
      } else {
        const isVisible = await mapContainer.isVisible();
        const count = await mapContainer.count();
        console.error(`Map container not found or not visible! Count: ${count}, IsVisible: ${isVisible}`);
        const pageHtml = await page.content();
        fs.writeFileSync('verification_output/frontend_error.html', pageHtml);
        await page.screenshot({ path: 'verification_output/frontend_screenshot_error.png' });
      }
    } else {
      console.error('No event links found on the events page.');
      const pageHtml = await page.content();
      fs.writeFileSync('verification_output/frontend_error.html', pageHtml);
      await page.screenshot({ path: 'verification_output/frontend_screenshot_error.png' });
    }
  } catch (error) {
    console.error(error);
    await page.screenshot({ path: 'verification_output/frontend_screenshot_error.png' });
  } finally {
    await browser.close();
  }
})();


const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Log in
    console.log('Navigating to login page...');
    await page.goto('https://mafw.org/test/wp-login.php');
    await page.screenshot({ path: 'verification_output/login_page.png' });

    console.log('Filling login credentials...');
    await page.fill('#user_login', 'jules');
    await page.fill('#user_pass', 'jules');
    await page.screenshot({ path: 'verification_output/login_filled.png' });

    console.log('Clicking login button...');
    await page.click('#wp-submit');

    console.log('Waiting for admin dashboard URL...');
    await page.waitForURL('**/wp-admin/**', { timeout: 60000 }); // Wait for navigation to the admin area

    console.log('Successfully logged in. Current URL:', page.url());
    await page.screenshot({ path: 'verification_output/after_login_success.png' });

    // Go to the Events Manager settings page
    console.log('Navigating to admin settings page...');
    await page.goto('https://mafw.org/test/wp-admin/edit.php?post_type=event&page=events-manager-options');
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'verification_output/settings_page_after_nav.png' });

    // Save the HTML for debugging
    const settingsPageHtml = await page.content();
    fs.writeFileSync('verification_output/settings_page.html', settingsPageHtml);

    // Open the "Google Maps and Location Services" section
    await page.click('#em-opt-google-maps h3');

    // Wait for the section to expand
    await page.waitForSelector('#dbem_gmap_type');

    // Select "OpenStreetMap"
    await page.selectOption('#dbem_gmap_type', 'osm');

    // Save the settings
    await page.click('input[name="Submit"]');
    await page.waitForNavigation();

    // Go to an event page (replace with an actual event URL)
    await page.goto('https://mafw.org/test/events/continental-automotive-systems/');

    // Check if the OpenStreetMap container is present
    const mapContainer = await page.locator('#em-location-map-container');
    if (await mapContainer.count() > 0) {
      console.log('Map container found!');
      await page.screenshot({ path: 'verification_output/screenshot.png' });
    } else {
      console.error('Map container not found!');
      await page.screenshot({ path: 'verification_output/screenshot_error.png' });
    }
  } catch (error) {
    console.error(error);
    await page.screenshot({ path: 'verification_output/error_screenshot.png' });
  } finally {
    await browser.close();
  }
})();

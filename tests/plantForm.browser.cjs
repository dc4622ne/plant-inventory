// Run against a local Vite server: PLANT_FORM_URL defaults to http://127.0.0.1:5187.
// Start Vite with VITE_SUPABASE_URL=http://127.0.0.1:5187, VITE_SUPABASE_ANON_KEY=test-key,
// and VITE_DATABASE_ENABLED/VITE_AUTH_ENABLED/VITE_REALTIME_ENABLED=false.
// Then run: node tests/plantForm.browser.cjs
// Requires Playwright (PLAYWRIGHT_MODULE can point to a bundled installation).
// Uses isolated storage and intercepts external requests; never writes to a live backend.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const url = process.env.PLANT_FORM_URL || 'http://127.0.0.1:5187';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const imageUrl = `${url}/test-plant.png`;
const artifacts = process.env.PLANT_FORM_ARTIFACTS || 'tmp/task6-layout';
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => {
        const request = route.request();
        if (request.url().endsWith('/test-plant.png') || request.resourceType() === 'image')
          return route.fulfill({ contentType: 'image/png', body: png });
        if (request.url().includes('/storage/v1/')) return route.fulfill({ contentType: 'application/json', body: '{}' });
        if (!request.url().startsWith(url)) return route.fulfill({ contentType: 'application/json', body: '{}' });
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.evaluate(() => { localStorage.clear(); localStorage.setItem('plant-inventory-plants', '[]'); });
      await page.reload();
      await page.getByRole('button', { name: '+ Add New Plant', exact: true }).click();
      const form = page.locator('.plant-form-long');
      async function layout(name, withImage) {
        const geometry = await form.evaluate(form => {
          const rect = selector => {
            const r = form.querySelector(selector).getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
          };
          const image = form.querySelector('.plant-image-section');
          return { imageOutsideGrid: !image.closest('.form-grid'), image: rect('.plant-image-section'),
            name: rect('#plant-name'), propagation: rect('#plant-propagationStatus'), price: rect('#plant-purchasePrice'),
            genus: rect('#plant-genus'), species: rect('#plant-species'), type: rect('#plant-type'),
            controls: [...form.querySelectorAll('.new-option-row input, .new-option-row button')].map(el => {
              const r=el.getBoundingClientRect(); return { x:r.x, right:r.right, height:r.height };
            }), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.ok(geometry.imageOutsideGrid);
        assert.ok(geometry.image.y >= geometry.price.bottom);
        assert.ok(geometry.genus.y >= geometry.image.bottom);
        assert.equal(geometry.overflow, false, `${name} at ${width}: page overflow`);
        for (const control of geometry.controls) {
          assert.ok(control.x >= 0 && control.right <= width, `${name}: option overflow`);
          if (width < 600) assert.ok(control.height >= 44, `${name}: touch target ${control.height}`);
        }
        if (width > 1000) {
          assert.equal(geometry.name.y, geometry.propagation.y);
          assert.equal(geometry.name.y, geometry.price.y);
          assert.equal(geometry.genus.y, geometry.species.y);
          assert.equal(geometry.genus.y, geometry.type.y);
          assert.ok(geometry.image.width > geometry.genus.width * 2.9);
        }
        assert.equal(await form.getByAltText('Selected preview').count(), withImage ? 1 : 0);
        await form.screenshot({ path: `${artifacts}/${width}-${name}.png` });
        return geometry;
      }
      await page.locator('#plant-name').fill(`Layout ${width}`);
      const without = await layout('add-no-image', false);
      await page.locator('#plant-image-url').fill(imageUrl);
      await form.getByAltText('Selected preview').waitFor();
      await page.waitForFunction(() => document.querySelector('.plant-image-section img')?.naturalWidth > 0);
      const withPreview = await layout('add-image', true);
      assert.equal(without.name.height, withPreview.name.height);
      assert.equal(without.genus.height, withPreview.genus.height);
      const soilField = page.locator('#plant-soilMix').locator('..');
      await soilField.getByPlaceholder('Add new option').fill('  Bark and pumice  ');
      await soilField.getByRole('button', { name: 'Add option', exact: true }).click();
      assert.equal(await page.locator('#plant-soilMix').inputValue(), 'Bark and pumice');
      assert.equal(await soilField.getByPlaceholder('Add new option').inputValue(), '');
      assert.equal(await page.locator('option[value="__custom__"]').count(), 0);
      await form.getByRole('button', { name: 'Add Plant & Close', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      let plants = await page.evaluate(() => JSON.parse(localStorage.getItem('plant-inventory-plants')));
      assert.equal(plants[0].soilMix, 'Bark and pumice');
      assert.equal(plants[0].imageUrl, imageUrl);
      // Seed legacy Other through isolated storage, then exercise a real Edit/save/reload.
      await page.evaluate(() => {
        const plants = JSON.parse(localStorage.getItem('plant-inventory-plants'));
        plants[0].soilMix = 'Other'; localStorage.setItem('plant-inventory-plants', JSON.stringify(plants));
      });
      await page.reload();
      await page.getByRole('button', { name: 'View lifetime collection →', exact: true }).click();
      await page.getByText(`Layout ${width}`, { exact: true }).first().click();
      await page.getByRole('button', { name: 'Edit plant', exact: true }).click();
      assert.equal(await page.locator('#plant-soilMix').inputValue(), 'Other');
      assert.equal(await page.locator('#plant-soilMix option[value="Bark and pumice"]').count(), 1);
      await layout('edit-image', true);
      await form.locator('.form-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      plants = await page.evaluate(() => JSON.parse(localStorage.getItem('plant-inventory-plants')));
      assert.equal(plants[0].soilMix, 'Other');
      assert.equal(plants[0].imageUrl, imageUrl);
      await page.getByRole('button', { name: 'Edit plant', exact: true }).click();
      await form.getByRole('button', { name: 'Remove image', exact: true }).click();
      await layout('edit-no-image', false);
      await page.locator('#plant-image-file').setInputFiles({ name: 'plant.png', mimeType: 'image/png', buffer: png });
      await form.getByAltText('Selected preview').waitFor();
      await page.waitForFunction(() => document.querySelector('.plant-image-section img')?.naturalWidth > 0);
      assert.ok((await form.innerText()).includes('Selected: plant.png'));
      await layout('edit-device-preview', true);
      await soilField.getByPlaceholder('Add new option').fill('Fern substrate');
      await soilField.getByRole('button', { name: 'Add option', exact: true }).click();
      assert.equal(await page.locator('#plant-soilMix').inputValue(), 'Fern substrate');
      await page.locator('#plant-soilMix').selectOption('Other');
      await form.locator('.form-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      plants = await page.evaluate(() => JSON.parse(localStorage.getItem('plant-inventory-plants')));
      assert.ok(plants[0].imageUrl.includes('/storage/v1/object/public/plant-images/plants/'));
      await page.getByRole('button', { name: 'Edit plant', exact: true }).click();
      await form.getByAltText('Selected preview').waitFor();
      assert.equal(await page.locator('#plant-soilMix option[value="Fern substrate"]').count(), 1);
      await form.getByRole('button', { name: 'Remove image', exact: true }).click();
      assert.equal(await form.getByAltText('Selected preview').count(), 0);
      await form.locator('.form-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      plants = await page.evaluate(() => JSON.parse(localStorage.getItem('plant-inventory-plants')));
      assert.equal(plants[0].imageUrl, '');
      assert.equal(plants[0].soilMix, 'Other');
      await page.getByRole('button', { name: 'Edit plant', exact: true }).click();
      await layout('edit-saved-no-image', false);
      // Existing inline images and legacy recipe aliases must survive an unrelated save.
      await page.reload();
      await page.evaluate(() => {
        const plants = JSON.parse(localStorage.getItem('plant-inventory-plants'));
        plants[0].imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
        plants[0].soilMix = 'Semi-Hydro / LECA';
        localStorage.setItem('plant-inventory-plants', JSON.stringify(plants));
      });
      await page.reload();
      await page.getByRole('button', { name: 'View lifetime collection →', exact: true }).click();
      await page.getByText(`Layout ${width}`, { exact: true }).first().click();
      await page.getByRole('button', { name: 'Edit plant', exact: true }).click();
      assert.equal(await page.locator('#plant-soilMix').inputValue(), 'semi-hydro');
      assert.equal(await page.locator('#plant-image-url').inputValue(), '');
      await form.getByAltText('Selected preview').waitFor();
      await form.locator('.form-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
      await form.waitFor({ state: 'hidden' });
      plants = await page.evaluate(() => JSON.parse(localStorage.getItem('plant-inventory-plants')));
      assert.equal(plants[0].soilMix, 'Semi-Hydro / LECA');
      assert.equal(plants[0].imageUrl, `data:image/png;base64,${png.toString('base64')}`);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px Add/Edit: alignment, overflow, touch targets, custom options, Other, URL save, file upload/save/preview/removal, legacy inline images and recipe aliases, persistence`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
const root='http://127.0.0.1:4173';
const search=JSON.parse(await readFile(new URL('../../site-dist/search-index.json',import.meta.url),'utf8'));

test('all 37 pages work on desktop and mobile, with no overflow or axe violations', async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    for(const entry of search) {
      const response=await page.goto(root+entry.url);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(axe.violations,`${entry.url} at ${viewport.width}`).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test('keyboard search supports shortcut, arrow navigation, Enter, Escape and focus restoration',async({page})=>{
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('/');
  await expect(page.locator('#search-input')).toBeFocused();
  await page.locator('#search-input').fill('mai-batch');
  await expect(page.locator('#search-results a').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#search-results a').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/reference\/mai-batch\/$/);
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-open')).toBeFocused();
  await page.locator('#search-open').click();
  await page.locator('#search-input').fill('no-such-query-zzzz');
  await expect(page.locator('#search-status')).toContainText('No results');
});

test('examples copy actual code, and mobile menu opens and closes with Escape',async({page})=>{
  await page.goto('guide/installation/');
  const block=page.locator('.code-block').first();
  const text=await block.locator('code').textContent();
  await block.getByRole('button').click();
  await expect(block.getByRole('button')).toHaveText('Copied');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(text);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#sidebar a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#menu-toggle')).toBeFocused();
});

test('search dialog is accessible',async({page})=>{
  await page.goto('./');
  await page.locator('#search-open').click();
  await page.locator('#search-input').fill('Python');
  await expect(page.locator('#search-results a').first()).toBeVisible();
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('search reports an index failure and can retry without reloading',async({page})=>{
  let attempts=0;
  await page.route('**/search-index.json',async route=>{
    attempts++;
    if(attempts===1) await route.abort();
    else await route.continue();
  });
  await page.goto('./');
  await page.locator('#search-open').click();
  await expect(page.locator('#search-status')).toContainText('Search could not load');
  await page.keyboard.press('Escape');
  await page.locator('#search-open').click();
  await page.locator('#search-input').fill('mai-python');
  await expect(page.locator('#search-results a').first()).toHaveAttribute('href','/mAI-skills/reference/mai-python/');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#search-results a').last()).toBeFocused();
});

test('clipboard denial selects the example and announces manual copy',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}}));
  await page.goto('guide/installation/');
  const block=page.locator('.code-block').first();
  const text=await block.locator('code').textContent();
  await block.getByRole('button').click();
  await expect(page.locator('#copy-status')).toContainText('Example selected');
  expect(await page.evaluate(()=>window.getSelection().toString())).toBe(text);
});

import { test } from 'node:test'
import { browserApp } from '../../../scripts/browser/helpers.mjs'
test('diagnose gallery review control and preview geometry', async t => {
  const page = await browserApp(t, { reducedMotion: 'no-preference', viewport: {width:390,height:664} })
  const url = new URL(page.url()); url.search='?art'; await page.goto(url.href)
  const review=page.locator('.motion-review')
  await review.getByRole('heading',{name:'Deterministic motion review'}).waitFor()
  await page.clock.install(); await page.clock.pauseAt(Date.now()+1000)
  await review.getByRole('button',{name:'Play',exact:true}).click()
  const measure=()=>page.evaluate(()=>({time:document.querySelector('[aria-label=\"Elapsed milliseconds\"]')?.value, previews:(()=>{const r=document.querySelector('.motion-review-previews').getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight}})(),status:document.querySelector('.motion-review fieldset p')?.textContent}))
  t.diagnostic(JSON.stringify({afterPlay:await measure()}))
  await page.clock.runFor(128)
  t.diagnostic(JSON.stringify({beforeScroll:await measure()}))
  await review.locator('.motion-review-previews').scrollIntoViewIfNeeded()
  await page.waitForFunction(()=>!document.querySelector('.motion-review').textContent.includes('Waiting for preview visibility'))
  await page.clock.runFor(128)
  t.diagnostic(JSON.stringify({afterScroll:await measure()}))
})

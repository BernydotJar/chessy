const {chromium}=require('playwright');
const fs=require('node:fs/promises');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'progress/evidence/browser');
const ORIGIN='http://localhost:4317';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm'};
(async()=>{
 await fs.mkdir(OUT,{recursive:true});
 const browser=await chromium.connectOverCDP(process.env.CHROME_CDP_URL||'http://192.168.65.254:9222');
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-GT',reducedMotion:'reduce'});
 const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.route(ORIGIN+'/**',async route=>{
  const name=decodeURIComponent(new URL(route.request().url()).pathname);const relative=name==='/'?'index.html':name.slice(1);
  const file=path.resolve(ROOT,'dist',relative);
  if(!file.startsWith(path.join(ROOT,'dist')+path.sep)){await route.fulfill({status:403});return;}
  try{await route.fulfill({status:200,body:await fs.readFile(file),contentType:MIME[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}
 });
 try{
  await page.goto(ORIGIN,{waitUntil:'networkidle'});await page.locator('h1').waitFor();
  await page.screenshot({path:path.join(OUT,'home-desktop.png'),fullPage:true});
  console.log('HOME',await page.locator('h1').innerText());
  console.log('LANG',await page.locator('html').getAttribute('lang'));
  await page.getByRole('navigation').getByRole('link',{name:'Academia',exact:true}).click();
  await page.getByRole('button',{name:/Lee el tablero/}).click();
  await page.getByRole('button',{name:'A Alfil',exact:true}).click();
  console.log('WRONG QUIZ',await page.getByRole('status').innerText());
  await page.getByRole('button',{name:'B Caballo',exact:true}).click();
  console.log('RIGHT QUIZ',await page.getByRole('status').innerText());
  await page.getByRole('button',{name:'Volver a la academia',exact:true}).first().click();
  await page.screenshot({path:path.join(OUT,'academy-desktop.png'),fullPage:true});
  await page.getByRole('navigation').getByRole('link',{name:'Retos',exact:true}).click();
  await page.screenshot({path:path.join(OUT,'challenge-desktop.png'),fullPage:true});
  await page.getByLabel('Tu jugada',{exact:true}).fill('a1a5');await page.getByRole('button',{name:'Jugar',exact:true}).click();
  console.log('CHALLENGE',await page.getByRole('status').innerText());
  console.log('PROGRESS',await page.evaluate(()=>localStorage.getItem('chessy-learning-v1')));
  await page.setViewportSize({width:390,height:844});
  await page.goto(ORIGIN+'/#/home',{waitUntil:'networkidle'});
  await page.screenshot({path:path.join(OUT,'home-mobile.png'),fullPage:true});
  console.log('MOBILE',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
  await page.goto(ORIGIN+'/#/play',{waitUntil:'networkidle'});await page.waitForTimeout(500);
  await page.screenshot({path:path.join(OUT,'play-mobile.png'),fullPage:true});
  console.log('PLAY MOBILE',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
  console.log('ERRORS',JSON.stringify(errors));
 }finally{await fs.writeFile(path.join(OUT,'smoke-errors.json'),JSON.stringify(errors,null,2));await context.close();}
 process.exit(errors.length?1:0);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

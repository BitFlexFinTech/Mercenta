#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'forensic-captures');
const BASE_URL = 'https://demo.mercenta.co.uk';

const VP = {
  'desktop-xl':{width:1920,height:1080},'desktop-lg':{width:1440,height:900},
  'desktop-md':{width:1280,height:800},'laptop':{width:1024,height:768},
  'tablet':{width:768,height:1024},'mobile-lg':{width:390,height:844},
  'mobile-sm':{width:375,height:812},
};

const BNAV = ['overview','onboarding','contracts','purchase_orders','catalog','logistics','compliance','returns','analytics','market','reports','documents','team','social','settings'];
const ANAV = ['overview','crm','fulfillment_track','retail_pipeline','purchase_orders_admin','logistics','catalog','compliance','billing','contracts_admin','messages','helpdesk','returns_tracking','monitoring','marketing','brand_intelligence','super_admin','audit_log','integrations','usertour','postiz','whatsapp'];
/* §P9 (programme decision 4) — REPOINTED: `const CNAV = ['manifest','bak','auditor']`
   is REMOVED with the carrier portal it enumerated, and `'carriers'` is removed from
   ANAV above because the admin Carrier Monitor destination no longer exists. */

function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

async function shot(page,group,name,fullPage){
  const dir=path.join(OUT_DIR,group);mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,slug(name)+'.png'),fullPage});
  console.log('  [CAPTURE] '+group+'/'+slug(name)+'.png');
}

async function clickNav(page,label){
  const exact=page.locator('nav button,nav a').filter({hasText:new RegExp(label.replace(/[.*+?${}()|[\]\\]/g,'\\$&'),'i')}).first();
  const broad=page.locator('text='+label).first();
  for(const el of [exact,broad]){
    if(await el.isVisible({timeout:1500}).catch(()=>false)){await el.click();await page.waitForTimeout(1200);return true}
  }
  return false;
}

async function signOut(page){
  const so=page.locator('text=Sign Out,text=Logout,text=Log out').first();
  if(await so.isVisible({timeout:1500}).catch(()=>false)){await so.click();await page.waitForTimeout(1000);}
}

async function goHome(page){
  await page.goto(BASE_URL,{waitUntil:'networkidle',timeout:30000});await page.waitForTimeout(500);
}

async function goLogin(page){
  await goHome(page);
  const pl=page.locator('text=Partner Login').first();
  if(await pl.isVisible({timeout:3000}).catch(()=>false)){await pl.click();await page.waitForTimeout(1500);}
}

async function run(){
  console.log('======= MERCENTA VISUAL FORENSIC AUDIT =======');
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({userAgent:'Mozilla/5.0'});
  const page=await context.newPage();

  // 1. MARKETING
  console.log('\n=== MARKETING ===');
  for(const [vp,size] of Object.entries(VP)){
    await page.setViewportSize(size);await goHome(page);
    await shot(page,'01-marketing','homepage-'+vp,false);
  }
  await page.setViewportSize(VP['desktop-lg']);
  await goHome(page);
  await shot(page,'01-marketing','homepage-full-desktop',true);

  // 2. AUTH
  console.log('\n=== AUTH ===');
  await page.setViewportSize(VP['desktop-lg']);
  await goLogin(page);
  await shot(page,'02-authentication','login-screen-full',true);

  const ra=page.locator('text=Request Partner Access').first();
  if(await ra.isVisible({timeout:2000}).catch(()=>false)){
    await ra.click();await page.waitForTimeout(800);
    await shot(page,'02-authentication','application-form',true);
    await page.fill('input[placeholder*="registered business name"]','Test Brand Ltd');
    await page.fill('input[placeholder*="Zimbabwe"]','United Kingdom');
    await page.locator('text=Submit Application').click();await page.waitForTimeout(800);
    await shot(page,'02-authentication','application-validation-error',true);
  }

  let bl=page.locator('text=Back to Login').first();
  if(await bl.isVisible({timeout:1500}).catch(()=>false)){await bl.click();await page.waitForTimeout(1000);}

  // 3. BRAND PORTAL
  console.log('\n=== BRAND PORTAL ===');
  const fb=page.locator('text=Astonish Organic').first();
  if(await fb.isVisible({timeout:2000}).catch(()=>false)){
    await fb.click();await page.waitForTimeout(2000);
    await shot(page,'03-brand','brand-dashboard-desktop-lg',false);

    for(const item of BNAV){
      console.log('  brand: '+item);
      if(!await clickNav(page,item.replace(/_/g,' ')))console.log('  [SKIP] '+item);
      else await shot(page,'03-brand','brand-'+item+'-desktop-lg',false);
    }

    await clickNav(page,'Dashboard');
    for(const [vp,size] of Object.entries(VP)){
      if(vp==='desktop-lg')continue;
      await page.setViewportSize(size);await page.waitForTimeout(500);
      await shot(page,'03-brand-responsive','brand-dashboard-'+vp,false);
    }
  }

  // 4. ADMIN PORTAL
  console.log('\n=== ADMIN PORTAL ===');
  await signOut(page);
  await goLogin(page);

  const sa=page.locator('text=Super Admin').first();
  if(await sa.isVisible({timeout:3000}).catch(()=>false)){
    await sa.click();await page.waitForTimeout(2000);
    await shot(page,'04-admin','admin-dashboard-desktop-lg',false);

    for(const item of ANAV){
      console.log('  admin: '+item);
      if(!await clickNav(page,item.replace(/_/g,' ')))console.log('  [SKIP] '+item);
      else await shot(page,'04-admin','admin-'+item+'-desktop-lg',false);
    }

    await clickNav(page,'Brand CRM');
    await shot(page,'04-admin-states','crm-list-view',false);

    // Responsive dashboard
    await clickNav(page,'Overview');
    for(const [vp,size] of Object.entries(VP)){
      if(vp==='desktop-lg')continue;
      await page.setViewportSize(size);await page.waitForTimeout(500);
      await shot(page,'04-admin-responsive','admin-dashboard-'+vp,false);
    }
  }

  /* §P9 (programme decision 4) — THE CARRIER PORTAL SCREENSHOT PASS IS REMOVED.
     The old block signed out, logged in as "3PL Carrier", shot
     `carrier-dashboard-desktop-lg` and walked CNAV (`manifest`/`bak`/`auditor`).
     There is no carrier login, no carrier shell and no carrier views, so the
     capture set now ends at the admin surfaces — the carrier console is captured
     as part of the ADMIN Logistics Hub (step 4) instead. */

  // 6. FORM STATES
  console.log('\n=== FORM STATES ===');
  await signOut(page);
  await goLogin(page);
  const ra2=page.locator('text=Request Partner Access').first();
  if(await ra2.isVisible({timeout:2000}).catch(()=>false)){
    await ra2.click();await page.waitForTimeout(500);
    await shot(page,'06-form-states','application-form-empty',false);
    await page.fill('input[placeholder*="registered business name"]','Premium Foods Ltd');
    await page.fill('input[placeholder*="Zimbabwe"]','Ghana');
    await page.fill('input[placeholder*="email"]','info@premiumfoods.com');
    await page.waitForTimeout(300);
    await shot(page,'06-form-states','application-form-filled',false);
    await page.locator('text=Submit Application').click();await page.waitForTimeout(500);
    await shot(page,'06-form-states','application-form-validation',false);
    await page.fill('input[placeholder*="https://your-company.com"]','https://premiumfoods.com');
    await page.locator('text=Submit Application').click();await page.waitForTimeout(1500);
    await shot(page,'06-form-states','application-success',false);
  }

  // 7. NOTIFICATIONS
  console.log('\n=== NOTIFICATIONS ===');
  const bl2=page.locator('text=Back to Login').first();
  if(await bl2.isVisible({timeout:1500}).catch(()=>false)){await bl2.click();await page.waitForTimeout(1000);}
  const zb=page.locator('text=Astonish Organic').first();
  if(await zb.isVisible({timeout:2000}).catch(()=>false)){
    await zb.click();await page.waitForTimeout(2000);
    const nb=page.locator('[class*="bell"],[class*="notification"],[class*="Notif"]').first();
    if(await nb.isVisible({timeout:1500}).catch(()=>false)){
      await nb.click();await page.waitForTimeout(800);
      await shot(page,'07-notifications','notification-dropdown',false);
    }
  }

  // 8. RESPONSIVE SIDEBAR
  console.log('\n=== RESPONSIVE SIDEBAR ===');
  await signOut(page);
  await goLogin(page);
  const sa2=page.locator('text=Super Admin').first();
  if(await sa2.isVisible({timeout:3000}).catch(()=>false)){
    await sa2.click();await page.waitForTimeout(1500);
    await page.setViewportSize(VP['tablet']);await page.waitForTimeout(500);
    await shot(page,'08-navigation','admin-sidebar-tablet',false);
    await page.setViewportSize(VP['mobile-lg']);await page.waitForTimeout(500);
    await shot(page,'08-navigation','admin-sidebar-mobile',false);
  }

  await browser.close();
  console.log('\n=============== CAPTURE COMPLETE ===============');
}
run().catch(console.error);

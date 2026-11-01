import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let bundle;
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',aud:'authenticated',role:'authenticated'};
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'signature'].join('.');
test.beforeAll(async()=>{const result=await build({entryPoints:['src/app.js'],bundle:true,write:false,plugins:[{name:'test-config',setup(b){b.onLoad({filter:/src\/config.js$/},()=>({contents:"export const supabaseUrl='https://test.supabase.co'; export const supabasePublishableKey='sb_publishable_test';",loader:'js'}));}}]});bundle=result.outputFiles[0].text;});
async function setup(page,{failWrites=false}={}){
 const rows=[];
 await page.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
 await page.route('https://test.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(url.pathname.endsWith('/token'))return json({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user});
 if(url.pathname.endsWith('/user'))return json(user);
 if(url.pathname.endsWith('/logout'))return json({});
 if(url.pathname==='/rest/v1/notes'){
  if(req.method()==='GET')return json(rows);
  if(failWrites)return json({code:'42501',message:'denied'},403);
  if(req.method()==='POST'){
   const body=req.postDataJSON();for(const n of Array.isArray(body)?body:[body])if(!rows.some(x=>x.id===n.id))rows.push({...n,revision:1});
   return json(rows,201);
  }
  const id=url.searchParams.get('id')?.slice(3),revision=Number(url.searchParams.get('revision')?.slice(3));
  const index=rows.findIndex(x=>x.id===id&&x.revision===revision);
  if(index<0)return json([]);
  if(req.method()==='PATCH'){rows[index]={...rows[index],...req.postDataJSON(),revision:revision+1};return json([rows[index]]);}
  if(req.method()==='DELETE')return json(rows.splice(index,1));
 }
 return json({});
 });
 await page.goto('/');return rows;
}
async function login(page){await page.locator('#account').click();await page.locator('#email').fill(user.email);await page.locator('#password').fill('a-long-test-password');await page.locator('#auth-form button[type=submit]').click();await expect(page.locator('#account')).toHaveText(user.email);await expect(page.locator('#sync-status')).toContainText('Oppdatert');}
async function note(page,title){await page.locator('#new-note').click();await page.locator('#title').fill(title);await page.locator('#body').fill('Dette skal bevares.');await page.locator('#note-form button[type=submit]').click();}
test('lokale notater overlever omlasting, filtreres og gjengis som tekst',async({page})=>{await setup(page);await note(page,'<img src=x onerror=alert(1)>');await expect(page.locator('.note h3')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.note img')).toHaveCount(0);await page.reload();await expect(page.locator('.note')).toHaveCount(1);await page.locator('#search').fill('finnes ikke');await expect(page.locator('.note')).toHaveCount(0);});
test('innlogging, lagring, redigering og sletting på kontoen',async({page})=>{const rows=await setup(page);await login(page);await note(page,'Sky-notat');await expect(page.locator('.note h3')).toHaveText('Sky-notat');expect(rows).toHaveLength(1);await page.locator('.note').click();await page.locator('#title').fill('Oppdatert');await page.locator('#note-form button[type=submit]').click();await expect(page.locator('.note h3')).toHaveText('Oppdatert');page.on('dialog',d=>d.accept());await page.locator('.note').click();await page.locator('#delete').click();await expect(page.locator('.note')).toHaveCount(0);});
test('lokale notater kopieres uten duplikater og beholdes ved utlogging',async({page})=>{const rows=await setup(page);await note(page,'Lokalt');await login(page);await expect(page.locator('.note')).toHaveCount(0);page.on('dialog',d=>d.accept());await page.locator('#migrate').click();await expect(page.locator('.note')).toHaveCount(1);await page.locator('#migrate').click();await expect(page.locator('#migrate')).toBeEnabled();expect(rows).toHaveLength(1);await page.locator('#logout').click();await expect(page.locator('#sync-status')).toContainText('Lokale notater');await expect(page.locator('.note h3')).toHaveText('Lokalt');});
test('mislykket lagring beholder teksten i editoren',async({page})=>{await setup(page,{failWrites:true});await login(page);await note(page,'Må ikke forsvinne');await expect(page.locator('#editor')).toBeVisible();await expect(page.locator('#title')).toHaveValue('Må ikke forsvinne');await expect(page.locator('#notice')).toContainText('mangler tilgang');});
test('samtidig endring overskrives ikke',async({page})=>{const rows=await setup(page);await login(page);await note(page,'Før');await page.locator('.note').click();rows[0].revision++;rows[0].title='Endret på mobil';await page.locator('#title').fill('Endret på PC');await page.locator('#note-form button[type=submit]').click();await expect(page.locator('#editor')).toBeVisible();await expect(page.locator('#notice')).toContainText('annen enhet');expect(rows[0].title).toBe('Endret på mobil');});
test('mobilvisning får ikke vannrett rulling',async({page})=>{await page.setViewportSize({width:390,height:844});await setup(page);await note(page,'Min mobile tanke');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.note')).toBeVisible();});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../public/engine.js';
import * as input from '../public/input.js';
import * as runtimeTools from '../public/runtime.js';
import * as i18n from '../public/i18n.js';
import {english} from '../public/messages.js';

test('saved language overrides browser preference and Auto follows the first browser language',()=>{
  assert.equal(i18n.resolveLanguage('en',['ja-JP']),'en');
  assert.equal(i18n.resolveLanguage('ja',['en-US']),'ja');
  assert.equal(i18n.resolveLanguage('auto',['ja-JP','en-US']),'ja');
  assert.equal(i18n.resolveLanguage('auto',['en-US','ja-JP']),'en');
  assert.equal(i18n.resolveLanguage('auto',['fr-FR']),'en');
  assert.equal(i18n.resolveLanguage('invalid',[]),'en');
  assert.equal(i18n.resolveLanguage('auto','JA-jp'),'ja');
});
test('all translations are complete and preserve every named parameter',()=>{
  const parameters=text=>[...new Set(text.match(/\{p\d+\}/g)||[])].sort();
  for(const [ja,en]of Object.entries(english)){
    assert.ok(en.trim(),ja);assert.doesNotMatch(en,/[\u3040-\u30ff\u3400-\u9fff]/,ja);
    assert.deepEqual(parameters(en),parameters(ja),ja);
    const params=Object.fromEntries(parameters(ja).map(key=>[key.slice(1,-1),'VALUE']));
    assert.doesNotMatch(i18n.t(ja,params,'en'),/\{p\d+\}/,ja);
    assert.equal(i18n.t(ja,params,'ja'),ja.replace(/\{p\d+\}/g,'VALUE'));
  }
  i18n.setLanguage('en');assert.equal(i18n.t('通常プレイ'),'Normal play');
  i18n.setLanguage('ja');assert.equal(i18n.t('通常プレイ'),'通常プレイ');
});
test('known worker and API errors translate in both directions, including saved interpolated messages',()=>{
  i18n.setLanguage('en');
  const source='ロック数は0〜20、または自動を指定してください';
  assert.equal(i18n.errorText(source),'Choose a locked-cell count between 0 and 20, or use Auto.');
  assert.equal(i18n.translateMessage(i18n.errorText(source),'ja'),source);
  assert.equal(i18n.errorText('ユーザー名を1〜24文字で入力してください'),'Enter Username between 1 and 24 characters.');
  const saved='オンライン記録を登録しました · 順位用時間 01:23.45';
  assert.equal(i18n.translateMessage(saved),'Online record saved · Ranked time 01:23.45');
  assert.equal(i18n.translateMessage(i18n.translateMessage(saved),'ja'),saved);
  assert.equal(i18n.errorText('将来の未知のエラー'),'An unexpected error occurred. Please try again.');
  i18n.setLanguage('ja');assert.equal(i18n.errorText('将来の未知のエラー'),'将来の未知のエラー');
});

// Exercise the real app's renderers and language event without a browser dependency.
function appHarness({saved={},browser=['en-US']}={}){
  const stores=new Map(Object.entries(saved));const elements=new Map();const listeners=new Map();
  function element(){return {innerHTML:'',textContent:'',dataset:{},style:{setProperty(){}},setAttribute(){},remove(){},showModal(){},close(){}};}
  elements.set('#app',element());elements.set('meta[name="description"]',element());
  const document={documentElement:{lang:'ja',dataset:{},style:{setProperty(){}}},activeElement:{},hidden:false,
    querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],getElementById:()=>null,
    createElement:element,body:{append(el){elements.set('#toast',el);}},addEventListener(type,fn){listeners.set(type,fn);}};
  const context=vm.createContext({...engine,...input,...runtimeTools,...i18n,translate:i18n.t,runtime:{apiBase:'',authMode:'none'},
    URL,URLSearchParams,Date,JSON,Math,Map,Set,Number,String,Boolean,Object,Array,RegExp,console,
    navigator:{languages:browser,language:browser[0],onLine:true},document,
    localStorage:{getItem:key=>stores.get(key)||null,setItem:(key,value)=>stores.set(key,value)},
    performance:{now:()=>2000},matchMedia:()=>({matches:false,addEventListener(){}}),
    window:{addEventListener(){},scrollTo(){},scrollY:0},location:{href:'https://example.github.io/SUMLINE/'},
    requestAnimationFrame:fn=>fn(),setInterval:()=>0,clearInterval(){},setTimeout:()=>0,clearTimeout(){},confirm:()=>true});
  // Resolve the module URL to a deterministic project subpath; omit only auto-boot.
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify('https://example.github.io/SUMLINE/app.js'))
    .replace(/^boot\(\)\.catch.*\n/m,'');
  vm.runInContext(source+`\nglobalThis.appTest={render,gamePage,customPage,settingsPage,tournamentPage,rankingPage,help,createTournamentModal,changeLanguage,tourStatus,dateText,elapsed,
    settings,progress,seedGame(g){game=g;},setView(v){view=v;},setIdentity(m){me=m;},setTournaments(ts){tournaments=ts;},setRecords(rs){rankEntries=rs;},
    state(){return {game,progress,settings,stage};}};`,context);
  return {app:context.appTest,document,elements,stores,listeners,context};
}
function fixture(){const puzzle=engine.generate({rows:4,cols:4,seed:'language-preserves-board'});return {mode:'normal',stage:1,context:'',puzzle,confirmed:[],mistakes:[],flags:[0],flagMode:false,events:[],lives:3,phase:'playing',highlight:null,activeMs:3210,activeStart:1000,wallStart:Date.now(),eligible:false,sessionId:null,submitMessage:'端末内の練習記録 · オンライン送信なし'};}
const withoutNativeLabels=html=>html.replace(/<option value="ja"[^>]*>日本語<\/option>/g,'');
test('every main screen and game phase renders in English, with localized accessibility labels',()=>{
  const {app,elements,document}=appHarness();
  app.setTournaments([{id:'one',name:'Weekend',rows:4,cols:4,boards:3,starts_at:Date.now()-1000,ends_at:Date.now()+86400000}]);
  app.setRecords([{user_id:'one',name:'Player',boards:3,average_ms:1000,score:500}]);
  for(const view of ['normal','daily','custom','tournaments','ranking','settings']){
    app.setView(view);app.seedGame(null);app.render();
    assert.doesNotMatch(withoutNativeLabels(elements.get('#app').innerHTML),/[\u3040-\u30ff\u3400-\u9fff]/,view);
  }
  app.setView('normal');
  for(const phase of ['ready','playing','paused','won','lost']){
    const game=fixture();game.phase=phase;game.resultScore=300;app.seedGame(game);app.render();
    assert.doesNotMatch(withoutNativeLabels(elements.get('#app').innerHTML),/[\u3040-\u30ff\u3400-\u9fff]/,phase);
    assert.match(elements.get('#app').innerHTML,/Row 1, column 1, number/);
  }
  assert.equal(document.documentElement.lang,'en');assert.match(document.title,/Choose numbers/);
  elements.set('#modal',{innerHTML:'',showModal(){}});app.help();
  assert.match(elements.get('#modal').innerHTML,/double-tap/);
  assert.doesNotMatch(elements.get('#modal').innerHTML,/[\u3040-\u30ff\u3400-\u9fff]/);
});
test('language changes preserve the active puzzle, lives, flags, timer, progress, and saved settings',()=>{
  const {app,elements,stores}=appHarness({browser:['ja-JP']});const game=fixture();app.seedGame(game);
  const before=JSON.stringify(game),elapsed=app.elapsed(),progress=JSON.stringify(app.progress);
  app.changeLanguage('en');assert.equal(JSON.stringify(game),before);assert.equal(app.elapsed(),elapsed);assert.equal(JSON.stringify(app.progress),progress);
  assert.match(elements.get('#app').innerHTML,/Normal play/);assert.equal(game.phase,'playing');
  const saved=JSON.parse(stores.get('sumline:/SUMLINE/:settings'));assert.equal(saved.language,'en');assert.equal(saved.clickMode,'double');
  const reloaded=appHarness({saved:Object.fromEntries(stores),browser:['ja-JP']});assert.equal(reloaded.app.settings.language,'en');
  app.changeLanguage('ja');assert.match(elements.get('#app').innerHTML,/通常プレイ/);assert.equal(JSON.stringify(game),before);
});
test('player content stays untouched and tournament status never depends on display language',()=>{
  const {app,elements}=appHarness();app.settings.name='大会<script>';app.setView('settings');app.render();
  assert.match(elements.get('#app').innerHTML,/大会&lt;script&gt;/);assert.doesNotMatch(elements.get('#app').innerHTML,/<script>/);
  const tournament={starts_at:Date.now()-10000,ends_at:Date.now()+86400000};
  assert.equal(app.tourStatus(tournament),'active');app.changeLanguage('ja');assert.equal(app.tourStatus(tournament),'active');
  app.changeLanguage('en');assert.equal(app.tourStatus(tournament),'active');
  assert.match(app.dateText(Date.parse('2026-11-06T15:30:00Z')),/11\/7/);
});
test('language switches preserve unsubmitted custom values, username, and color edits',()=>{
  const {app,document,elements}=appHarness();
  const form={id:'custom-form',elements:{namedItem:name=>newFields[name]}};
  const newFields={seed:{value:''},rows:{value:'5'}};
  const username={id:'username',value:'未保存の名前',dataset:{}};
  const color={value:'#abcdef',dataset:{color:'accent'}};
  document.querySelectorAll=()=>[{form,name:'seed',value:'日本語シード',dataset:{}},{form,name:'rows',value:'7',dataset:{}},username,color];
  document.getElementById=id=>id==='custom-form'?form:id==='username'?newName:null;
  const newName={value:''};const newColor={value:''};elements.set('[data-color="accent"]',newColor);
  app.changeLanguage('ja');
  assert.equal(newFields.seed.value,'日本語シード');assert.equal(newFields.rows.value,'7');
  assert.equal(newName.value,'未保存の名前');assert.equal(newColor.value,'#abcdef');
});
test('English tournament creation labels explain JST and do not require a backend upgrade',async()=>{
  const {app,elements}=appHarness();const dialog={innerHTML:'',showModal(){}};elements.set('#modal',dialog);
  app.setIdentity({authenticated:true});await app.createTournamentModal();
  assert.match(dialog.innerHTML,/Starts \(JST, UTC\+9\)/);assert.match(dialog.innerHTML,/Ends \(JST, UTC\+9\)/);
  assert.match(dialog.innerHTML,/datetime-local/);assert.match(dialog.innerHTML,/Create tournament/);
  assert.doesNotMatch(dialog.innerHTML,/[\u3040-\u30ff\u3400-\u9fff]/);
});

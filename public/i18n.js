import {english} from './messages.js';

export const supportedLanguages=Object.freeze(['ja','en']);
const japanese=/[\u3040-\u30ff\u3400-\u9fff]/;
let language='ja';

/** Saved choice wins; Auto follows the browser's first preferred language. */
export function resolveLanguage(preference='auto',browserLanguages=[]){
  if(supportedLanguages.includes(preference))return preference;
  const first=(Array.isArray(browserLanguages)?browserLanguages:[browserLanguages]).find(v=>typeof v==='string'&&v);
  return first&&/^ja(?:-|_|$)/i.test(first)?'ja':'en';
}
export function setLanguage(value){language=supportedLanguages.includes(value)?value:'ja';return language;}
export function getLanguage(){return language;}
export function localeFor(value=language){return value==='en'?'en-US':'ja-JP';}

/** Japanese source messages are catalog keys. Parameters can be reordered in translation. */
export function t(source,params={},target=language){
  const template=target==='en'?(english[source]??source):source;
  return template.replace(/\{(p\d+)\}/g,(marker,key)=>Object.hasOwn(params,key)?String(params[key]):marker);
}

const exact=new Map();
const patterns=[];
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
for(const [ja,en]of Object.entries(english)){
  if(!/\{p\d+\}/.test(ja)){exact.set(ja,ja);exact.set(en,ja);continue;}
  for(const template of [ja,en]){
    const names=[];let last=0,pattern='^';
    for(const match of template.matchAll(/\{(p\d+)\}/g)){
      pattern+=escapeRegex(template.slice(last,match.index))+'([\\s\\S]*?)';names.push(match[1]);last=match.index+match[0].length;
    }
    pattern+=escapeRegex(template.slice(last))+'$';
    patterns.push({ja,names,regex:new RegExp(pattern),specificity:template.replace(/\{p\d+\}/g,'').length});
  }
}
patterns.sort((a,b)=>b.specificity-a.specificity);

/** Translate known API/worker errors and old saved status messages at display time. */
export function translateMessage(message,target=language,depth=0){
  const value=String(message??'');
  if(exact.has(value))return t(exact.get(value),{},target);
  if(depth>=3)return value;
  for(const entry of patterns){
    const match=entry.regex.exec(value);if(!match)continue;
    const params=Object.fromEntries(entry.names.map((name,i)=>[name,translateMessage(match[i+1],target,depth+1)]));
    return t(entry.ja,params,target);
  }
  return value;
}
export function errorText(message){
  const translated=translateMessage(message);
  return language==='en'&&japanese.test(translated)?t('予期しないエラーが発生しました。もう一度お試しください。'):translated;
}

'use strict';
const o=v=>!!v&&typeof v==='object'&&!Array.isArray(v),B=[[2020,2100],[1,12],[1,5]];
function layer(v,d=0){
if(!o(v)||!Object.keys(v).every(k=>+k%1===0&&+k>=B[d][0]&&+k<=B[d][1]))return false;
if(d<2)return Object.values(v).every(x=>layer(x,d+1));
return Object.values(v).every(e=>{const p=String(e?.points??'').trim();return o(e)&&(!p||/^\d+$/.test(p)&&Number.isSafeInteger(+p))&&(e.prize==null||typeof e.prize==='string');});
}
export const validateDiaryStore=v=>layer(v);
export const validateLastMainCalculationStore=v=>o(v)&&v.version===1&&o(v.mainByRegion)&&Object.entries(v.mainByRegion).every(([r,x])=>o(x)&&x.region===r&&typeof x.currentStatus==='string'&&typeof x.targetStatus==='string'&&Number.isSafeInteger(+x.neededPoints)&&+x.neededPoints>=0);
const R={hokuhokuDiaryData:['hokuhokuDiaryDataRecoveryV1',validateDiaryStore],playpointLastMainCalculationV1:['playpointLastMainCalculationRecoveryV1',validateLastMainCalculationStore]};
const M=Symbol.for('pp.storageSafety.v1');
function kind(k,raw){
if(raw===null)return 0;
let v;try{v=JSON.parse(raw);}catch{return'malformed-json';}
if(k==='playpointLastMainCalculationV1'&&Number.isInteger(v?.version)&&v.version>1)return'future-version';
return R[k][1](v)?1:'invalid-schema';
}
function same(text,k,raw){try{const v=JSON.parse(text);return v?.sourceKey===k&&v?.raw===raw;}catch{return false;}}
export function installOwnedStorageSafety(target=globalThis,now=()=>new Date().toISOString()){
let s,p;
try{s=target?.localStorage;p=target?.Storage?.prototype;}catch{return false;}
if(!s||!p)return false;
if(p[M])return true;
const w=p.setItem;if(typeof w!=='function')return false;
try{
p[M]=w;
p.setItem=function(k,v){
k=String(k);const r=R[k];
if(this!==s||!r)return w.call(this,k,v);
v=String(v);if(kind(k,v)!==1)throw new TypeError('refused to write invalid data');
const raw=this.getItem(k),why=kind(k,raw);
if(why!==0&&why!==1){
const rk=r[0],bak=this.getItem(rk);
if(bak===null)w.call(this,rk,JSON.stringify({version:1,sourceKey:k,reason:why,capturedAt:now(),raw}));
else if(!same(bak,k,raw))throw new Error('different recovery copy already exists');
}
return w.call(this,k,v);
};
}catch{return false;}
return true;
}
if(typeof window!=='undefined')installOwnedStorageSafety(window);
export {bindLanguageSuggestionDismiss,checkLanguageSuggestion,formatLastCalculationText,getLastMainCalculationForRegion,sameCalculationContext,saveLastMainCalculationForRegion} from './first-view.js';

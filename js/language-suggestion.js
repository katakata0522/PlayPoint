'use strict';

const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const ranges=[[2020,2100],[1,12],[1,5]];
function layer(v,d=0){
  if(!obj(v)||!Object.keys(v).every(k=>Number.isInteger(+k)&&+k>=ranges[d][0]&&+k<=ranges[d][1]))return false;
  if(d<2)return Object.values(v).every(x=>layer(x,d+1));
  return Object.values(v).every(e=>{
    const p=String(e?.points??'').trim();
    return obj(e)&&(!p||/^\d+$/.test(p)&&Number.isSafeInteger(+p))&&(e.prize==null||typeof e.prize==='string');
  });
}
export const validateDiaryStore=v=>layer(v);
export const validateLastMainCalculationStore=v=>obj(v)&&v.version===1&&obj(v.mainByRegion)&&Object.entries(v.mainByRegion).every(([r,x])=>{
  const p=+x?.neededPoints;
  return obj(x)&&x.region===r&&typeof x.currentStatus==='string'&&typeof x.targetStatus==='string'&&Number.isSafeInteger(p)&&p>=0;
});

const rules={
  hokuhokuDiaryData:['hokuhokuDiaryDataRecoveryV1',validateDiaryStore],
  playpointLastMainCalculationV1:['playpointLastMainCalculationRecoveryV1',validateLastMainCalculationStore]
};
const marker=Symbol.for('playpoint.storageSafety.v1');
function classify(k,raw){
  if(raw===null)return'empty';
  let v;
  try{v=JSON.parse(String(raw));}catch{return'malformed-json';}
  if(k==='playpointLastMainCalculationV1'&&obj(v)&&Number.isInteger(v.version)&&v.version>1)return'future-version';
  return rules[k]?.[1](v)?'valid':'invalid-schema';
}
function same(text,k,raw){
  try{const v=JSON.parse(text);return v?.sourceKey===k&&v?.raw===raw;}catch{return false;}
}

export function installOwnedStorageSafety(target=globalThis,now=()=>new Date().toISOString()){
  let local,proto;
  try{local=target?.localStorage;proto=target?.Storage?.prototype;}catch{return false;}
  if(!local||!proto)return false;
  if(proto[marker])return true;
  const write=proto.setItem;
  if(typeof write!=='function')return false;
  try{
    proto[marker]=write;
    proto.setItem=function(k,v){
      k=String(k);
      const rule=rules[k];
      if(this!==local||!rule)return write.call(this,k,v);
      v=String(v);
      if(classify(k,v)!=='valid')throw new TypeError(`PlayPoint refused to write invalid data to ${k}.`);
      const raw=this.getItem(k),reason=classify(k,raw);
      if(reason!=='empty'&&reason!=='valid'){
        const recoveryKey=rule[0],recovery=this.getItem(recoveryKey);
        if(recovery===null)write.call(this,recoveryKey,JSON.stringify({version:1,sourceKey:k,reason,capturedAt:now(),raw}));
        else if(!same(recovery,k,raw))throw new Error(`PlayPoint refused to overwrite ${k}: a different recovery copy already exists.`);
      }
      return write.call(this,k,v);
    };
  }catch{return false;}
  return true;
}
if(typeof window!=='undefined')installOwnedStorageSafety(window);

export {bindLanguageSuggestionDismiss,checkLanguageSuggestion,formatLastCalculationText,getLastMainCalculationForRegion,sameCalculationContext,saveLastMainCalculationForRegion} from './first-view.js';

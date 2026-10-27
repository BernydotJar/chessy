'use strict';

/** Immutable policy limits. These are product defaults, not a claim of legal compliance. */
const DAY=24*60*60*1000;
const LIMITS=Object.freeze({
  roomCreation:{count:3,windowMs:DAY},
  invitation:{count:10,windowMs:60*60*1000},
  reviewRequest:{count:2,windowMs:DAY},
  enrollment:{count:15,windowMs:DAY},
  maxAdmissionsPerRoom:50,
  maxRoomAgeMs:90*DAY,
  closedRoomGraceMs:30*DAY,
  adultMembershipMs:90*DAY,
  childMembershipMs:30*DAY,
  inviteMs:7*DAY,
  reviewRequestMs:7*DAY,
  approvalMs:30*DAY,
  diagnosticMs:90*DAY,
  auditMs:90*DAY,
});
function text(value,min,max) {
  if(typeof value!=='string')return null;
  const trimmed=value.trim().replace(/\s+/g,' ');
  return trimmed.length>=min&&trimmed.length<=max?trimmed:null;
}
function isSafeId(value) {return typeof value==='string'&&/^[A-Za-z0-9]{20}$/.test(value);}
function isAgeBand(value) {return ['6-9','10-12','13-17','adult'].includes(value);}
function isMinor(value){return isAgeBand(value)&&value!=='adult';}
function isAudience(value){return ['children','adults','mixed'].includes(value);}
function isLanguage(value){return ['es','en','pt'].includes(value);}
function allows(audience,age){return isAudience(audience)&&isAgeBand(age)&& (audience==='mixed'||(audience==='adults'&&!isMinor(age))||(audience==='children'&&isMinor(age)));}
function rateNext(previous,now,limit) {
  const windowStart=typeof previous?.windowStartMs==='number'?previous.windowStartMs:0;
  const count=Number.isSafeInteger(previous?.count)?previous.count:0;
  if(windowStart<=0||windowStart>now||now-windowStart>=limit.windowMs)return {windowStartMs:now,count:1};
  if(count>=limit.count)return null;
  return {windowStartMs:windowStart,count:count+1};
}
function policyAllowsMinor(config,approval,{uid,roomId,ageBand},now) {
  return !!config && config.minorEnrollmentEnabled===true && Number.isSafeInteger(config.policyVersion) &&
    config.policyVersion>=1 && !!approval && approval.schemaVersion===1 &&
    approval.status==='approved' && approval.guardianUid===uid &&
    approval.roomId===roomId && approval.ageBand===ageBand &&
    approval.policyVersion===config.policyVersion &&
    typeof approval.expiresAt?.toMillis==='function' && approval.expiresAt.toMillis()>now;
}
function sha256(value){
  const {createHash}=require('node:crypto');
  return createHash('sha256').update(value).digest('hex');
}
module.exports={DAY,LIMITS,text,isSafeId,isAgeBand,isMinor,isAudience,isLanguage,allows,rateNext,policyAllowsMinor,sha256};

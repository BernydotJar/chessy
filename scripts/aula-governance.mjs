/**
 * Owner-governed teacher registry for the disposable Chessy adult classroom.
 * No teacher access code is stored in plaintext. Records persist between restarts.
 * All paths are server-only and MUST NOT be under dist/, public/ or source control.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_TEACHERS = 50;
const MAX_AUDIT = 250;
const MAX_LIFETIME_DAYS = 90;
const digest = (salt, code) => crypto.createHash('sha256').update(salt + ':' + code).digest('hex');
const compare = (a,b) => {
  const x=Buffer.from(String(a)), y=Buffer.from(String(b));
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};
const safeFile = filename => {
  const stat=fs.lstatSync(filename);
  if(!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077))
    throw Error('Aula governance file must be a regular owner-only file');
};
export function createAulaGovernance({
  adminSecretPath, registryPath, legacyTeacherCode, clock=Date.now
}){
  if(!adminSecretPath) {
    return {
      enabled:false,
      verifyAdmin:()=>false,
      verifyTeacher:code=>compare(code,legacyTeacherCode)?{id:'legacy',name:'Profesor principal'}:null,
      teacherActive:id=>id==='legacy',
      listTeachers:()=>[],
      createTeacher:()=>{throw Error('governance-not-configured');},
      revokeTeacher:()=>false,
      legacyEnabled:()=>true,
      setLegacy:()=>{throw Error('governance-not-configured');},
      audit:()=>[],
      addAudit:()=>{}
    };
  }
  safeFile(adminSecretPath);
  const adminCode=fs.readFileSync(adminSecretPath,'utf8').trim();
  if(adminCode.length<30 || compare(adminCode,legacyTeacherCode))
    throw Error('Separate high-entropy classroom administrator secret is required');
  const file=registryPath || path.join(path.dirname(adminSecretPath),'teacher-registry.json');
  if(path.resolve(file)===path.resolve(adminSecretPath))
    throw Error('Administrator secret and registry must use different files');
  let db={version:1,allowLegacyTeacher:true,teachers:[],events:[]};
  if(fs.existsSync(file)) {
    safeFile(file);
    const stored=JSON.parse(fs.readFileSync(file,'utf8'));
    if(stored.version!==1 || !Array.isArray(stored.teachers) || !Array.isArray(stored.events))
      throw Error('Invalid classroom registry');
    db=stored;
  }
  const save=()=>{
    const tmp=file+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
    const fd=fs.openSync(tmp,'wx',0o600);
    try { fs.writeFileSync(fd,JSON.stringify(db,null,2)+'\n');fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(tmp,file);
    fs.chmodSync(file,0o600);
  };
  const addAudit=(action,details={})=>{
    db.events.push({at:clock(),action,...details});
    if(db.events.length>MAX_AUDIT)db.events=db.events.slice(-MAX_AUDIT);
    save();
  };
  const validTeacher = t => Boolean(t && !t.revokedAt && t.expiresAt>clock());
  const verifyTeacher=code=>{
    if(typeof code!=='string' || code.length>150)return null;
    if(db.allowLegacyTeacher && compare(code,legacyTeacherCode))
      return {id:'legacy',name:'Profesor principal'};
    for(const t of db.teachers) {
      if(validTeacher(t) && compare(digest(t.salt,code),t.codeHash))
        return {id:t.id,name:t.name};
    }
    return null;
  };
  const teacherActive=id=>id==='legacy' ? db.allowLegacyTeacher :
    validTeacher(db.teachers.find(t=>t.id===id));
  const summary=t=>({id:t.id,name:t.name,createdAt:t.createdAt,expiresAt:t.expiresAt,
    revokedAt:t.revokedAt||null,status:t.revokedAt?'revoked':t.expiresAt<=clock()?'expired':'active'});
  const createTeacher=(name,days=30)=>{
    if(typeof name!=='string' || name.trim().length<2 || name.trim().length>64 ||
      !Number.isInteger(days) || days<1 || days>MAX_LIFETIME_DAYS)
      throw Error('invalid-teacher');
    if(db.teachers.filter(validTeacher).length>=MAX_TEACHERS)
      throw Error('teacher-quota');
    const code='CHESSY-T-'+crypto.randomBytes(24).toString('base64url');
    const record={id:crypto.randomBytes(8).toString('hex'),name:name.trim(),
      salt:crypto.randomBytes(16).toString('hex'),createdAt:clock(),
      expiresAt:clock()+days*86400000,revokedAt:null};
    record.codeHash=digest(record.salt,code);
    db.teachers.push(record);
    addAudit('teacher-created',{teacherId:record.id});
    return {...summary(record),code};
  };
  const revokeTeacher=id=>{
    if(typeof id!=='string' || id==='legacy')return false;
    const t=db.teachers.find(x=>x.id===id);
    if(!t || t.revokedAt)return false;
    t.revokedAt=clock();
    addAudit('teacher-revoked',{teacherId:id});
    return true;
  };
  const setLegacy=enabled=>{
    if(typeof enabled!=='boolean')throw Error('invalid-legacy-setting');
    db.allowLegacyTeacher=enabled;
    addAudit('legacy-teacher-'+(enabled?'enabled':'disabled'));
    return db.allowLegacyTeacher;
  };
  return {
    enabled:true,
    verifyAdmin:code=>typeof code==='string' && code.length<=150 && compare(code,adminCode),
    verifyTeacher,teacherActive,
    listTeachers:()=>db.teachers.map(summary),
    createTeacher,revokeTeacher,
    legacyEnabled:()=>db.allowLegacyTeacher,setLegacy,
    audit:()=>db.events.slice(-50),
    addAudit
  };
}

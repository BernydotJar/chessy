import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAulaGovernance } from '../aula-governance.mjs';

const LEGACY='CHESSY-TEACHER-LEGACY-TEST-CODE-20261108';
const ADMIN='CHESSY-ADMIN-SEPARATE-SUPER-PRIVATE-CODE-20261108';

test('owner-issued teacher codes persist, expire, revoke and never reach plaintext files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-aula-governance-'));
 const adminSecretPath=path.join(dir,'admin.secret');
 const registryPath=path.join(dir,'teachers.json');
 let time=Date.now();
 try{
  fs.writeFileSync(adminSecretPath,ADMIN,{mode:0o600});
  const args={adminSecretPath,registryPath,legacyTeacherCode:LEGACY,clock:()=>time};
  const registry=createAulaGovernance(args);
  assert.equal(registry.enabled,true);
  assert.equal(registry.verifyAdmin(ADMIN),true);
  assert.equal(registry.verifyAdmin(LEGACY),false);
  assert.equal(registry.verifyTeacher(ADMIN),null);
  assert.equal(registry.verifyTeacher(LEGACY)?.id,'legacy');
  assert.throws(()=>registry.createTeacher('A',30),/invalid-teacher/);
  assert.throws(()=>registry.createTeacher('Maestro',91),/invalid-teacher/);
  const first=registry.createTeacher('Maestro de ajedrez',7);
  assert.ok(first.id && first.code.startsWith('CHESSY-T-'));
  assert.equal(registry.verifyTeacher(first.code)?.name,'Maestro de ajedrez');
  assert.equal(registry.teacherActive(first.id),true);
  assert.equal(fs.statSync(registryPath).mode & 0o077,0);
  const persisted=fs.readFileSync(registryPath,'utf8');
  assert.ok(!persisted.includes(first.code));
  assert.ok(!persisted.includes(ADMIN));
  assert.ok(!persisted.includes(LEGACY));
  assert.equal(registry.listTeachers().length,1);
  const reopened=createAulaGovernance(args);
  assert.equal(reopened.verifyTeacher(first.code)?.id,first.id);
  const short=reopened.createTeacher('Profesor temporal',1);
  time+=2*86400000;
  assert.equal(reopened.verifyTeacher(short.code),null,'expired codes fail closed');
  assert.equal(reopened.listTeachers().find(x=>x.id===short.id).status,'expired');
  assert.equal(reopened.verifyTeacher(first.code)?.id,first.id);
  assert.equal(reopened.revokeTeacher(first.id),true);
  assert.equal(reopened.revokeTeacher(first.id),false);
  assert.equal(reopened.verifyTeacher(first.code),null);
  assert.equal(reopened.teacherActive(first.id),false);
  assert.equal(reopened.setLegacy(false),false);
  assert.equal(reopened.verifyTeacher(LEGACY),null);
  const again=createAulaGovernance(args);
  assert.equal(again.legacyEnabled(),false);
  assert.equal(again.verifyTeacher(LEGACY),null);
  assert.ok(again.audit().some(x=>x.action==='teacher-revoked'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('admin is separate owner-only secret and invalid filesystem state fails closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-aula-governance-failure-'));
 try{
  const secret=path.join(dir,'admin.secret');
  fs.writeFileSync(secret,ADMIN,{mode:0o644});
  assert.throws(()=>createAulaGovernance({adminSecretPath:secret,legacyTeacherCode:LEGACY}),/owner-only/);
  fs.chmodSync(secret,0o600);
  assert.throws(()=>createAulaGovernance({adminSecretPath:secret,legacyTeacherCode:ADMIN}),/Separate high-entropy/);
  const legacy=createAulaGovernance({legacyTeacherCode:LEGACY});
  assert.equal(legacy.enabled,false);
  assert.equal(legacy.verifyTeacher(LEGACY)?.id,'legacy');
  assert.equal(legacy.verifyAdmin(LEGACY),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

'use strict';
const {Timestamp}=require('firebase-admin/firestore');
const {LIMITS,isSafeId}=require('./policy.cjs');
/** Daily bounded cleanup; reentrant and incremental. Nothing is logged from private diagnostics. */
async function cleanupExpired({limit=40,dryRun=false,db,logger=console}={}) {
  if(!db)throw new Error('A Firebase Admin Firestore client is required');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('invalid cleanup limit');

  const report={expiredEnrollmentIndexes:0,expiredRooms:0,closedRooms:0,deletedRooms:0,errors:0};
  const current=Timestamp.now();
  // Expired room membership indexes are the canonical cleanup queue.
  const exp=await db.collectionGroup('rooms').where('expiresAt','<=',current).limit(limit).get();
  for(const snap of exp.docs){
    const segments=snap.ref.path.split('/');
    if(segments.length!==4||segments[0]!=='userRooms'||segments[2]!=='rooms')continue;
    const uid=segments[1],roomId=segments[3];
    if(!isSafeId(roomId))continue;
    report.expiredEnrollmentIndexes++;
    if(dryRun)continue;
    try {
      // Transactional deletion prevents a delayed cleanup from erasing a
      // renewed membership or a newly reassigned exercise.
      await db.runTransaction(async tx=>{
        const exercise=db.doc('learningRooms/'+roomId+'/exercise/current');
        const signal=db.doc('learningRooms/'+roomId+'/exercise/announcement');
        const [index,assignment,announcement]=await Promise.all([
          tx.get(snap.ref),tx.get(exercise),tx.get(signal)
        ]);
        if(!index.exists||index.data().expiresAt?.toMillis?.()>current.toMillis())return;
        tx.delete(snap.ref);
        tx.delete(db.doc('learningRooms/'+roomId+'/members/'+uid));
        tx.delete(db.doc('learningRooms/'+roomId+'/diagnostics/'+uid));
        tx.delete(db.doc('roomGuardianApprovals/'+roomId+'_'+uid));
        tx.delete(db.doc('guardianReviewRequests/'+roomId+'_'+uid));
        if(assignment.data()?.assignedUid===uid){
          tx.delete(exercise);
          if(announcement.exists)tx.update(signal,{status:'ended',
            revision:Math.min(Number(announcement.data().revision||0)+1,1000000),
            updatedAt:Timestamp.now()});
        }
      });
    }catch(error){report.errors++;logger.error('Failed to purge enrollment', {roomId});}
  }
  // Room expiry is enforced in Firestore rules. Worker closes room for audit+eventual purge.
  const expired=await db.collection('learningRooms').where('status','==','active')
    .where('expiresAt','<=',current).limit(limit).get();
  for(const snap of expired.docs){
    report.expiredRooms++;
    if(dryRun)continue;
    try{
      await snap.ref.update({status:'closed',closedAt:Timestamp.now(),updatedAt:Timestamp.now(),purgeAfter:Timestamp.fromMillis(Date.now()+LIMITS.closedRoomGraceMs)});
    }catch(error){report.errors++;logger.error('Failed to close expired room',{roomId:snap.id});}
  }
  const closed=await db.collection('learningRooms').where('status','==','closed')
    .where('purgeAfter','<=',current).limit(limit).get();
  for(const snap of closed.docs){
    report.closedRooms++;
    if(dryRun)continue;
    try{
      const roomId=snap.id;
      // Queries include legacy room records. Do not remove other rooms.
      const members=await snap.ref.collection('members').get();
      for(const member of members.docs){
        const batch=db.batch();
        batch.delete(db.doc('userRooms/'+member.id+'/rooms/'+roomId));
        batch.delete(db.doc('roomGuardianApprovals/'+roomId+'_'+member.id));
        batch.delete(db.doc('guardianReviewRequests/'+roomId+'_'+member.id));
        await batch.commit();
      }
      for(const collection of ['roomInvites','roomGuardianApprovals','guardianReviewRequests']){
        const all=await db.collection(collection).where('roomId','==',roomId).get();
        for(const entry of all.docs)await entry.ref.delete();
      }
      await db.recursiveDelete(snap.ref);
      report.deletedRooms++;
    }catch(error){report.errors++;logger.error('Failed to purge closed room',{roomId:snap.id});}
  }
  return report;
}


module.exports={cleanupExpired};

import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp } from '../firebase/client';
import { applyInstructorCommand, classroomSnapshotValid, initialClassroomBoard, type ClassroomBoard, type ClassroomCommand } from '../coach/classroomBoard';
import { gradeDiagnostic, isChild, parseRoom, roomAllowsAge, safeRoomTitle, validDiagnostic, type AgeBand, type Answers, type Language, type LearningGoal, type LearningRoom, type RoomAudience, type RoomDiagnostic, type RoomInvitation } from './model';

async function context() {
  const config = readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('cloud-unconfigured');
  const app = await getChessyFirebaseApp(config);
  const [dbSdk, authSdk] = await Promise.all([import('firebase/firestore'), import('firebase/auth')]);
  const user = authSdk.getAuth(app).currentUser;
  if (!user) throw new Error('sign-in-required');
  return { dbSdk, database: dbSdk.getFirestore(app), user };
}
async function verified() {
  const ctx = await context();
  // Refresh token in case the user verified their email in another tab.
  const token = await (await import('firebase/auth')).getIdTokenResult(ctx.user, true);
  if (token.claims.email_verified !== true) throw new Error('verify-email-required');
  return ctx;
}
async function coach() {
  const ctx = await verified();
  const token = await (await import('firebase/auth')).getIdTokenResult(ctx.user);
  if (token.claims.chessyRole !== 'coach' && token.claims.chessyRole !== 'admin') throw new Error('coach-only');
  return ctx;
}

export async function isRoomHost(): Promise<boolean> {
  try { await coach(); return true; } catch { return false; }
}
export function invitationUrl(id: string): string {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new Error('invalid-invite');
  return location.origin + location.pathname + location.search + '#/rooms/' + id;
}

export async function createRoom(input: {title: string; audience: RoomAudience; language: Language}): Promise<LearningRoom> {
  const {dbSdk: f,database, user} = await coach();
  const title = safeRoomTitle(input.title);
  if (!['children','adults','mixed'].includes(input.audience) || !['es','en','pt'].includes(input.language)) throw new Error('invalid-room');
  const room = f.doc(f.collection(database,'learningRooms'));
  const board = f.doc(database,'learningRooms',room.id,'board','current');
  const batch = f.writeBatch(database);
  batch.set(room, {schemaVersion:1,ownerUid:user.uid,title,audience:input.audience,language:input.language,status:'active',createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()});
  batch.set(board, {...initialClassroomBoard(),updatedAt:f.serverTimestamp()});
  await batch.commit();
  return {id:room.id,ownerUid:user.uid,title,audience:input.audience,language:input.language,status:'active'};
}
export async function listMyRooms(): Promise<LearningRoom[]> {
  const {dbSdk:f,database,user} = await verified();
  const hostRooms = await f.getDocs(f.query(f.collection(database,'learningRooms'),f.where('ownerUid','==',user.uid),f.limit(30)));
  const joined = await f.getDocs(f.query(f.collection(database,'userRooms',user.uid,'rooms'),f.limit(30)));
  const others = await Promise.all(joined.docs.map(async (item)=>{
    try {
      const doc = await f.getDoc(f.doc(database,'learningRooms',item.id));
      return doc.exists() ? parseRoom(doc.id,doc.data()) : null;
    } catch { return null; }
  }));
  const unique = new Map<string,LearningRoom>();
  for (const item of hostRooms.docs) {
    const room = parseRoom(item.id,item.data()); if (room) unique.set(room.id,room);
  }
  for (const room of others) if (room) unique.set(room.id,room);
  return [...unique.values()].sort((a,b)=>a.title.localeCompare(b.title));
}
/**
 * Fail closed on account deletion while classroom data remains.
 * The owner must use the supervised deletion procedure; a learner can withdraw in Rooms.
 */
export async function hasRoomParticipation(): Promise<boolean> {
  const {dbSdk:f,database,user}=await context();
  const joined=await f.getDocs(f.query(f.collection(database,'userRooms',user.uid,'rooms'),f.limit(1)));
  if (!joined.empty) return true;
  if (!user.emailVerified) throw new Error('verification-required-before-deletion');
  const owned=await f.getDocs(f.query(f.collection(database,'learningRooms'),
    f.where('ownerUid','==',user.uid),f.limit(1)));
  return !owned.empty;
}
export async function getRoom(roomId: string): Promise<LearningRoom> {
  if (!/^[A-Za-z0-9]{20}$/.test(roomId)) throw new Error('invalid-room');
  const {dbSdk:f,database} = await verified();
  const snapshot = await f.getDoc(f.doc(database,'learningRooms',roomId));
  const room = snapshot.exists() ? parseRoom(snapshot.id,snapshot.data()) : null;
  if (!room) throw new Error('room-unavailable');
  return room;
}
export async function closeRoom(roomId: string): Promise<void> {
  const {dbSdk:f,database,user} = await coach();
  const room = await getRoom(roomId);
  if (room.ownerUid !== user.uid) throw new Error('coach-only');
  await f.updateDoc(f.doc(database,'learningRooms',roomId),{status:'closed',updatedAt:f.serverTimestamp()});
}

export async function createInvite(room: LearningRoom): Promise<RoomInvitation> {
  const {dbSdk:f,database,user} = await coach();
  if (room.ownerUid !== user.uid || room.status !== 'active') throw new Error('coach-only');
  // Firestore auto-ID is an unpredictable 20-character bearer capability; expires after 7 days.
  const invite = f.doc(f.collection(database,'roomInvites'));
  const expiresAt = new Date(Date.now()+7*24*60*60*1000);
  await f.setDoc(invite,{
    schemaVersion:1,roomId:room.id,ownerUid:user.uid,
    roomTitle:room.title,audience:room.audience,
    createdAt:f.serverTimestamp(),expiresAt:f.Timestamp.fromDate(expiresAt),
  });
  return {id:invite.id,roomId:room.id,ownerUid:user.uid,expiresAt};
}
export async function revokeInvite(id: string): Promise<void> {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new Error('invalid-invite');
  const {dbSdk:f,database}=await coach();
  await f.deleteDoc(f.doc(database,'roomInvites',id));
}
export async function listInvites(uid: string): Promise<RoomInvitation[]> {
  const {dbSdk:f,database,user} = await coach();
  if (uid !== user.uid) throw new Error('coach-only');
  const snapshots = await f.getDocs(f.query(f.collection(database,'roomInvites'),f.where('ownerUid','==',uid),f.limit(70)));
  return snapshots.docs.map(item=>{
    const data=item.data();
    const expiration=data.expiresAt?.toDate?.();
    return expiration instanceof Date ? {id:item.id,roomId:data.roomId as string,ownerUid:uid,expiresAt:expiration} : null;
  }).filter((item): item is RoomInvitation=>!!item);
}
export async function redeemInfo(inviteId: string): Promise<{invitation: RoomInvitation; roomTitle: string; audience: RoomAudience}> {
  if (!/^[A-Za-z0-9]{20}$/.test(inviteId)) throw new Error('invalid-invite');
  const {dbSdk:f,database} = await verified();
  const doc = await f.getDoc(f.doc(database,'roomInvites',inviteId));
  if (!doc.exists()) throw new Error('invite-unavailable');
  const data=doc.data();
  const expiresAt=data.expiresAt?.toDate?.();
  if (!(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) throw new Error('invite-expired');
  if (!['children','adults','mixed'].includes(data.audience) || typeof data.roomTitle !== 'string') throw new Error('invite-unavailable');
  return {invitation:{id:inviteId,roomId:data.roomId,ownerUid:data.ownerUid,expiresAt},roomTitle:data.roomTitle,audience:data.audience};
}
export async function joinRoom(inviteId: string, ageBand: AgeBand, guardianConfirmed: boolean): Promise<string> {
  const {dbSdk:f,database,user} = await verified();
  const {invitation,audience} = await redeemInfo(inviteId);
  if (!roomAllowsAge(audience,ageBand)) throw new Error('audience-mismatch');
  if (isChild(ageBand) !== guardianConfirmed) throw new Error('guardian-required');
  const member = f.doc(database,'learningRooms',invitation.roomId,'members',user.uid);
  const index = f.doc(database,'userRooms',user.uid,'rooms',invitation.roomId);
  const payload = {schemaVersion:1,uid:user.uid,roomId:invitation.roomId,inviteId,ageBand,guardianConfirmed,joinedAt:f.serverTimestamp()};
  const batch=f.writeBatch(database);
  batch.set(member,payload);
  batch.set(index,payload);
  await batch.commit();
  return invitation.roomId;
}
/** Withdraw consent and erase the learner's personal room data atomically. */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!/^[A-Za-z0-9]{20}$/.test(roomId)) throw new Error('invalid-room');
  const {dbSdk:f,database,user} = await verified();
  const member=f.doc(database,'learningRooms',roomId,'members',user.uid);
  const index=f.doc(database,'userRooms',user.uid,'rooms',roomId);
  const diagnostic=f.doc(database,'learningRooms',roomId,'diagnostics',user.uid);
  const batch=f.writeBatch(database);
  batch.delete(diagnostic);
  batch.delete(member);
  batch.delete(index);
  await batch.commit();
}
export async function getMyMembership(roomId:string): Promise<{ageBand:AgeBand; guardianConfirmed:boolean}|null> {
  const {dbSdk:f,database,user}=await verified();
  const snapshot=await f.getDoc(f.doc(database,'learningRooms',roomId,'members',user.uid));
  if (!snapshot.exists()) return null;
  const data=snapshot.data();
  if (!['6-9','10-12','13-17','adult'].includes(data.ageBand)) return null;
  return {ageBand:data.ageBand as AgeBand,guardianConfirmed:data.guardianConfirmed===true};
}
export async function getMyDiagnostic(roomId:string): Promise<RoomDiagnostic|null> {
  const {dbSdk:f,database,user}=await verified();
  const snapshot=await f.getDoc(f.doc(database,'learningRooms',roomId,'diagnostics',user.uid));
  if (!snapshot.exists()) return null;
  const data=snapshot.data();
  const result={uid:user.uid,ageBand:data.ageBand,guardianConfirmed:data.guardianConfirmed,goal:data.goal,answers:data.answers};
  return validDiagnostic(result)?result:null;
}
export async function sendDiagnostic(roomId:string,ageBand:AgeBand,guardianConfirmed:boolean,goal:LearningGoal,answers:Answers): Promise<RoomDiagnostic> {
  const {dbSdk:f,database,user}=await verified();
  const result={uid:user.uid,ageBand,guardianConfirmed,goal,answers};
  if (!validDiagnostic(result)) throw new Error('incomplete-diagnostic');
  const _grade = gradeDiagnostic(ageBand,answers); // Result is advisory, not an entitlement or ELO.
  if (_grade.total !== 5) throw new Error('invalid-questions');
  await f.setDoc(f.doc(database,'learningRooms',roomId,'diagnostics',user.uid),{...result,schemaVersion:1,roomId,submittedAt:f.serverTimestamp()});
  return result;
}
export async function listDiagnostics(roomId:string):Promise<RoomDiagnostic[]> {
  const {dbSdk:f,database}=await coach();
  const docs=await f.getDocs(f.query(f.collection(database,'learningRooms',roomId,'diagnostics'),f.limit(50)));
  return docs.docs.map(doc=>{
    const d=doc.data();
    const item={uid:doc.id,ageBand:d.ageBand,guardianConfirmed:d.guardianConfirmed,goal:d.goal,answers:d.answers};
    return validDiagnostic(item)?item:null;
  }).filter((d):d is RoomDiagnostic=>!!d);
}
/** Real-time read-only roster. Firestore rules restrict both listeners to the owning coach. */
export async function observeRoomRoster(
  roomId: string,
  onDiagnostics: (results: RoomDiagnostic[]) => void,
  onMemberCount: (count: number) => void,
  onError: () => void,
): Promise<() => void> {
  const {dbSdk:f,database}=await coach();
  const diagnosticsRef=f.query(f.collection(database,'learningRooms',roomId,'diagnostics'),f.limit(50));
  const membersRef=f.query(f.collection(database,'learningRooms',roomId,'members'),f.limit(50));
  const stopDiagnoses=f.onSnapshot(diagnosticsRef,snapshot=>{
    const diagnostics=snapshot.docs.map(doc=>{
      const d=doc.data();
      const item={uid:doc.id,ageBand:d.ageBand,guardianConfirmed:d.guardianConfirmed,goal:d.goal,answers:d.answers};
      return validDiagnostic(item)?item:null;
    }).filter((item):item is RoomDiagnostic=>!!item);
    onDiagnostics(diagnostics);
  },onError);
  const stopMembers=f.onSnapshot(membersRef,snapshot=>onMemberCount(snapshot.docs.length),onError);
  return ()=>{stopDiagnoses();stopMembers();};
}

export async function listRoomMembers(roomId:string):Promise<Array<{uid:string;ageBand:AgeBand}>> {
  const {dbSdk:f,database}=await coach();
  const docs=await f.getDocs(f.query(f.collection(database,'learningRooms',roomId,'members'),f.limit(50)));
  return docs.docs.map(doc=>({uid:doc.id,ageBand:doc.data().ageBand as AgeBand}));
}

export async function watchRoomBoard(roomId:string,callback:(board:ClassroomBoard|null)=>void): Promise<()=>void> {
  const {dbSdk:f,database}=await verified();
  return f.onSnapshot(f.doc(database,'learningRooms',roomId,'board','current'),snapshot=>{
    const data=snapshot.data();
    callback(data && classroomSnapshotValid(data) ? data : null);
  },()=>callback(null));
}
export async function roomBoardCommand(roomId:string,command:ClassroomCommand):Promise<void> {
  const {dbSdk:f,database,user}=await coach();
  const room=await getRoom(roomId);
  if (room.ownerUid !== user.uid || room.status !== 'active') throw new Error('coach-only');
  const ref=f.doc(database,'learningRooms',roomId,'board','current');
  await f.runTransaction(database,async transaction=>{
    const snap=await transaction.get(ref);
    const source=snap.data();
    if (!source || !classroomSnapshotValid(source)) throw new Error('invalid-board');
    const next=applyInstructorCommand(source,command);
    transaction.update(ref,{...next,updatedAt:f.serverTimestamp()});
  });
}

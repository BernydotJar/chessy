import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp, getChessyFunctions } from '../firebase/client';
import { applyInstructorCommand, classroomSnapshotValid, type ClassroomBoard, type ClassroomCommand } from '../coach/classroomBoard';
import { isChild, parseRoom, safeRoomTitle, validSummary, type AgeBand, type Answers, type Language, type LearningGoal, type LearningRoom, type RoomAudience, type RoomDiagnosticSummary, type RoomInvitation } from './model';

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

async function invokeRoom<T>(name:string,data:Record<string,unknown>):Promise<T> {
  const config=readAuthRuntimeConfig().firebase;
  if(!config)throw new Error('cloud-unconfigured');
  const {functionsSdk,functions}=await getChessyFunctions(config);
  const result=await functionsSdk.httpsCallable<Record<string,unknown>,T>(functions,name)(data);
  return result.data;
}

export async function getGuardianAccessStatus(roomId:string,ageBand:AgeBand):
Promise<{allowed:boolean;pending:boolean;approvalExpiresAt:number|null}> {
  if(!/^[A-Za-z0-9]{20}$/.test(roomId)||!isChild(ageBand))return {allowed:false,pending:false,approvalExpiresAt:null};
  return invokeRoom('getGuardianAccessStatus',{roomId,ageBand});
}
export async function requestGuardianReview(inviteId:string,ageBand:AgeBand):Promise<void> {
  await invokeRoom('requestGuardianReview',{inviteId,ageBand,guardianAcknowledged:true});
}
export async function eraseAllMyGuardianReviews():Promise<void> {
  await invokeRoom('eraseAllMyGuardianReviews',{});
}
export async function eraseGuardianReview(roomId:string):Promise<void> {
  await invokeRoom('eraseGuardianReview',{roomId});
}
export async function isRoomHost(): Promise<boolean> {
  try { await coach(); return true; } catch { return false; }
}
export function invitationUrl(id: string): string {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new Error('invalid-invite');
  return location.origin + location.pathname + location.search + '#/rooms/' + id;
}

export async function createRoom(input: {title: string; audience: RoomAudience; language: Language}): Promise<LearningRoom> {
  const {user}=await coach();
  const title=safeRoomTitle(input.title);
  if (!['children','adults','mixed'].includes(input.audience) || !['es','en','pt'].includes(input.language)) throw new Error('invalid-room');
  const {roomId}=await invokeRoom<{roomId:string}>('createLearningRoom',{title,audience:input.audience,language:input.language});
  return {id:roomId,ownerUid:user.uid,title,audience:input.audience,language:input.language,status:'active'};
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
  await invokeRoom('closeLearningRoom',{roomId});
}
export async function createInvite(room: LearningRoom): Promise<RoomInvitation> {
  const {user}=await coach();
  if (room.ownerUid !== user.uid || room.status !== 'active') throw new Error('coach-only');
  const {inviteId}=await invokeRoom<{inviteId:string}>('issueRoomInvitation',{roomId:room.id});
  return {id:inviteId,roomId:room.id,ownerUid:user.uid,expiresAt:new Date(Date.now()+7*86400000)};
}
export async function revokeInvite(id: string): Promise<void> {
  await invokeRoom('revokeRoomInvitation',{inviteId:id});
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
export async function redeemInfo(inviteId: string): Promise<{invitation: RoomInvitation; roomTitle: string; audience: RoomAudience; roomExpiresAt: Date}> {
  if (!/^[A-Za-z0-9]{20}$/.test(inviteId)) throw new Error('invalid-invite');
  const {dbSdk:f,database} = await verified();
  const doc = await f.getDoc(f.doc(database,'roomInvites',inviteId));
  if (!doc.exists()) throw new Error('invite-unavailable');
  const data=doc.data();
  const expiresAt=data.expiresAt?.toDate?.();
  if (!(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) throw new Error('invite-expired');
  if (!['children','adults','mixed'].includes(data.audience) || typeof data.roomTitle !== 'string') throw new Error('invite-unavailable');
  const roomExpiresAt=data.roomExpiresAt?.toDate?.();
  if(!(roomExpiresAt instanceof Date)||roomExpiresAt.getTime()<=Date.now())throw new Error('room-expired');
  return {invitation:{id:inviteId,roomId:data.roomId,ownerUid:data.ownerUid,expiresAt},roomTitle:data.roomTitle,audience:data.audience,roomExpiresAt};
}
export async function joinRoom(inviteId: string, ageBand: AgeBand, guardianConfirmed: boolean):Promise<string> {
  if(isChild(ageBand)!==guardianConfirmed)throw new Error('guardian-required');
  const result=await invokeRoom<{roomId:string}>('joinLearningRoom',{
    inviteId,ageBand,guardianAcknowledged:guardianConfirmed,
  });
  return result.roomId;
}
/* Server-owned atomic withdrawal removes the guardian approval as well. */
export async function leaveRoom(roomId:string):Promise<void> {
  if(!/^[A-Za-z0-9]{20}$/.test(roomId))throw new Error('invalid-room');
  await invokeRoom('withdrawRoomParticipation',{roomId});
}
export async function getMyMembership(roomId:string): Promise<{ageBand:AgeBand; guardianConfirmed:boolean; expiresAt:Date}|null> {
  const {dbSdk:f,database,user}=await verified();
  const snapshot=await f.getDoc(f.doc(database,'learningRooms',roomId,'members',user.uid));
  if (!snapshot.exists()) return null;
  const data=snapshot.data();
  if (!['6-9','10-12','13-17','adult'].includes(data.ageBand)) return null;
  const expiresAt=data.expiresAt?.toDate?.();
  if(!(expiresAt instanceof Date))return null;
  return {ageBand:data.ageBand as AgeBand,guardianConfirmed:data.guardianConfirmed===true,expiresAt};
}
export async function getMyDiagnostic(roomId:string): Promise<RoomDiagnosticSummary|null> {
  const {dbSdk:f,database,user}=await verified();
  const snapshot=await f.getDoc(f.doc(database,'learningRooms',roomId,'diagnostics',user.uid));
  if (!snapshot.exists()) return null;
  const d=snapshot.data();
  const result={uid:user.uid,ageBand:d.ageBand,goal:d.goal,score:d.score,total:d.total};
  return validSummary(result)?result:null;
}
export async function sendDiagnostic(roomId:string,ageBand:AgeBand,guardianConfirmed:boolean,goal:LearningGoal,answers:Answers): Promise<RoomDiagnosticSummary> {
  const {user}=await verified();
  if(guardianConfirmed!==isChild(ageBand)||!answers||Object.keys(answers).length!==5||
     Object.values(answers).some(v=>!['a','b','c'].includes(v)))throw new Error('incomplete-diagnostic');
  const outcome=await invokeRoom<{score:number;total:5}>('submitRoomDiagnostic',{roomId,goal,answers});
  return {uid:user.uid,ageBand,goal,score:outcome.score,total:outcome.total};
}
export async function listDiagnostics(roomId:string):Promise<RoomDiagnosticSummary[]> {
  const {dbSdk:f,database}=await coach();
  const docs=await f.getDocs(f.query(f.collection(database,'learningRooms',roomId,'diagnostics'),f.limit(50)));
  return docs.docs.map(doc=>{
    const d=doc.data(),item={uid:doc.id,ageBand:d.ageBand,goal:d.goal,score:d.score,total:d.total};
    return validSummary(item)?item:null;
  }).filter((d):d is RoomDiagnosticSummary=>!!d);
}
/** Real-time read-only roster. Firestore rules restrict both listeners to the owning coach. */
export async function observeRoomRoster(
  roomId: string,
  onDiagnostics: (results: RoomDiagnosticSummary[]) => void,
  onMemberCount: (count: number) => void,
  onError: () => void,
): Promise<() => void> {
  const {dbSdk:f,database}=await coach();
  const diagnosticsRef=f.query(f.collection(database,'learningRooms',roomId,'diagnostics'),f.limit(50));
  const membersRef=f.query(f.collection(database,'learningRooms',roomId,'members'),f.limit(50));
  const stopDiagnoses=f.onSnapshot(diagnosticsRef,snapshot=>{
    const diagnostics=snapshot.docs.map(doc=>{
      const d=doc.data();
      const item={uid:doc.id,ageBand:d.ageBand,goal:d.goal,score:d.score,total:d.total};
      return validSummary(item)?item:null;
    }).filter((item):item is RoomDiagnosticSummary=>!!item);
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

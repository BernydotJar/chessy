import { describe, expect, it } from 'vitest';
import {
  ADULT_QUESTIONS, CHILD_QUESTIONS, AGE_BANDS, gradeDiagnostic, isChild, parseRoom,
  questionsForAge, roomAllowsAge, safeRoomTitle, validDiagnostic, zeroToOneMilestones,
  type Answers,
} from '../src/rooms/model';
import { emptyProgress } from '../src/learning/progress';

const answerKey: Answers = {q1:'b',q2:'a',q3:'c',q4:'a',q5:'b'};

describe('age-aware beginner diagnostic', () => {
  it('offers original, complete and accessible sets for children and adults', () => {
    expect(CHILD_QUESTIONS).toHaveLength(5);
    expect(ADULT_QUESTIONS).toHaveLength(5);
    expect(questionsForAge('6-9')).toEqual(CHILD_QUESTIONS);
    expect(questionsForAge('10-12')).toEqual(CHILD_QUESTIONS);
    expect(questionsForAge('13-17')).toEqual(ADULT_QUESTIONS);
    expect(questionsForAge('adult')).toEqual(ADULT_QUESTIONS);
    for (const age of AGE_BANDS) {
      const questions = questionsForAge(age);
      expect(new Set(questions.map(q=>q.id)).size).toBe(5);
      for (const question of questions) {
        expect(question.options).toHaveLength(3);
        for (const lang of ['es','en','pt'] as const) {
          expect(question.prompt[lang].length).toBeGreaterThan(15);
          for (const answer of question.options) expect(answer[lang].length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('does not certify or skip demonstrated competencies based on a questionnaire score', () => {
    expect(gradeDiagnostic('adult',answerKey)).toEqual({score:5,total:5,route:'bridge'});
    expect(gradeDiagnostic('6-9',answerKey)).toEqual({score:5,total:5,route:'bridge'});
    expect(gradeDiagnostic('adult',{q1:'a'})).toEqual({score:0,total:5,route:'zero'});
    expect(zeroToOneMilestones(emptyProgress()).every(m=>!m.done)).toBe(true);
  });
  it('rejects incomplete or forged questionnaires and unsupervised minor submissions', () => {
    const valid={uid:'adult_UID',ageBand:'6-9' as const,guardianConfirmed:true,goal:'discover' as const,answers:answerKey};
    expect(validDiagnostic(valid)).toBe(true);
    expect(validDiagnostic({...valid,guardianConfirmed:false})).toBe(false);
    expect(validDiagnostic({...valid,ageBand:'adult',guardianConfirmed:true})).toBe(false);
    expect(validDiagnostic({...valid,ageBand:'adult',guardianConfirmed:false})).toBe(true);
    expect(validDiagnostic({...valid,answers:{q1:'b'}})).toBe(false);
    expect(validDiagnostic({...valid,answers:{...answerKey,q4:'bad'}})).toBe(false);
    expect(validDiagnostic({...valid,answers:{...answerKey,extra:'c'}})).toBe(false);
  });
  it('supports distinct audiences without asking for birth dates', () => {
    expect(AGE_BANDS.every(age=>roomAllowsAge('mixed',age))).toBe(true);
    expect(roomAllowsAge('children','6-9')).toBe(true);
    expect(roomAllowsAge('children','adult')).toBe(false);
    expect(roomAllowsAge('adults','13-17')).toBe(false);
    expect(roomAllowsAge('adults','adult')).toBe(true);
    expect(isChild('13-17')).toBe(true);
    expect(isChild('adult')).toBe(false);
  });
  it('validates private room metadata and names', () => {
    expect(safeRoomTitle('  Aprender   con Chessy  ')).toBe('Aprender con Chessy');
    expect(() => safeRoomTitle('abc')).toThrow('invalid-title');
    const record={schemaVersion:1,ownerUid:'owner',title:'Chessy inicio',audience:'mixed',status:'active',language:'es'};
    expect(parseRoom('Room1',record)).toMatchObject({id:'Room1',ownerUid:'owner',title:'Chessy inicio'});
    expect(parseRoom('Room1',{...record,language:'unknown'})).toBeNull();
  });
});

describe('level zero to one is only awarded from recorded learning evidence',()=>{
  it('requires the concrete lessons and legal move exercises',()=>{
    const p=emptyProgress();
    const baseline=zeroToOneMilestones(p);
    expect(baseline).toHaveLength(5);
    const almost=zeroToOneMilestones({...p,lessons:['board-vision','king-safety'],
      solved:['rook-file','bishop-diagonal','knight-jump','pawn-capture']});
    expect(almost.filter(m=>m.done)).toHaveLength(4);
    expect(almost.find(m=>m.id==='mate')?.practice.id).toBe('back-rank');
    const partial=zeroToOneMilestones({...p,lessons:['board-vision'],solved:['rook-file']});
    expect(partial.find(m=>m.id==='straight')?.practice.id).toBe('bishop-diagonal');
    expect(partial.find(m=>m.id==='straight')?.practice.kind).toBe('puzzle');
    const finished=zeroToOneMilestones({...p,lessons:['board-vision','king-safety'],
      solved:['rook-file','bishop-diagonal','knight-jump','pawn-capture','back-rank']});
    expect(finished.every(m=>m.done)).toBe(true);
  });
});

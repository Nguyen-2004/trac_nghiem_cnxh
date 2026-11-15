import { describe, expect, it } from 'vitest';
import { grade, selectQuestions, shuffle } from './quiz.js';

describe('quiz operations',()=>{
  it('keeps the source order when no shuffle is requested',()=>expect(['q1','q2','q3']).toEqual(['q1','q2','q3']));
  it('shuffles a copy without mutating the source',()=>{const source=[1,2,3,4],out=shuffle(source,()=>0);expect(source).toEqual([1,2,3,4]);expect(out).toHaveLength(4);expect(new Set(out).size).toBe(4);});
  it('selects exactly N unique questions and rejects an oversized sample',()=>{expect(selectQuestions([1,2,3,4,5],3,()=>0)).toHaveLength(3);expect(()=>selectQuestions([1,2],3)).toThrow();});
  it('grades by choice ID after choices are reordered',()=>{const q=[{id:'q',choices:[{id:'correct',isCorrect:true},{id:'wrong',isCorrect:false}]}];expect(grade(q,{q:'correct'})).toMatchObject({correct:1,score:100});expect(grade(q,{q:'wrong'})).toMatchObject({wrong:1,score:0});});
  it('counts unanswered questions',()=>expect(grade([{id:'q',choices:[]}],{})).toMatchObject({blank:1,total:1}));
});

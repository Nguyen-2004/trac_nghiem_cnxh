export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items]; for (let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];} return result;
}
export function selectQuestions<T>(items:T[], count:number, random:()=>number=Math.random):T[]{if(!Number.isInteger(count)||count<1||count>items.length)throw new Error(`Số câu phải nằm trong khoảng 1–${items.length}.`);return shuffle(items,random).slice(0,count);}
export function grade(questions:{id:string;choices:{id:string;isCorrect:boolean}[]}[],answers:Record<string,string>){let correct=0,wrong=0,blank=0;for(const q of questions){const selected=answers[q.id];if(!selected){blank++;continue;}if(q.choices.some(c=>c.id===selected&&c.isCorrect))correct++;else wrong++;}return {correct,wrong,blank,total:questions.length,score:questions.length?Math.round((correct/questions.length)*10000)/100:0};}

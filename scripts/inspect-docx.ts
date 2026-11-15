import { readFile } from 'node:fs/promises';
import { parseDocx } from '../server/services/docxParser.js';
const file=process.argv[2];if(!file)throw new Error('Usage: npx tsx scripts/inspect-docx.ts path-to.docx');
const result=await parseDocx(await readFile(file));
const byChapter=Object.fromEntries(result.chapters.map(chapter=>[chapter,result.questions.filter(q=>q.chapter===chapter).length]));
console.log(JSON.stringify({subject:result.subject,chapterCount:result.chapters.length,questionCount:result.questions.length,choicesByCount:result.questions.reduce<Record<string,number>>((out,q)=>(out[String(q.choices.length)]=(out[String(q.choices.length)]||0)+1,out),{}),recognizedAnswers:result.questions.filter(q=>q.choices.filter(c=>c.isCorrect).length===1).length,reviewCount:result.questions.filter(q=>q.status==='NEEDS_REVIEW').length,byChapter,warningCount:result.warnings.length,warnings:result.warnings.slice(0,30)},null,2));

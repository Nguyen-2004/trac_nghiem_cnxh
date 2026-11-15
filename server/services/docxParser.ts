import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

export type ParsedChoice = { content: string; isCorrect: boolean };
export type ParsedQuestion = { content: string; choices: ParsedChoice[]; chapter: string; status: 'CONFIRMED' | 'NEEDS_REVIEW'; warnings: string[]; order: number };
export type ParsedDocx = { subject: string; chapters: string[]; questions: ParsedQuestion[]; warnings: string[] };
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REDS = new Set((process.env.DOCX_RED_COLORS || 'EE0000,FF0000,C00000,RED').split(',').map(color=>color.trim().toUpperCase()).filter(Boolean));
const local = (n: Element | null, name: string) => n?.getElementsByTagNameNS(W, name).item(0) ?? null;
const attr = (n: Element | null, name: string) => n?.getAttributeNS(W, name) ?? n?.getAttribute(`w:${name}`) ?? '';
type Para = { text: string; red: boolean; numberLabel: string };
const getParas = (xml: string, numbering?: string, styles?: string): Para[] => {
  const parser = new DOMParser({ errorHandler: { warning: () => {}, error: (e) => { throw new Error(e); }, fatalError: (e) => { throw new Error(e); } } });
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('DOCX chứa XML không hợp lệ.');
  const nums = numbering ? parser.parseFromString(numbering, 'application/xml') : null;
  const styleDoc = styles ? parser.parseFromString(styles, 'application/xml') : null;
  const levelText = new Map<string, { text: string; format: string }>();
  if (nums) {
    const abs = nums.getElementsByTagNameNS(W, 'abstractNum');
    const absMap = new Map<string, Map<string, {text:string;format:string}>>();
    for (let i = 0; i < abs.length; i++) { const levels = new Map<string,{text:string;format:string}>(); const lvls=abs[i].getElementsByTagNameNS(W,'lvl'); for(let j=0;j<lvls.length;j++) levels.set(attr(lvls[j],'ilvl')||'0',{text:attr(local(lvls[j],'lvlText') as Element,'val'),format:attr(local(lvls[j],'numFmt') as Element,'val')}); absMap.set(attr(abs[i],'abstractNumId'),levels); }
    const nlist=nums.getElementsByTagNameNS(W,'num'); for(let i=0;i<nlist.length;i++){const id=attr(nlist[i],'numId'), aid=attr(local(nlist[i],'abstractNumId') as Element,'val');const lvls=absMap.get(aid);if(lvls) for(const [l,t] of lvls) levelText.set(`${id}:${l}`,t);}
  }
  const paras = doc.getElementsByTagNameNS(W, 'p'); const output: Para[]=[];const counters=new Map<string,number>();
  for(let i=0;i<paras.length;i++) {
    const p=paras[i], ppr=local(p,'pPr'); let numId=attr(local(ppr,'numId') as Element,'val'), ilvl=attr(local(ppr,'ilvl') as Element,'val')||'0';
    if(!numId && styleDoc){const styleId=attr(local(ppr,'pStyle') as Element,'val');const stylesList=styleDoc.getElementsByTagNameNS(W,'style');for(let s=0;s<stylesList.length;s++)if(attr(stylesList[s],'styleId')===styleId){const np=local(stylesList[s],'pPr');numId=attr(local(np,'numId') as Element,'val');ilvl=attr(local(np,'ilvl') as Element,'val')||'0';}}
    const runs=p.getElementsByTagNameNS(W,'r');let text='',redText='';
    for(let j=0;j<runs.length;j++){const run=runs[j], t=run.getElementsByTagNameNS(W,'t');let piece='';for(let k=0;k<t.length;k++)piece+=t[k].textContent||'';if(run.getElementsByTagNameNS(W,'tab').length)piece+='\t';piece+='\n'.repeat(run.getElementsByTagNameNS(W,'br').length+run.getElementsByTagNameNS(W,'cr').length);text+=piece;const color=attr(local(local(run,'rPr') as Element,'color') as Element,'val').toUpperCase();if(REDS.has(color))redText+=piece;}
    const red=redText.replace(optionPrefix,'$2').trim().length>0;
    const marker=levelText.get(`${numId}:${ilvl}`);let numberLabel='';if(marker){const key=`${numId}:${ilvl}`,count=(counters.get(key)||0)+1;counters.set(key,count);let value=String(count);if(marker.format==='lowerLetter'||marker.format==='upperLetter')value=String.fromCharCode((marker.format==='upperLetter'?65:97)+((count-1)%26));const rendered=marker.text.replace(/%\d+/g,value);if(/^[a-dA-D][.)]$/.test(rendered))numberLabel=rendered;}
    output.push({text:text.trim(),red,numberLabel});
  }
  return output;
};
const qPrefix=/^\s*(?:Câu|Question)\s*\d+\s*[.):\-]?\s*/i;
const optionPrefix=/^\s*([a-dA-D])\s*[.)]\s*(.*)$/s;
const chapterPattern=/^\s*(?:chương|chapter)\s+([\dIVX]+)\s*[:.\-–—]?\s*(.*)$/i;
function flush(block: Para[], chapter: string, order: number, warnings: string[]): ParsedQuestion | null {
  const clean=block.map(p=>p.text).filter(Boolean); if(!clean.length)return null;
  const options: {text:string;red:boolean;label:string;explicit:boolean}[]=[];let q: string[]=[];let current: typeof options[number] | undefined;
  for(const p of block){const text=p.text;if(!text)continue;const found=optionPrefix.exec(text);const numbered=!!p.numberLabel;
    if(found || numbered){const label=found?.[1].toLowerCase() || p.numberLabel[0].toLowerCase();const body=found?found[2]:text;
      const sequence=options.length===0?label==='a':label===String.fromCharCode(97+options.length);
      if(numbered || sequence){current={text:body.trim(),red:p.red,label,explicit:true};options.push(current);continue;}}
    if(current){current.text+=`${current.text?'\n':''}${text}`;current.red ||= p.red;}else q.push(text);
  }
  if(!q.length&&block[0]?.text){q=[block[0].text.replace(qPrefix,'')];}
  const content=q.join('\n').replace(qPrefix,'').trim();if(!content&&!options.length)return null;
  const localWarnings:string[]=[];if(options.length!==4)localWarnings.push(`Nhận diện ${options.length} phương án; cần kiểm tra cấu trúc.`);
  const reds=options.map((o,i)=>o.red?i:-1).filter(i=>i>=0);if(reds.length!==1)localWarnings.push(reds.length?`Có nhiều phương án màu đỏ: ${reds.map(i=>String.fromCharCode(65+i)).join(', ')}.`:'Không tìm thấy đáp án màu đỏ.');
  if(!content)localWarnings.push('Không nhận diện được nội dung câu hỏi.');
  if(localWarnings.length)warnings.push(`Câu ${order}: ${localWarnings.join(' ')}`);
  return {content,choices:options.map(o=>({content:o.text.trim(),isCorrect:o.red&&reds.length===1})),chapter,status:localWarnings.length?'NEEDS_REVIEW':'CONFIRMED',warnings:localWarnings,order};
}
export async function parseDocx(buffer: Buffer): Promise<ParsedDocx> {
  if(buffer.length>15*1024*1024)throw new Error('File vượt quá giới hạn 15 MB.');
  const zip=await JSZip.loadAsync(buffer);const entries=Object.values(zip.files);if(entries.length>2000)throw new Error('DOCX có quá nhiều thành phần bên trong.');const expanded=entries.reduce((total,file)=>total+Number((file as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize||0),0);if(expanded>50*1024*1024)throw new Error('Nội dung giải nén vượt giới hạn 50 MB.');const docFile=zip.file('word/document.xml');if(!docFile)throw new Error('File không có word/document.xml; vui lòng chọn tệp DOCX hợp lệ.');
  const paras=getParas(await docFile.async('string'),await zip.file('word/numbering.xml')?.async('string'),await zip.file('word/styles.xml')?.async('string'));
  let chapter='Chưa phân chương',subject='',seenChapter=false;const questions:ParsedQuestion[]=[],warnings:string[]=[];let block:Para[]=[];let qOrder=0;const chapterCounts=new Map<string,number>();
  const finish=()=>{if(block.some(p=>qPrefix.test(p.text)||optionPrefix.test(p.text)||p.numberLabel)){const globalOrder=++qOrder,chapterOrder=(chapterCounts.get(chapter)||0)+1;chapterCounts.set(chapter,chapterOrder);const item=flush(block,chapter,globalOrder,warnings);if(item){item.order=chapterOrder;questions.push(item);}}else if(block.some(p=>p.text.trim()))warnings.push(`Không phân loại được đoạn: “${block.map(p=>p.text).join(' ').slice(0,100)}”`);block=[];};
  for(const p of paras){if(!p.text)continue;const ch=chapterPattern.exec(p.text);if(ch){finish();chapter=`Chương ${ch[1]}${ch[2]?`: ${ch[2].trim()}`:''}`;seenChapter=true;continue;}
    if(/^(?:môn học|môn|học phần|subject)\s*[:：]/i.test(p.text)){subject=p.text.replace(/^(?:môn học|môn|học phần|subject)\s*[:：]\s*/i,'').trim();continue;}
    if(!seenChapter&&!subject&&!qPrefix.test(p.text)&&!optionPrefix.test(p.text)&&!p.numberLabel&&!block.some(x=>qPrefix.test(x.text))){subject=p.text.trim();continue;}
    if(qPrefix.test(p.text)&&block.some(x=>qPrefix.test(x.text))){finish();}
    const seenOptions=block.filter(x=>optionPrefix.test(x.text)||x.numberLabel).length;
    if(seenOptions>=4&&!qPrefix.test(p.text)&&!optionPrefix.test(p.text)&&!p.numberLabel){finish();warnings.push(`Không phân loại được đoạn: “${p.text.slice(0,100)}”`);continue;}
    block.push(p);
  }finish();
  if(!questions.length)warnings.push('Không nhận diện được câu hỏi. Kiểm tra cách trình bày trong tài liệu.');
  const chapters=[...new Set(questions.map(q=>q.chapter))];return {subject,chapters,questions,warnings};
}

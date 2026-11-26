// Read-only reachable Git blob scan. Findings never contain matched values.
import {execFileSync} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';
const git=(args,input)=>execFileSync('git',args,{input,encoding:'utf8',maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe']});
const objects=git(['rev-list','--objects','--all']).trim().split('\n').map(line=>{const i=line.indexOf(' ');return {id:i<0?line:line.slice(0,i),path:i<0?'':line.slice(i+1)};});
const ids=[...new Set(objects.map(o=>o.id))];const metadata=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],ids.join('\n')+'\n').trim().split('\n').map(line=>{const [id,type,size]=line.split(' ');return {id,type,size:Number(size)};}).filter(o=>o.type==='blob');
const findings=[],contacts=[];let bytes=0;
const knownSecret=process.env.SUPABASE_CHECKOUT_SECRET_KEY;
for(const o of metadata){const value=git(['cat-file','blob',o.id]);bytes+=o.size;const path=objects.find(x=>x.id===o.id)?.path||'(historical blob)';
 const checks=[['supabase-secret',/\bsb_secret_[A-Za-z0-9_-]{20,}\b/],['supabase-access-token',/\bsbp_[a-f0-9]{40,}\b/],['github-token',/\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]];
 for(const [kind,pattern]of checks)if(pattern.test(value))findings.push({kind,path,blob:o.id});
 if(knownSecret&&value.includes(knownSecret))findings.push({kind:'current-server-secret',path,blob:o.id});
 for(const token of value.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(token[0].split('.')[1],'base64url').toString()).role==='service_role')findings.push({kind:'service-role-jwt',path,blob:o.id});}catch{}}
 if(/(?:^|\/)\.env\.local$/.test(path))findings.push({kind:'env-local-history',path,blob:o.id});
 const phones=[...value.matchAll(/\+380\d{9}\b/g)].map(x=>x[0]).filter(v=>!/^\+380000000\d{3}$/.test(v));
 const emails=[...value.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)].map(x=>x[0]).filter(v=>!/@(?:example\.(?:com|invalid)|test\.local|example\.org)$/i.test(v));
 if(phones.length||emails.length)contacts.push({path,blob:o.id,unclassifiedPhoneCount:phones.length,unclassifiedEmailCount:emails.length,...(path==='supabase/config.toml'&&emails.every(v=>v==='admin@email.com')?{classification:'standard Supabase CLI commented example, not customer data'}:{})});
}
const npm=JSON.parse(await readFile('/tmp/kos-block15-npm-audit.json','utf8'));
const report={status:findings.length?'review-required':'pass',scope:'all reachable Git blobs, all local refs',blobsScanned:metadata.length,bytesScanned:bytes,findings,contactCandidates:contacts,npmVulnerabilities:npm.metadata?.vulnerabilities,limitations:['ASCII/text patterns do not constitute forensic OCR of historical screenshots.','Synthetic test contacts and Git author metadata are not customer records.'],historyRewritten:false,credentialsRotated:false};
await writeFile('docs/checks/quality/history-and-dependencies.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({blobs:metadata.length,secretFindingCount:findings.length,contactCandidateCount:contacts.length,npmVulnerabilities:npm.metadata?.vulnerabilities?.total}));if(findings.length)process.exitCode=1;

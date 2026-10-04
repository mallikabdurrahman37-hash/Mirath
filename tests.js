/* اختبارات انحدار: تستعمل calc() الحقيقي، وتقارن الكسور نصًّا بعد التبسيط الدقيق (بلا أعداد عشرية). تشغيل: node tests.js */
const {calc,fr,parseMoney,wasiyya,moneySplit,gfSibRule,POLICIES}=require("./script.js");
let pass=0,fail=0;const bad=[];
const ok=(name,c,info="")=>{if(c)pass++;else{fail++;bad.push(name+" "+info)}};
/* exp: {مفتاح:[st, كسر|null, نصٌّ في السبب|null]} */
function T(name,N,exp,o={}){
  const r=calc(N,o);
  if(exp.review!==undefined)ok(name+" review",r.review===exp.review,JSON.stringify(r.scope));
  if(exp.invalid)return ok(name+" invalid",!!r.invalid);
  Object.keys(exp).filter(k=>k!=="review").forEach(k=>{
    const row=r.rows.find(x=>x.k===k&&x.st!==(exp[k][0]==="inel"?"zz":"inel"))||r.rows.find(x=>x.k===k);
    if(!row)return ok(name+" "+k+" موجود",false);
    const [st,f,why]=exp[k];
    ok(name+" "+k+" حالة",row.st===st,row.st);
    if(f!==null&&f!==undefined)ok(name+" "+k+" كسر",row.tot&&fr(row.tot)===f,row.tot&&fr(row.tot));
    if(why)ok(name+" "+k+" سبب",(row.why||"").includes(why),row.why);
  });
  // قواعد عامة: لا «محجوب» بلا حاجب، ولا نتيجة نهائية مع المراجعة، ومجموع الأنصبة 1
  r.rows.forEach(x=>{if(x.st==="blocked")ok(name+" حاجب "+x.k,!!x.why&&x.state==="blocked_by_heir");if(r.review&&x.st!=="inel")ok(name+" بلا نصيب "+x.k,!x.tot)});
  if(!r.review&&r.rows.some(x=>x.tot)){let s=0n,d=1n;r.rows.filter(x=>x.tot).forEach(x=>{s=s*BigInt(x.tot.d)+BigInt(x.tot.n)*d;d*=BigInt(x.tot.d)});
    ok(name+" المجموع=1",s===d||r.mode==="unassigned",String(s)+"/"+String(d))}
}
/* ---- وارث واحد ---- */
T("بنت وحدها",{d:1},{d:["fard","1"]});
T("أم وحدها",{m:1},{m:["fard","1"]});
T("ابن وحده",{s:1},{s:["asaba","1"]});
/* ---- الزوجان + سياسة الرد ---- */
T("زوج+بنت (رد لا للزوج)",{h:1,d:1},{h:["fard","1/4"],d:["fard","3/4"]});
T("زوجة+أم (رد للأم فقط)",{w:1,m:1},{w:["fard","1/4"],m:["fard","3/4"]});
T("زوج وحده — الافتراضي مراجعة",{h:1},{review:true,h:["review",null]});
T("زوج وحده — سياسة الرد على الزوجين",{h:1},{review:false,h:["fard","1"]},{policy:POLICIES.jumhur1_rs});
T("زوجة+بنت+أم",{w:1,d:1,m:1},{w:["fard","1/8"],d:["fard","21/32"],m:["fard","7/32"]});
T("زوجة+ابن",{w:1,s:1},{w:["fard","1/8"],s:["asaba","7/8"]});
T("4 زوجات+بنت",{w:4,d:1},{w:["fard","1/8"],d:["fard","7/8"]});
/* ---- الأبناء والبنات ---- */
T("ابنان+3 بنات",{s:2,d:3},{s:["asaba","4/7"],d:["asaba","3/7"]});
T("أبوان+ابن+بنت",{f:1,m:1,s:1,d:1},{f:["fard","1/6"],m:["fard","1/6"],s:["asaba","4/9"],d:["asaba","2/9"]});
T("أب+بنت (فرض وعصبة)",{f:1,d:1},{f:["both","1/2"],d:["fard","1/2"]});
T("بنتان+أبوان (الأب فرض فقط)",{d:2,f:1,m:1},{f:["fard","1/6"],d:["fard","2/3"],m:["fard","1/6"]});
/* ---- أولاد الابن ---- */
T("ابن+ابن ابن",{s:1,gs:2},{gs:["blocked",null,"بالابن"]});
T("بنت+بنتا ابن",{d:1,gd:2},{d:["fard","3/4"],gd:["fard","1/4"]});
T("بنتان+بنت ابن",{d:2,gd:1},{gd:["blocked",null,"ببنتين"]});
T("زوج+ابن ابن حر+ابن عم",{h:1,gs:1,cf:1},{h:["fard","1/4"],gs:["asaba","3/4"],cf:["blocked",null,"بابن الابن"]});
/* ---- الحالة: الرقيق (مطلب التدقيق 1) ---- */
T("متوفاة: زوج + ابن ابن رقيق + ابن عم شقيق",{h:1,gs:1,cf:1},
  {review:false,h:["fard","1/2"],gs:["inel",null,"رقيق"],cf:["asaba","1/2"]},{slaves:{gs:1}});
T("رقيق بعضهم فقط",{s:2},{s:["asaba","1"]},{slaves:{s:1}});
T("كلهم أرقاء → لا وارث ← مراجعة",{gs:1},{review:true},{slaves:{gs:1}});
/* ---- الحجب ---- */
T("أب+أخ شقيق",{f:1,fb:1},{f:["asaba","1"],fb:["blocked",null,"بالأب"]});
T("ابن+أخ لأم",{s:1,ub:1},{ub:["blocked",null,"بالفرع"]});
T("أخ شقيق+أخ لأب",{fb:1,pb:1},{fb:["asaba","1"],pb:["blocked",null,"بالأخ الشقيق"]});
T("أختان شقيقتان+أخت لأب",{fsis:2,psis:1},{fsis:["fard","1"],psis:["blocked",null,"بأختين"]});
T("محجوبون كثر",{s:1,gs:1,gd:1,fb:1,fsis:1,pb:1,ub:1},{s:["asaba","1"],gs:["blocked"],gd:["blocked"],fb:["blocked"],fsis:["blocked"],pb:["blocked"],ub:["blocked"]});
/* ---- الإخوة ---- */
T("زوج+أم+أخوان لأم",{h:1,m:1,ub:2},{h:["fard","1/2"],m:["fard","1/6"],ub:["fard","1/3"]});
T("أخ وأخت لأم فقط",{ub:1,usis:1},{ub:["fard","1/2"],usis:["fard","1/2"]});
T("أخ شقيق+أخت شقيقة",{fb:1,fsis:1},{fb:["asaba","2/3"],fsis:["asaba","1/3"]});
T("أخ لأب+أخت لأب",{pb:1,psis:1},{pb:["asaba","2/3"],psis:["asaba","1/3"]});
T("شقيقة+لأب",{fsis:1,psis:1},{fsis:["fard","3/4"],psis:["fard","1/4"]});
T("شقيقة+بنت (عصبة مع الغير)",{fsis:1,d:1},{d:["fard","1/2"],fsis:["asaba","1/2"]});
/* ---- الجدات (مطلب التدقيق 3) ---- */
T("أم+جدة لأم",{m:1,gmm:1},{gmm:["blocked",null,"بالأم"]});
T("جدة لأم+جدة لأب",{gmm:1,gmf:1},{gmm:["fard","1/2"],gmf:["fard","1/2"]});
T("جدة أم أب + أم أب الأب",{gmf:1,gmff:1},{gmf:["fard","1"],gmff:["blocked",null,"أم الأب"]});
T("أب+أم الأب",{f:1,gmf:1},{gmf:["blocked",null,"بالأب"]});
T("جد+أم أب الأب",{gf:1,gmff:1},{gf:["asaba","1"],gmff:["blocked",null,"بالجد"]});
T("جدة لأم + أم أب الأب ← خلاف",{gmm:1,gmff:1},{review:true});
/* ---- الجد والإخوة (مطلب التدقيق 2) ---- */
T("جد+أخ شقيق (مقاسمة)",{gf:1,fb:1},{gf:["asaba","1/2"],fb:["asaba","1/2"]});
T("جد+أخت شقيقة",{gf:1,fsis:1},{gf:["asaba","2/3"],fsis:["asaba","1/3"]});
T("جد+أخ شقيق+أخ لأب ← المعادّة",{gf:1,fb:1,pb:1},{review:true});
T("زوج+أم+جد+أخت ← الأكدرية",{h:1,m:1,gf:1,fsis:1},{review:true});
T("جد+بنت+أخ ← مراجعة",{gf:1,d:1,fb:1},{review:true});
T("المشتركة",{h:1,m:1,ub:2,fb:1},{review:true});
ok("قاعدة الجد: مقاسمة",gfSibRule({desc:false,fbn:1,pbn:0,fsis:0,psis:0}).id==="muqasama");
ok("قاعدة الجد: أكدرية",gfSibRule({desc:false,h:true,m:true,fbn:0,pbn:0,fsis:1,psis:0}).id==="akdariyya");
ok("قاعدة الجد: معادّة",gfSibRule({desc:false,fbn:1,pbn:1,fsis:0,psis:0}).review===true);
/* ---- العول والرد ---- */
T("عول: زوج+شقيقتان+أم",{h:1,fsis:2,m:1},{h:["fard","3/8"],m:["fard","1/8"],fsis:["fard","1/2"]});
T("عول 27",{w:1,d:2,f:1,m:1},{w:["fard","1/9"],d:["fard","16/27"],f:["fard","4/27"],m:["fard","4/27"]});
T("رد: بنت+أم",{d:1,m:1},{d:["fard","3/4"],m:["fard","1/4"]});
T("لا يبقى شيء للعصبة (غير محجوب)",{h:1,m:1,ub:2,uf:1},{uf:["nores",null,"لم يبقَ"]});
T("عول مع عصبة بلا باقٍ",{h:1,fsis:2,nfb:1},{nfb:["nores",null,"لم يبقَ"]});
T("معتق بعد الفروض",{d:1,pt:1},{d:["fard","1/2"],pt:["asaba","1/2"]});
/* ---- مدخلات غير صالحة ---- */
T("عدد سالب",{s:-1},{invalid:1});
T("أرقاء أكثر من الحاضرين",{s:1},{invalid:1},{slaves:{s:2}});
T("عدد فوق الحد",{s:31},{invalid:1});
T("عدد كسري",{s:1.5},{invalid:1});
/* ---- البيانات الوصفية ---- */
ok("المنهج في النتيجة",calc({d:1}).policy.id==="jumhur1"&&calc({h:1},{policy:POLICIES.jumhur1_rs}).policy.id==="jumhur1_rs");
ok("المراحل مسجلة",calc({d:1}).stages.length===12);
ok("كل صف له أثر شرح",calc({w:1,s:2,f:1}).rows.every(r=>r.trace&&r.trace.length));
/* ---- الوصية (بالقروش) ---- */
let w=wasiyya(100000,"non",false,900000);ok("وصية ضمن الثلث",w.applied===100000&&w.status==="within_third");
w=wasiyya(400000,"non",false,900000);ok("فوق الثلث بلا إجازة",w.applied===300000&&w.status==="capped_no_consent"&&w.msgs.length===1);
w=wasiyya(400000,"charity",true,900000);ok("فوق الثلث مع إجازة",w.applied===400000&&w.status==="over_third_consented");
w=wasiyya(100000,"heir",false,900000);ok("لوارث بلا إجازة",w.applied===0&&w.status==="heir_no_consent");
w=wasiyya(100000,"heir",true,900000);ok("لوارث بإجازة",w.applied===100000&&w.status==="heir_consented");
/* ---- المال والتقريب ---- */
const p=(s)=>parseMoney(s,"x");
ok("1e3 مرفوض",!p("1e3").ok);ok("0x10 مرفوض",!p("0x10").ok);ok("سالب مرفوض",!p("-5").ok);ok("Infinity مرفوض",!p("Infinity").ok);
ok("خانات زائدة مرفوضة",!p("12.345").ok);ok("فارغ مقبول",p("").ok&&p("").cents===0);
ok("أرقام عربية",p("١٢٣").cents===12300);ok("فواصل الآلاف",p("1,000.50").cents===100050);
ok("سقف أعلى",!p("99999999999999").ok);
let cs=moneySplit([{n:1,d:3},{n:1,d:3},{n:1,d:3}],100);ok("ثلاثة أثلاث=100",cs.reduce((a,b)=>a+b)===100&&cs.join()==="34,33,33",cs.join());
cs=moneySplit([{n:1,d:8},{n:7,d:8}],1001);ok("1/8+7/8 المجموع",cs.reduce((a,b)=>a+b)===1001,cs.join());
cs=moneySplit([{n:1,d:3},{n:2,d:3}],1000000000000000);ok("مبلغ كبير بلا فقد",cs.reduce((a,b)=>a+b)===1000000000000000);
console.log(`اجتاز ${pass} / ${pass+fail}`);
if(fail){console.log(bad.join("\n"));process.exit(1)}

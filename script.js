const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const F=(n,d=1)=>{if(d<0){n=-n;d=-d}const g=gcd(Math.abs(n),d)||1;return{n:n/g,d:d/g}};
const add=(a,b)=>F(a.n*b.d+b.n*a.d,a.d*b.d),mul=(a,b)=>F(a.n*b.n,a.d*b.d),sub=(a,b)=>add(a,{n:-b.n,d:b.d}),inv=a=>F(a.d,a.n);
const val=a=>a.n/a.d,ONE=F(1),ZERO=F(0);
const fr=a=>a.n===0?"0":a.d===1?String(a.n):a.n+"/"+a.d;
const fmt=x=>x.toLocaleString("en-US",{maximumFractionDigits:2});

/* ---- 1) الفئات الست والعشرون: [مفتاح، الجنس، الاسم، عبارة الحجب، الحد الأقصى، يظهر لمتوفى] ---- */
const HEIRS=[
 ["s","m","الابن","بالابن"],["gs","m","ابن الابن وإن نزل","بابن الابن"],["f","m","الأب","بالأب",1],["gf","m","الجد وإن علا","بالجد",1],
 ["fb","m","الأخ الشقيق","بالأخ الشقيق"],["pb","m","الأخ لأب","بالأخ لأب"],["ub","m","الأخ لأم","بالأخ لأم"],
 ["nfb","m","ابن الأخ الشقيق","بابن الأخ الشقيق"],["npb","m","ابن الأخ لأب","بابن الأخ لأب"],
 ["uf","m","العم الشقيق","بالعم الشقيق"],["up","m","العم لأب","بالعم لأب"],
 ["cf","m","ابن العم الشقيق","بابن العم الشقيق"],["cp","m","ابن العم لأب","بابن العم لأب"],
 ["h","m","الزوج","",1,"f"],["pt","m","المعتق","بالمعتق"],
 ["d","f","البنت","بالبنت"],["gd","f","بنت الابن وإن سفل أبوها بمحض الذكور","ببنت الابن"],["m","f","الأم","بالأم",1],
 ["gmm","f","الجدة من قبل الأم وإن علت بمحض الإناث","بالجدة",1],["gmf","f","الجدة التي هي أم الأب وإن علت بمحض الإناث","بالجدة",1],
 ["gmff","f","الجدة التي هي أم أب الأب","بالجدة",1],
 ["fsis","f","الأخت الشقيقة","بالأخت الشقيقة"],["psis","f","الأخت لأب","بالأخت لأب"],["usis","f","الأخت لأم","بالأخت لأم"],
 ["w","f","الزوجة","",4,"m"],["ptr","f","المعتقة","بالمعتقة"]
];
const INFO=Object.fromEntries(HEIRS.map(h=>[h[0],h]));
/* وزن العصبة صريح: الذكر ضعف الأنثى فقط داخل مجموعة فيها إناث؛ وما سوى ذلك وزنه 1 (لا وزن ضمني) */
const MALE_HEAD=new Set(["s","gs","fb","pb"]);
const W=(k,grp)=>MALE_HEAD.has(k)&&grp&&grp.some(x=>INFO[x][1]==="f")?2:1;
const MAXN=30,MAX_CENTS=1e14;                       // سقف: 10^12 وحدة نقدية، و30 فردًا للفئة
const fmtC=c=>fmt(c/100);

/* مراحل الحساب بالترتيب (كل مرحلة معلَّمة بتعليق في calc) */
const STAGES=["التحقق من المدخلات","الحضور","الأهلية","الحجب","الفروض","حالات المنهج الخاصة","أولوية العصبات","توزيع الفئة والفرد","العول","الرد","تحويل المال والتقريب","الشرح"];

/* المنهج المعلن: كل خيار فقهي حساس يظهر هنا ولا يُترك ضمنيًا. لم يُراجَع أي منها علميًا بعد. */
const POLICIES={
 jumhur1:{id:"jumhur1",name:"الجمهور (نسخة ١): الرد على غير الزوجين فقط",raddSpouse:false},
 jumhur1_rs:{id:"jumhur1_rs",name:"الجمهور (نسخة ١) + الرد على الزوج/الزوجة إن انفردا (قول بعض الفقهاء)",raddSpouse:true}};
const DEFAULT_POLICY=POLICIES.jumhur1;

/* حدود التغطية — بصراحة */
const COVERAGE=["فئات «وإن نزل / وإن علا / وإن علت» تُعامل بدرجتها الأولى فقط (حفيد، جد، جدة)؛ الدرجات الأبعد وتعدد الدرجات غير مدعوم.",
 "ذوو الأرحام وبيت المال خارج النطاق ويُعلَّم الحساب «يحتاج مراجعة».",
 "حالات الأهلية المدعومة: الحر والرقيق فقط (لا قتل ولا اختلاف دين)."];

/* قواعد الجد مع الإخوة: الترتيب مهم، وأول قاعدة تنطبق هي المستعملة. لا نتائج مخمَّنة: غير المعتمد = مراجعة. */
const GF_SIB_RULES=[
 {id:"akdariyya",when:c=>!c.desc&&c.h&&c.m&&c.fbn+c.pbn===0&&c.fsis+c.psis===1,review:true,msg:"الأكدرية (زوج وأم وجد وأخت): مسألة خلافية لم يُدخَل لها حكم معتمد."},
 {id:"maadda",when:c=>c.fbn+c.fsis>0&&c.pbn+c.psis>0,review:true,msg:"المعادّة (الجد مع إخوة أشقاء وإخوة لأب): لم يُدخَل لها حكم معتمد."},
 {id:"gf-female-desc",when:c=>c.fd&&!c.md,review:true,msg:"الجد مع الإخوة مع وجود بنت/بنت ابن: لم يُدخَل لها حكم معتمد."},
 {id:"muqasama",when:c=>!c.desc}];
const gfSibRule=c=>GF_SIB_RULES.find(r=>r.when(c))||{id:"unsupported",review:true,msg:"اجتماع الجد مع الإخوة في هذه الصورة غير مدعوم."};

/* قراءة مبلغ بصيغة صارمة → قروش صحيحة (بدون Number() الفضفاض: لا 1e3 ولا 0x10 ولا Infinity) */
function parseMoney(str,name){
  let t=String(str==null?"":str).trim().replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g,".").replace(/[,٬\s]/g,"");
  if(t==="")return{ok:true,cents:0,empty:true};
  const m=/^(\d{1,13})(?:\.(\d{1,2}))?$/.exec(t);
  if(!m)return{ok:false,msg:`قيمة «${name}» غير صالحة (أرقام فقط وبحد أقصى خانتين عشريتين)؛ لم تُعتمد.`};
  const c=Number(m[1])*100+Number((m[2]||"").padEnd(2,"0"));
  return c>MAX_CENTS?{ok:false,msg:`قيمة «${name}» أكبر من الحد المسموح.`}:{ok:true,cents:c};
}

/* الوصية: الحد الحسابي (ثلث الباقي) غير التنفيذ الشرعي. نوع الموصى له والإجازة يغيّران النتيجة. السياسة تحتاج تأكيد عالم. */
function wasiyya(a,type,consent,rem){
  const cap=Math.floor(rem/3),r={amount:a,cap,applied:0,status:"none",msgs:[]};
  if(!a)return r;
  if(type==="heir"){
    if(!consent){r.status="heir_no_consent";r.msgs.push(`الوصية لوارث (${fmtC(a)}) لا تنفذ إلا بإجازة بقية الورثة؛ لم تُخصم ولم يتغير المبلغ الذي أدخلته.`)}
    else{r.applied=Math.min(a,rem);r.status="heir_consented";r.msgs.push(`وصية لوارث نُفذت بإجازة بقية الورثة (${fmtC(r.applied)})؛ هذا الحكم يحتاج تأكيد عالم.`)}
  }else if(a<=cap){r.applied=a;r.status="within_third"}
  else if(!consent){r.applied=cap;r.status="capped_no_consent";
    r.msgs.push(`الوصية (${fmtC(a)}) تزيد على الثلث. الحد الحسابي للثلث ${fmtC(cap)}. التنفيذ الشرعي: يُنفَّذ الثلث فقط، والزائد (${fmtC(a-cap)}) موقوف على إجازة الورثة ولم يُخصم.`)}
  else{r.applied=Math.min(a,rem);r.status="over_third_consented";r.msgs.push(`الوصية تزيد على الثلث وأجازها الورثة فنُفذت (${fmtC(r.applied)})؛ يحتاج تأكيد عالم.`)}
  return r;
}

/* تحويل الكسور الدقيقة إلى قروش: تقريب بالأكبر باقيًا (BigInt)؛ تعادل الباقي يُحسم بترتيب الظهور. المجموع = الصافي دائمًا. */
function moneySplit(fracs,netC){
  const B=BigInt,N0=B(netC),q=[],rm=[];let used=0n;
  fracs.forEach(p=>{const x=N0*B(p.n),d=B(p.d);q.push(x/d);rm.push(x%d*1000000n/d);used+=x/d});
  let left=Number(N0-used);
  [...rm.keys()].sort((a,b)=>rm[a]===rm[b]?a-b:(rm[b]>rm[a]?1:-1)).forEach(i=>{if(left>0){q[i]+=1n;left--}});
  return q.map(Number);
}

/* ---- 2) محرك الفرائض: يعيد لكل وارث حالة (فرض | عصبة | فرض وعصبة | محجوب) لا مجرد كسر ---- */
function calc(N,opts={}){
  const S=opts.slaves||{},policy={...DEFAULT_POLICY,...(opts.policy||{})};
  /* مرحلة 1: التحقق من المدخلات */
  for(const h of HEIRS){const p=N[h[0]]||0,sl=S[h[0]]||0;
    if(!Number.isInteger(p)||p<0||p>MAXN||!Number.isInteger(sl)||sl<0||sl>p)
      return{invalid:`عدد غير صالح في «${h[2]}»`,rows:[],mode:"none",warn:[],scope:[],review:false,policy,stages:STAGES}}
  /* مرحلتا 2 و3: present = الحضور، n = الأهل للإرث فقط (الرقيق يُستبعد قبل الحجب) */
  const present=k=>N[k]||0, n=k=>present(k)-(S[k]||0);
  const R={}, nt={}, warn=[], fx={}, base={}, scope=[];
  const act=k=>n(k)>0&&!R[k];                 // موجود وغير محجوب
  const bl=(k,by)=>{if(n(k)&&!R[k])R[k]=by};  // حجب مع تسجيل السبب
  const md=n("s")+n("gs")>0, fd=n("d")+n("gd")>0, desc=md||fd;
  const sibs=["fb","pb","ub","fsis","psis","usis"].reduce((a,k)=>a+n(k),0);
  const SIB=["fb","pb","fsis","psis"];

  // (أ) الحجب بالحرمان
  if(n("s")) ["gs","gd",...SIB].forEach(k=>bl(k,"بالابن"));
  if(n("gs")) SIB.forEach(k=>bl(k,"بابن الابن"));
  if(!n("s")&&!n("gs")&&n("d")>=2) bl("gd","ببنتين فأكثر");
  if(n("f")) ["gf","gmf","gmff",...SIB].forEach(k=>bl(k,"بالأب"));
  if(n("m")) ["gmm","gmf","gmff"].forEach(k=>bl(k,"بالأم"));
  if(act("gf")) bl("gmff","بالجد");
  if(act("gmf")) bl("gmff","بالجدة التي هي أم الأب (الأقرب)");           // الأقرب من جهة الأب تحجب الأبعد
  if(act("gmm")&&act("gmff")&&!act("gmf")) scope.push("اجتماع الجدة من جهة الأم مع الجدة الأبعد من جهة الأب (أم أب الأب): مسألة خلافية لم يُدخَل لها حكم معتمد.");
  if(desc||n("f")||act("gf")) ["ub","usis"].forEach(k=>bl(k,desc?"بالفرع الوارث":n("f")?"بالأب":"بالجد"));
  if(act("fb")){bl("pb","بالأخ الشقيق");bl("psis","بالأخ الشقيق")}

  let gfA=false;
  const fl=act("f")?"f":act("gf")?"gf":null;                 // الأب أو الجد
  /* مرحلة 6: حالات المنهج الخاصة — الجد مع الإخوة في دالة وجدول قواعد مستقلين */
  const gr=fl==="gf"&&SIB.some(act)?gfSibRule({desc,md,fd,h:act("h"),m:act("m"),fbn:n("fb"),pbn:n("pb"),fsis:n("fsis"),psis:n("psis")}):null;
  if(gr&&gr.review)scope.push(gr.msg);
  const muq=!!gr&&gr.id==="muqasama";
  const fsAs=!muq&&act("fsis")&&(act("fb")||fd);              // شقيقة عصبة (مع أخيها أو مع البنات)
  if(fsAs&&!act("fb")){bl("pb","بالأخت الشقيقة");bl("psis","بالأخت الشقيقة")}
  if(!muq&&act("fsis")&&!fsAs&&n("fsis")>=2&&!act("pb")) bl("psis","بأختين شقيقتين");
  const psAs=!muq&&act("psis")&&(act("pb")||(fd&&!act("fsis")&&!act("fb")));

  // (ب) الفروض
  const put=(k,f)=>{fx[k]=f;base[k]=f};
  const pool=(keys,f)=>{const a=keys.filter(act),T=a.reduce((s,k)=>s+n(k),0);a.forEach(k=>put(k,mul(f(T),F(n(k),T))))};
  if(act("h")) put("h",desc?F(1,4):F(1,2));
  if(act("w")) put("w",desc?F(1,8):F(1,4));
  if(act("m")){
    if(desc||sibs>=2) put("m",F(1,6));
    else if(n("f")&&(act("h")||act("w"))){put("m",mul(F(1,3),sub(ONE,fx.h||fx.w)));nt.m="ثلث الباقي بعد فرض الزوج/الزوجة (العمريتان)"}
    else put("m",F(1,3));
  }
  pool(["gmm","gmf","gmff"],()=>F(1,6));                       // السدس يُقسم بين الجدات بالتساوي
  pool(["ub","usis"],T=>T>1?F(1,3):F(1,6));                    // الثلث يُقسم بين ولد الأم بالتساوي
  if(fl&&!muq&&desc) put(fl,F(1,6));                           // السدس (وللأب/الجد عصبة أيضًا إن لم يكن للميت فرع ذكر)
  if(act("d")&&!n("s")) put("d",n("d")>1?F(2,3):F(1,2));
  if(act("gd")&&!act("gs")&&!n("s")) put("gd",n("d")?F(1,6):n("gd")>1?F(2,3):F(1,2));
  if(!muq){
    if(act("fsis")&&!fsAs) put("fsis",n("fsis")>1?F(2,3):F(1,2));
    if(act("psis")&&!psAs) put("psis",act("fsis")&&n("fsis")===1?F(1,6):n("psis")>1?F(2,3):F(1,2));
  }
  if(muq){ // الجد: الأفضل من المقاسمة أو ثلث الباقي أو سدس التركة (قول الجمهور)
    const F0=Object.values(fx).reduce(add,ZERO), rem=val(F0)<1?sub(ONE,F0):ZERO;
    const U=2+SIB.reduce((s,k)=>s+(act(k)?W(k,SIB)*n(k):0),0);
    const m=mul(rem,F(2,U)),th=mul(rem,F(1,3)),six=F(1,6);
    const best=[m,th,six].reduce((a,b)=>val(b)>val(a)+1e-12?b:a);
    put("gf",best);nt.gf=best===m?"يقاسم الإخوة":best===th?"ثلث الباقي":"سدس التركة";
    if(best===m){gfA=true;delete base.gf}
  }

  // (ج) العصبة: أقرب جهة تأخذ الباقي وتحجب من بعدها
  const cands=[
    ()=>act("s")&&["s","d"], ()=>act("gs")&&["gs","gd"], ()=>act("f")&&!md&&["f"],
    ()=>fl==="gf"&&!md&&!muq&&["gf"],
    ()=>muq?[...SIB]:(act("fb")||fsAs)&&["fb","fsis"], ()=>!muq&&(act("pb")||psAs)&&["pb","psis"],
    ...["nfb","npb","uf","up","cf","cp"].map(k=>()=>act(k)&&[k]),
    ()=>(act("pt")||act("ptr"))&&["pt","ptr"]];
  const ri=cands.findIndex(c=>c());
  let ab=ri<0?[]:cands[ri]().filter(act);
  if(ab.length){
    const by=INFO[ab[0]][3];
    cands.slice(ri+1).forEach(c=>(c()||[]).forEach(k=>{if(act(k)&&!fx[k])bl(k,by)}));
  }

  // مرحلة 8-10: عول / عصبة / رد (حسب السياسة المعلنة)
  let T=Object.values(fx).reduce(add,ZERO),mode="none";
  if(val(T)>1+1e-12){const k=inv(T);Object.keys(fx).forEach(x=>fx[x]=mul(fx[x],k));mode="awl"}
  else{
    const rest=sub(ONE,T);
    if(ab.length){
      mode="asaba";
      if(val(rest)>1e-12){const U=ab.reduce((a,k)=>a+W(k,ab)*n(k),0);ab.forEach(k=>fx[k]=add(fx[k]||ZERO,mul(rest,F(W(k,ab)*n(k),U))))}
    }else if(val(rest)>1e-12&&Object.keys(fx).length){
      const el=Object.keys(fx).filter(k=>k!=="h"&&k!=="w");
      if(el.length){const t=el.reduce((a,k)=>add(a,fx[k]),ZERO);el.forEach(k=>fx[k]=add(fx[k],mul(rest,mul(fx[k],inv(t)))));mode="radd"}
      else if(policy.raddSpouse){const pl=Object.keys(fx),t=pl.reduce((a,k)=>add(a,fx[k]),ZERO);pl.forEach(k=>fx[k]=add(fx[k],mul(rest,mul(fx[k],inv(t)))));mode="radd-spouse"}
      else{mode="unassigned";scope.push("الباقي بعد فرض الزوج/الزوجة لا وارث له في الفئات المدعومة، والسياسة المختارة لا ترد على الزوجين؛ فمصيره (ذوو الأرحام / بيت المال) خارج النطاق.")}
    }else if(Object.keys(fx).length)mode="exact";
  }
  if(ab.includes("fb")&&(act("ub")||act("usis"))&&val(T)>=1-1e-12)scope.push("المشتركة (المشرَّكة): استغرقت الفروض التركة مع إخوة أشقاء وولد أم؛ فيها خلاف ولم يُدخَل لها حكم معتمد.");
  if(!Object.keys(fx).length&&!ab.length&&HEIRS.some(h=>present(h[0])))scope.push("لا وارث بالفرض أو التعصيب ضمن الفئات المدعومة (ذوو الأرحام / بيت المال).");
  ab.forEach(k=>{if(!fx[k])fx[k]=ZERO});

  // مرحلة 12: حالة كل وارث + أثر الشرح — «محجوب» لا تُستعمل إلا مع حاجب حقيقي
  const review=scope.length>0,rows=[],mk=(k,c)=>({k,label:INFO[k][2],fem:INFO[k][1]==="f",c});
  HEIRS.forEach(h=>{const k=h[0];if(!present(k))return;
    const tr=[`حاضر: ${present(k)}`];
    if(S[k])rows.push({...mk(k,S[k]),st:"inel",state:"ineligible_by_status",why:"رقيق: ليس أهلاً للإرث فلا يرث ولا يحجب غيره",trace:[...tr,"الحالة: رقيق ← غير أهل للإرث، واستُبعد قبل الحجب"]});
    if(!n(k))return;
    tr.push(`أهل للإرث: ${n(k)}`);const r=mk(k,n(k));
    if(review)return rows.push({...r,st:"review",state:"requires_review",why:"المسألة تحتاج مراجعة عالم؛ لم يُحسب نصيب هذا الوارث",trace:[...tr,...scope]});
    if(R[k])return rows.push({...r,st:"blocked",state:"blocked_by_heir",why:R[k],trace:[...tr,"محجوب "+R[k]]});
    const hasF=base[k]!==undefined,inAb=ab.includes(k),isA=(inAb&&!(mode==="awl"&&hasF))||(k==="gf"&&gfA);
    if(!isA&&!hasF){
      return rows.push(inAb?{...r,st:"nores",state:"no_residue_after_fixed_shares",why:"عصبة، لكن لم يبقَ شيء بعد الفروض (العول)",trace:[...tr,"أحق بالتعصيب","الفروض استغرقت التركة"]}
        :{...r,st:"scope",state:"not_entitled_under_selected_scope",why:"لا يستحق شيئًا في هذه المسألة ضمن النطاق المعتمد",trace:tr})}
    const tot=fx[k]||ZERO;
    if(isA&&!hasF&&tot.n===0)return rows.push({...r,st:"nores",state:"no_residue_after_fixed_shares",why:"عصبة، لكن لم يبقَ شيء بعد الفروض",trace:[...tr,"أحق بالتعصيب","الباقي بعد الفروض = 0"]});
    const only=isA&&hasF&&tot.n===base[k].n&&tot.d===base[k].d;
    const st=only?"fard":isA?(hasF?"both":"asaba"):"fard";
    const t2=[...tr];if(hasF)t2.push("فرض "+fr(base[k]));if(isA&&!only)t2.push(gfA&&k==="gf"?"يقاسم الإخوة":"عصبة: يأخذ نصيبه من الباقي");
    if(mode==="radd"&&hasF&&!isA&&k!=="h"&&k!=="w")t2.push("زيد عليه بالرد");if(mode==="awl"&&hasF)t2.push("نقص بالعول");
    t2.push("النصيب النهائي "+fr(tot)+" من التركة");
    rows.push({...r,st,state:st==="fard"?"receives_fixed_share_only":hasF?"receives_fixed_and_residue":"receives_residue",tot,fard:base[k],note:nt[k],trace:t2,
      adj:mode==="awl"&&hasF?"awl":mode==="radd"&&hasF&&!isA&&k!=="h"&&k!=="w"?"radd":null});
  });
  return {rows,mode,warn,scope,review,policy,stages:STAGES};
}

if(typeof document!=="undefined"){
/* ---- 3) الواجهة ---- */
const N={};HEIRS.forEach(h=>N[h[0]]=0);
let sex="m",toastT,S={};
const toast=t=>{const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove("show"),3200)};

function buildList(){
  const vis=HEIRS.filter(h=>!h[5]||h[5]===sex);
  const sec=(sx,t)=>`<h4 class="sub">${t}</h4>`+vis.filter(h=>h[1]===sx).map(h=>`
   <div class="row"><span>${h[2]}</span><div class="step">
   <button data-k="${h[0]}" data-d="-1" aria-label="إنقاص ${h[2]}">−</button><output id="n-${h[0]}">${N[h[0]]}</output>
   <button data-k="${h[0]}" data-d="1" aria-label="زيادة ${h[2]}">+</button></div></div>`).join("");
  $("#list").innerHTML=sec("m","الذكور")+sec("f","الإناث");
}
$("#list").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  const h=INFO[b.dataset.k],max=h[4]||MAXN;
  N[h[0]]=Math.min(max,Math.max(0,N[h[0]]+ +b.dataset.d));
  $("#n-"+h[0]).textContent=N[h[0]];
});
$("#sex").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b||b.dataset.v===sex)return;
  const lost=sex==="m"?N.w:N.h,was=sex;sex=b.dataset.v;
  $$("#sex button").forEach(x=>x.classList.toggle("on",x===b));
  N.h=N.w=0;buildList();
  if(lost)toast(`تغيّر جنس المتوفى فأُعيد عدد ${was==="m"?"الزوجات":"الزوج"} إلى صفر`);
});

/* إعادة التعيين بضغطتين لتجنب المسح بالخطأ */
$$(".reset").forEach(b=>{let t;b.onclick=()=>{
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="اضغط مجددًا للتأكيد";t=setTimeout(()=>{b.classList.remove("armed");b.textContent="إعادة تعيين"},3000);return}
  clearTimeout(t);$$(".reset").forEach(x=>{x.classList.remove("armed");x.textContent="إعادة تعيين"});
  HEIRS.forEach(h=>N[h[0]]=0);S={};sex="m";$("#wtype").value="non";$("#wcons").value="no";$("#policy").value="jumhur1";$("#stN").value=0;
  $$("#sex button").forEach(x=>x.classList.toggle("on",x.dataset.v==="m"));
  ["total","debt","funeral","will"].forEach(i=>$("#"+i).value="");
  buildList();$("#rows").innerHTML="";toast("تمت إعادة التعيين: الورثة والتركة من جديد");
}});

/* قراءة المبالغ (بالقروش) مع التحقق وشرح أي تعديل؛ القيمة غير الصالحة لا تتحول إلى صفر بصمت */
function readMoney(){
  const msgs=[];let bad=false;
  const g=(id,name)=>{const p=parseMoney($(id).value,name);if(!p.ok){msgs.push(p.msg);bad=true;return 0}return p.cents};
  const total=g("#total","إجمالي التركة");let debt=g("#debt","الديون"),fun=g("#funeral","التجهيز");const will=g("#will","الوصية");
  if(bad)return{bad:true,total,debt:0,fun:0,will:0,net:0,msgs:[...msgs,"لم تُحتسب المبالغ حتى تُصحَّح القيم غير الصالحة؛ تظهر الأنصبة كسورًا فقط."]};
  if(total<=0)msgs.push("لم تُدخل مبلغ التركة؛ تظهر الأنصبة ككسور فقط.");
  if(debt>total&&total>0){msgs.push(`الديون أكبر من التركة؛ اعتُبر منها ${fmtC(total)} فقط ولا يبقى شيء للورثة.`);debt=total}
  if(fun>total-debt&&total>0){msgs.push(`التجهيز أكبر من المتاح بعد الديون؛ اعتُبر ${fmtC(Math.max(0,total-debt))} فقط.`);fun=Math.max(0,total-debt)}
  const left=Math.max(0,total-debt-fun),wz=wasiyya(will,$("#wtype").value,$("#wcons").value==="yes",left);
  msgs.push(...wz.msgs);
  return{total,debt,fun,will:wz.applied,net:left-wz.applied,msgs};
}
const MODES={awl:"عَوْل: زادت الفروض على أصل المسألة فنُقصت الأنصبة بنسبة واحدة.",
 radd:"رَدّ: فاض شيء بعد الفروض فرُدّ على أصحاب الفروض غير الزوجين بنسبة فروضهم.",
 "radd-spouse":"لا وارث غير الزوج/الزوجة فرُدّ عليه الباقي (بحسب السياسة المختارة).",
 asaba:"العصبة تأخذ ما بقي بعد الفروض، وللذكر مثل حظ الأنثيين.",
 none:"لا يوجد في الفئات المختارة من يستحق التركة."};
const STT={inel:"غير أهل للإرث",nores:"عصبة — لا يبقى شيء",review:"تحتاج مراجعة",scope:"خارج النطاق"};
const traceHTML=r=>r.trace&&r.trace.length?`<details class="why"><summary>لماذا؟</summary><ul>${r.trace.map(t=>`<li>${t}</li>`).join("")}</ul></details>`:"";

function rowHTML(r,has){
  const t=r.label+(r.c>1?` <span class="cnt">(${r.c})</span>`:"");
  if(["blocked","inel","nores","review","scope"].includes(r.st)){const w=r.fem,none=w?"لا شيء لها":"لا شيء له";
    const tag=r.st==="blocked"?(w?"محجوبة":"محجوب"):STT[r.st];
    const lead=r.st==="blocked"?(w?"محجوبة ":"محجوب ")+r.why:r.why;
    return `<div class="glass res blk"><div class="rh"><h3>${t}</h3><span class="tag no">${tag}</span></div>
     <p>${lead}${r.st==="review"?"":" — "+none}</p>${traceHTML(r)}</div>`}
  const tag={fard:"فرض",asaba:"عصبة",both:"فرض وعصبة"}[r.st],p=r.tot,money=c=>has?fmtC(c):"—";
  const main=r.st==="fard"?fr(p):r.st==="asaba"?"الباقي":fr(r.fard)+" + الباقي";
  const sub2=r.st==="fard"?(r.adj==="awl"?"<small>بعد العول</small>":r.adj==="radd"?"<small>بعد الرد</small>":""):`<small>الناتج = ${fr(p)} من التركة</small>`;
  const who="كل "+r.label.replace(/^ال/,""),each=r.c>1&&has?Math.floor(r.cents/r.c):0,extra=r.c>1&&has?r.cents%r.c:0;
  const grp=r.c>1?`<p>نصيب ${who}: <b>${fr(F(p.n,p.d*r.c))}</b> = ${money(each)}${extra?` <small>(يُضاف 0.01 لأول ${extra})</small>`:""}</p>`:"";
  return `<div class="glass res"><div class="rh"><h3>${t}</h3><span class="tag ${r.st}">${tag}</span></div>
   <div class="rb"><div>${r.c>1?`<p>الإجمالي للجميع (${r.c})</p>`:""}${grp}${r.note?`<p>${r.note}</p>`:""}</div>
   <div class="nums"><div class="frac">${main}${sub2}</div><div class="amt">${money(r.cents||0)}</div></div></div>
   <div class="bar"><i style="width:${Math.min(100,val(p)*100).toFixed(1)}%"></i></div>${traceHTML(r)}</div>`;
}

function render(){
  const m=readMoney(),slv={};Object.keys(S).forEach(k=>{if(S[k]>0)slv[k]=Math.min(S[k],N[k])});
  const res=calc(N,{slaves:slv,policy:POLICIES[$("#policy").value]}),{rows,mode,warn,scope,policy}=res;
  const has=!m.bad&&m.net>0&&!res.review;
  $("#net").textContent=m.bad?"—":fmtC(m.net);
  $("#meta").textContent="الصافي بعد الديون والتجهيز والوصية";
  const line=(a,b,c)=>`<div class="fl${c||""}"><span>${a}</span><b>${b}</b></div>`,ar='<i class="ar">↓</i>';
  $("#flow").innerHTML=line("إجمالي التركة",fmtC(m.total))+ar+line("الديون","− "+fmtC(m.debt))+ar+line("تجهيز الميت ودفنه","− "+fmtC(m.fun))+ar+
    line("الوصية المنفَّذة","− "+fmtC(m.will))+ar+line("الصافي للتقسيم",m.bad?"—":fmtC(m.net),"  last");
  const items=rows.filter(r=>r.tot);
  if(has)moneySplit(items.map(r=>r.tot),m.net).forEach((c,i)=>items[i].cents=c);
  $("#rows").innerHTML=rows.length?rows.map(r=>rowHTML(r,has)).join(""):'<div class="glass card empty">أضف الورثة من تبويب «الورثة» لعرض الأنصبة.</div>';
  $("#hd").hidden=!rows.length;
  const all=[...m.msgs,...(res.invalid?[res.invalid]:[]),...warn.map(w=>"⚠ "+w),...scope.map(x=>"⛔ تحتاج مراجعة عالم: "+x)];
  $("#msgs").hidden=!all.length;$("#msgs").innerHTML=all.join("<br>");
  $("#note").innerHTML=(rows.length&&!res.review&&MODES[mode]?MODES[mode]+"<br>":"")+
    `المنهج: ${policy.name}. مقاسمة الجد للإخوة بقول الجمهور في الصورة المدعومة فقط؛ وحجب الإخوة بالأب والابن وابن الابن.<br>`+
    "حدود التغطية: "+COVERAGE.join(" ")+"<br>"+
    "التقريب: تُحسب الأنصبة كسورًا دقيقة ثم تُقرَّب لأقرب قرش بطريقة الأكبر باقيًا، فيساوي مجموعها الصافي تمامًا؛ وفرق القرش بين أفراد الفئة يُضاف للأول.<br>"+
    "هذه الحاسبة أداة مساعدة وليست مرجعًا شرعيًا؛ راجع أهل العلم في المسائل المعقدة.";
}

function go(t){
  $$(".tab").forEach(x=>x.classList.toggle("active",x.id===t));
  $$(".tabbar button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));
  if(t==="result")render();try{scrollTo({top:0,behavior:"smooth"})}catch(e){scrollTo(0,0)}
}
$(".tabbar").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.t)});
$("#theme").onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==="dark"?"light":"dark"};
if(window.matchMedia&&matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.dataset.theme="dark";
buildList();
/* حالة الوارث (رقيق/حر): قائمة الفئات + العدد */
$("#stCat").innerHTML=HEIRS.map(h=>`<option value="${h[0]}">${h[2]}</option>`).join("");
$("#stCat").onchange=()=>{$("#stN").value=S[$("#stCat").value]||0};
$("#stN").oninput=()=>{const v=Math.floor(+$("#stN").value);S[$("#stCat").value]=v>0?Math.min(v,MAXN):0};
}
if(typeof module!=="undefined")module.exports={calc,fr,val,F,parseMoney,wasiyya,moneySplit,gfSibRule,POLICIES,STAGES,COVERAGE};
$("#stN").oninput=()=>{const v=Math.floor(+$("#stN").value);S[$("#stCat").value]=v>0?Math.min(v,MAXN):0};

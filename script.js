const $ = s => document.querySelector(s);
const NAV=[
  ['home','Home'],
  ['plan','Tour Plan'],
  ['faculty','Faculty'],
  ['organizers','Organizers'],
  ['notices','Notices'],
  ['gallery','Gallery'],
  ['dashboard.html','Dashboard']
];
const href = i => i.endsWith('.html') ? i : '#'+i;
$('#links').innerHTML=NAV.map(([i,l])=>`<li><a href="${href(i)}" data-n="${i}">${l}</a></li>`).join('');
$('#mnav').innerHTML=NAV.map(([i,l])=>`<a href="${href(i)}" data-n="${i}">${l}</a>`).join('');
$('#bg').onclick=()=>{const o=$('#mnav').classList.toggle('open');$('#bg').setAttribute('aria-expanded',o)};
$('#mnav').onclick = event => {
  if (event.target.closest('a')) {
    $('#mnav').classList.remove('open');
    $('#bg').setAttribute('aria-expanded', 'false');
  }
};
$('#qb').onclick=()=>{const o=$('#qp').classList.toggle('open');$('#qb').setAttribute('aria-expanded',o);$('#qb').textContent=o?'×':'i'};
addEventListener('scroll',()=>{const h=document.documentElement;$('#bar').style.width=(scrollY/(h.scrollHeight-innerHeight)*100)+'%'},{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.15});
const watch=()=>document.querySelectorAll('.reveal,.chap').forEach(n=>io.observe(n));
const nio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)document.querySelectorAll('[data-n]').forEach(a=>a.classList.toggle('on',a.dataset.n===e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});
NAV.forEach(([i])=> {
  const elTarget = document.getElementById(i);
  if(elTarget) nio.observe(elTarget);
});

/* story */
const CH=[['🛩','Above the Bay','The journey begins over the Bay of Bengal, with the long Cox’s Bazar coastline ahead.','#0b3558','#087CA7'],['📍','Cox’s Bazar','Arrive at the world’s longest natural sea beach for breakfast and the jetty.','#087CA7','#37C6D0'],['🚢','Across the Water','Board the ship for Saint Martin, Bangladesh’s only coral island. Snacks on board.','#37C6D0','#087CA7'],['🐠','Beneath the Surface','Saint Martin’s waters hold fragile marine life. We look, we don’t touch.','#087CA7','#052a45'],['🌇','Golden Hour','End each island day with the sunset, and a week of memories with friends.','#052a45','#FF8066']];
$('#story').innerHTML=CH.map((c,i)=>`<div class="chap" style="position:relative;overflow:hidden;background:linear-gradient(${c[3]},${c[4]})"><div class="wrap"><div class="glass"><div class="ic">${c[0]}</div><p class="eyebrow" style="margin-top:6px">Chapter ${i+1}</p><h3>${c[1]}</h3><p>${c[2]}</p></div></div>${i==2?'<div class="shipx">🚢</div>':''}</div>`).join('');

/* itinerary (from the supplied plan) */
const C='c',T='t';
const START=new Date('2027-01-08T00:00:00');
const fd=n=>{const d=new Date(START);d.setDate(d.getDate()+n);return d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})};
const PLAN=[
[0,'Departure','UAP → Cox’s Bazar',['🚌 Bus'],[],'Night bus',[['7:00 PM','Depart from UAP by bus',C]]],
[1,'Sea Crossing','Cox’s Bazar → Saint Martin',['🚢 Ship'],['Breakfast','Snacks','Lunch','Dinner'],'Saint Martin',[['','Morning arrival at Cox’s Bazar',C],['','Heavy breakfast',C],['','Ship journey to Saint Martin (snacks included)',C],['','Afternoon arrival at Saint Martin',C],['','Lunch',C],['','Dinner and overnight stay',C]]],
[2,'Island Day One','Saint Martin',[],['Breakfast','Lunch','Dinner'],'Saint Martin',[['','Breakfast, lunch and dinner',C],['','Island activities and leisure',C]]],
[3,'Island Day Two','Saint Martin',[],['Breakfast','Lunch','Dinner'],'Saint Martin',[['','Breakfast, lunch and dinner',C],['','Island activities and leisure',C]]],
[4,'Return Voyage','Saint Martin → Cox’s Bazar',['🚢 Ship'],['Breakfast','Lunch','Snacks','Dinner'],'Cox’s Bazar',[['','Breakfast and lunch',C],['','Ship journey to Cox’s Bazar (snacks included)',C],['','Dinner and overnight stay',C]]],
[5,'Beach & Rest','Cox’s Bazar',[],['Breakfast','Lunch','Dinner'],'Cox’s Bazar',[['','Breakfast, lunch and dinner',C],['','Rest and leisure',C]]],
[6,'Patuartek Trip','Cox’s Bazar → Patuartek → Dhaka',['🚙 Chander Gari','🚌 Night bus'],['Breakfast','Takeaway lunch','Dinner'],'Night bus',[['','Breakfast at Cox’s Bazar',C],['','Chander Gari trip to Patuartek',C],['','Takeaway lunch',C],['','Return to Cox’s Bazar',C],['','Dinner',C],['','Night bus to Dhaka',C]]],
[7,'Homecoming','Dhaka → UAP',['🚌 Bus'],[],'',[['','Morning arrival at UAP',C]]]];
$('#tl').innerHTML=PLAN.map(([d,t,r,tr,m,st,it],i)=>`<li class="reveal"><span class="dot">📍</span><div class="glass day ${d==1?'open':''}"><button class="t" aria-expanded="${d==1}"><div><div class="d">Day ${d + 1} · ${fd(d)}</div><h3>${t}</h3><div class="r">${r}</div></div><span class="arr">⌄</span></button>
<div class="tags">${tr.map(x=>`<span class="chip" style="background:rgba(8,124,167,.6)">${x}</span>`).join('')}${m.length?`<span class="chip s">🍽 ${m.length} meal${m.length>1?'s':''}</span>`:''}${st?`<span class="chip">🛏 ${st}</span>`:''}</div>
<div class="body"><ul>${it.map(([tm,tx,s])=>`<li><span class="${s==C?'ok':'tn'}">${s==C?'✔':'?'}</span><span>${tm?`<b style="color:var(--sand);margin-right:8px">${tm}</b>`:''}${tx}${s==T?' <em class="tn" style="font-size:12px">tentative</em>':''}</span></li>`).join('')}</ul>${m.length?`<p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,.65)">🍽 ${m.join(' · ')}</p>`:''}</div></div></li>`).join('');
document.querySelectorAll('.day .t').forEach(b=>b.onclick=()=>{const d=b.parentElement;const o=d.classList.toggle('open');b.setAttribute('aria-expanded',o)});

/* people: faculty */
const FACULTY = [
  {
    name: 'Shammi Akhtar',
    role: 'Assistant Professor & Convenor',
    dept: 'CSE',
    img: 'https://cse.uap-bd.edu/media/faculty_photos/Shammi.png?v=1767861223'
  },
  {
    name: 'Rashik Rahman',
    role: 'Assistant Professor & Convenor',
    dept: 'CSE',
    img: 'https://cse.uap-bd.edu/media/faculty_photos/cropped-image_avOoPpB.jpg?v=1768893497'
  },
  {
    name: 'Durjoy Mistry',
    role: 'Assistant Professor & Convenor',
    dept: 'CSE',
    img: 'https://cse.uap-bd.edu/media/faculty_photos/cropped-image_aY6BqyH.png?v=1784791737'
  }
];

$('#fac').innerHTML = FACULTY.map(f => `
  <article class="glass card reveal">
    <div class="av"><img src="${f.img}" alt="${f.name}" loading="lazy"></div>
    <h3>${f.name}</h3>
    <div class="rl">${f.role} · ${f.dept}</div>
    
  </article>
`).join('');

/* notices */
const N=[
  ['urgent','Schedule','Tour details pending confirmation','Year, duration (7 days/6 nights vs 7 nights/6 days) and dates will be confirmed by the organizing committee.','2026-11-03','Organizing Committee'],
  ['important','Payment','Payment deadline — first installment','The 1st installment must be paid within 7th November. Please complete your payment through the official channels.','2026-11-02','Finance']
];

const read=new Set(),tone={urgent:'o',important:'s',normal:''};

function rn(){
  const ntsEl = $('#nts');
  if(ntsEl) {
    ntsEl.innerHTML=N.map((n,i)=>`<button class="nt" data-i="${i}"><span class="chip ${tone[n[0]]}">${n[0]}</span> <span class="chip">${n[1]}</span>${n[0]!='normal'&&!read.has(i)?'<span class="unr"></span>':''}<h3>${n[2]}</h3><p>${n[3]}</p><small>${n[4]} · ${n[5]}</small></button>`).join('');
    document.querySelectorAll('.nt').forEach(b=>b.onclick=()=>{read.add(+b.dataset.i);rn()});
  }
}
rn();

/* gallery */
const G={
  'Cox’s Bazar': [
    {src: 'https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQ_NIcAtzF7uue8Ik1GzkRUBdLWwl6FxICdVTRzwbH29wA8Atmsj7FFFFNVX5Y3PbE6bo7n2PucCiamlrU', title: 'Cox’s Bazar Sea Beach', desc: 'The longest natural sea beach in the world.'},
    {src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', title: 'Sunset Horizon', desc: 'Evening coastline views.'}
  ],
  'Saint Martin': [
    {src: 'https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcTfiB6ymjFGfj2pTtz8XBx-BWE3nkEgcxYsV4YrgDJU_9mczxDUI2TWyH9KYKKYwsIrYqlluSEW27HsCNc', title: 'Saint Martin Island', desc: 'Crystal clear waters and coral shorelines.'},
    {src: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', title: 'Turquoise Waters', desc: 'Protected marine ecosystem.'}
  ]
};
let gt='Cox’s Bazar';
function rg(){
  $('#tabs').innerHTML=Object.keys(G).map(k=>`<button class="${k==gt?'on':''}" data-k="${k}">${k}</button>`).join('');
  $('#gal').innerHTML=G[gt].map(item=>`<figure class="ph"><img src="${item.src}" alt="${item.title}" loading="lazy"><figcaption><b>${item.title}</b><small>${item.desc}</small></figcaption></figure>`).join('');
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{gt=b.dataset.k;rg()});
}
rg();

/* faq */

watch();

/* hero canvas */
(function(){
 const cv = $('#cv');
 if (!cv || !cv.getContext) return;
 const x = cv.getContext('2d');
 if (!x) return;
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
 let W,H,mx=0,my=0,sy=0,t=0;
 const dpr=Math.min(devicePixelRatio||1,innerWidth<768?1:2);
 function size(){W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
 size();addEventListener('resize',size);
 addEventListener('mousemove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
 addEventListener('scroll',()=>sy=Math.min(1,scrollY/innerHeight),{passive:true});
 const clouds=Array.from({length:6},(_,i)=>({x:i*260,y:60+(i%3)*50,s:.6+(i%3)*.35}));
 for(let i=0;i<14;i++){const b=document.createElement('span');b.className='bub';const s=8+(i%4)*6;b.style.cssText=`left:${(i*83)%100}%;width:${s}px;height:${s}px;animation-duration:${10+(i%5)*3}s;animation-delay:${i*1.2}s`;$('#bubs').appendChild(b)}
 function wave(y0,amp,len,sp,col,off){x.fillStyle=col;x.beginPath();x.moveTo(0,H);for(let i=0;i<=W+8;i+=8)x.lineTo(i,y0+Math.sin(i/len+t*sp)*amp+Math.cos(i/(len*.6)+t*sp*.7)*amp*.4);x.lineTo(W,H);x.closePath();x.fill()}
 function cloud(c){x.fillStyle='rgba(255,255,255,.85)';[[0,0,30],[28,6,24],[-28,8,22],[10,-12,22]].forEach(([dx,dy,r])=>{x.beginPath();x.arc(c.x+dx*c.s,c.y+dy*c.s,r*c.s,0,7);x.fill()})}
 function ship(px,py,dir){x.save();x.translate(px,py);x.scale(dir,1);x.rotate(Math.sin(t*1.3)*.03);
  x.fillStyle='#F3E8D0';x.beginPath();x.moveTo(-60,0);x.lineTo(60,0);x.lineTo(46,22);x.lineTo(-48,22);x.closePath();x.fill();
  x.fillStyle='#fff';x.fillRect(-20,-22,52,22);x.fillStyle='#FF8066';x.fillRect(-4,-40,22,18);x.fillStyle='#071C35';for(let i=0;i<4;i++)x.fillRect(-14+i*11,-14,6,6);x.restore()}
 function frame(){t+=reduce?0:.016;
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b3558');g.addColorStop(.55,'#087CA7');g.addColorStop(1,'#37C6D0');x.fillStyle=g;x.fillRect(0,0,W,H);
  const px=-mx*30,py=-my*14,hz=H*(.58-sy*.12);
  const sg=x.createRadialGradient(W*.72+px*.3,hz-60,0,W*.72+px*.3,hz-60,160);sg.addColorStop(0,'rgba(255,217,176,.95)');sg.addColorStop(1,'rgba(255,217,176,0)');x.fillStyle=sg;x.fillRect(0,0,W,H);
  clouds.forEach(c=>{c.x+=reduce?0:.25*c.s;if(c.x>W+120)c.x=-120;cloud({x:c.x+px*.5,y:c.y+py*.5-sy*40,s:c.s})});
  x.strokeStyle='rgba(7,28,53,.75)';x.lineWidth=2;for(let i=0;i<4;i++){const bx=((t*40+i*180)%(W+80))-40,by=90+i*26+Math.sin(t*2+i)*8,f=Math.sin(t*8+i)*6;x.beginPath();x.moveTo(bx-10+px*.7,by+f);x.quadraticCurveTo(bx-4+px*.7,by-6,bx+px*.7,by);x.quadraticCurveTo(bx+4+px*.7,by-6,bx+10+px*.7,by+f);x.stroke()}
  const ix=W*.16+px*.8-sy*120,isz=1+sy*.9;x.save();x.translate(ix,hz);x.scale(isz,isz);
  x.fillStyle='#F3E8D0';x.beginPath();x.ellipse(0,6,130,18,0,0,7);x.fill();x.fillStyle='#2a9d6f';x.beginPath();x.ellipse(0,-6,70,26,0,Math.PI,0);x.fill();
  [[-30,-20],[24,-26]].forEach(([a,b])=>{x.strokeStyle='#6b4f2a';x.lineWidth=4;x.beginPath();x.moveTo(a,-10);x.lineTo(a+4,b-26);x.stroke();x.fillStyle='#1f7a52';x.beginPath();x.arc(a+4,b-28,14,0,7);x.fill()});x.restore();
  wave(hz+10,5,60,1.1,'rgba(8,124,167,.9)');
  const sp=((t*.12)%2),sxp=sp<1?sp:2-sp,dir=sp<1?1:-1;ship(W*.15+sxp*W*.7+px*1.2,hz+16+Math.sin(t*1.4)*3+py,dir);
  wave(hz+34,9,90,1.4,'rgba(5,40,70,.7)');wave(hz+74,13,130,1.0,'rgba(7,28,53,.9)');wave(hz+120,16,180,.8,'rgba(7,28,53,1)');
  if(!reduce)requestAnimationFrame(frame)}
 frame();
})();
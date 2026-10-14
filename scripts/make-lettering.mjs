import { writeFileSync } from 'node:fs';
const out = new URL('../public/assets/forged/', import.meta.url);
// Original centreline drawings, not font outlines. Coordinates describe separate
// brush gestures; pressure, bristle breaks and dry edges are baked into static SVG.
const glyphs = {
 W: {w:122,s:[[[9,19],[23,69],[30,119]],[ [31,116],[56,52],[63,22]],[[61,39],[75,85],[83,117]],[[83,117],[102,62],[113,10]]],p:[[23,15,3],[8,12,5],[21,17,4],[8,14,3]]},
 A: {w:101,s:[[[4,122],[38,61],[63,12]],[[61,16],[75,66],[88,120]],[[25,84],[55,78],[88,80]]],p:[[3,15,8],[25,23,4],[11,8,2]]},
 R: {w:105,s:[[[18,19],[19,69],[12,122]],[[16,24],[60,16],[82,35],[66,62],[23,68]],[[48,65],[69,95],[101,123]]],p:[[24,20,4],[20,22,19,18,7],[23,18,2]]},
 T: {w:97,s:[[[3,26],[45,19],[94,14]],[[54,23],[49,75],[37,123]]],p:[[16,23,3],[22,20,3]]},
 G: {w:109,s:[[[94,30],[62,15],[24,40],[15,87],[44,117],[86,96]],[[57,76],[79,72],[99,67]],[[91,73],[89,97],[88,112]]],p:[[3,19,25,24,18,6],[15,17,3],[17,14,3]]},
 E: {w:91,s:[[[20,23],[19,71],[11,120]],[[16,27],[51,19],[85,17]],[[20,69],[48,62],[74,62]],[[13,117],[47,111],[87,109]]],p:[[22,21,7],[19,22,2],[12,17,2],[20,21,3]]},
 S: {w:103,s:[[[95,23],[66,14],[27,30],[24,51],[67,68],[82,92],[55,114],[13,108],[4,99]]],p:[[2,17,23,22,20,26,21,13,1]]},
 H: {w:106,s:[[[23,17],[19,72],[10,121]],[[95,13],[84,68],[78,120]],[[17,74],[51,66],[88,62]]],p:[[22,23,4],[23,21,3],[14,18,2]]},
 O: {w:109,s:[[[83,26],[54,15],[24,38],[15,84],[41,117],[78,99],[92,55],[79,24]]],p:[[5,18,24,25,22,21,17,3]]},
 P: {w:103,s:[[[23,20],[18,71],[10,123]],[[20,27],[61,17],[84,38],[63,65],[21,70]]],p:[[23,21,4],[18,23,22,19,5]]},
 I: {w:75,s:[[[8,28],[37,22],[72,17]],[[43,25],[35,73],[24,118]],[[0,120],[31,113],[66,109]]],p:[[15,20,2],[21,20,4],[16,20,2]]},
 L: {w:96,s:[[[26,17],[19,70],[10,119]],[[13,117],[47,113],[91,105]]],p:[[23,22,7],[22,21,2]]},
 V: {w:103,s:[[[9,18],[29,74],[41,122]],[[42,118],[72,54],[98,12]]],p:[[24,20,5],[7,14,2]]},
 M: {w:119,s:[[[9,122],[23,62],[35,17]],[[35,22],[49,69],[57,91]],[[58,86],[81,40],[93,15]],[[94,22],[98,73],[104,123]]],p:[[4,15,20],[23,20,5],[6,14,7],[22,23,3]]},
};
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function curve(points,widths){const samples=[];for(let j=0;j<points.length-1;j++){const p0=points[Math.max(0,j-1)],p1=points[j],p2=points[j+1],p3=points[Math.min(points.length-1,j+2)];for(let k=0;k<20;k++){const t=k/20;const calc=i=>.5*((2*p1[i])+(-p0[i]+p2[i])*t+(2*p0[i]-5*p1[i]+4*p2[i]-p3[i])*t*t+(-p0[i]+3*p1[i]-3*p2[i]+p3[i])*t*t*t);samples.push({x:calc(0),y:calc(1),w:widths[j]*(1-t)+widths[j+1]*t});}}samples.push({x:points.at(-1)[0],y:points.at(-1)[1],w:widths.at(-1)});return samples;}
function stroke(points,widths,seed){const r=rng(seed),c=curve(points,widths.map(w=>w*1.38)),left=[],right=[];for(let i=0;i<c.length;i++){const p=c[i],a=c[Math.max(0,i-1)],b=c[Math.min(c.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;left.push([p.x+nx*(p.w/2+(r()-.5)*2.7),p.y+ny*(p.w/2+(r()-.5)*2.7)]);right.push([p.x-nx*(p.w/2+(r()-.5)*2.7),p.y-ny*(p.w/2+(r()-.5)*2.7)]);}const path=pts=>'M'+pts.map(p=>p.map(v=>v.toFixed(2)).join(',')).join('L');let holes='';for(let strand=0;strand<3;strand++){const start=Math.floor((.15+r()*.35)*c.length),end=Math.min(c.length, start+Math.floor(c.length*(.18+r()*.45))),offset=(strand%2?1:-1)*(.3+r()*.15);let pts=[];for(let i=start;i<end;i++){const p=c[i],a=c[Math.max(0,i-1)],b=c[Math.min(c.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1;pts.push([p.x-(b.y-a.y)/len*p.w*offset,p.y+(b.x-a.x)/len*p.w*offset]);}holes+=`<path d="${path(pts)}" fill="none" stroke="black" stroke-width="${(.35+r()*.75).toFixed(2)}"/>`;}
for(let i=0;i<18;i++){const p=c[Math.floor(r()*c.length)];holes+=`<ellipse cx="${p.x+(r()-.5)*p.w*.6}" cy="${p.y+(r()-.5)*p.w*.6}" rx="${.3+r()*.8}" ry="${.2+r()*.4}" fill="black"/>`;}
return {outline:path([...left,...right.reverse()])+'Z',holes};}
for(const word of ['WAR','TARGETS','HOSPITAL','TRAVEL','TEAM']){let x=10,paths='',cuts='',seed=101;for(const [index,ch] of [...word].entries()){const g=glyphs[ch],rot=[-2,1,-1,2,-1,1,-2][index%7];let group='',cut='';for(let i=0;i<g.s.length;i++){const s=stroke(g.s[i],g.p[i],seed++);group+=`<path d="${s.outline}"/>`;cut+=s.holes;}const transform=`translate(${x} ${index%2?3:0}) rotate(${rot} 50 65) skewX(-7)`;paths+=`<g transform="${transform}">${group}</g>`;cuts+=`<g transform="${transform}">${cut}</g>`;x+=g.w+6;}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -5 ${x+16} 150"><title>${word} — original dry-brush lettering</title><defs><mask id="ink"><g fill="white">${paths}</g>${cuts}</mask></defs><path d="M-10-5H${x+16}V145H-10Z" fill="currentColor" mask="url(#ink)"/></svg>`;
writeFileSync(new URL(word.toLowerCase()+'.svg',out),svg);}

// Static, small steel grain/pitting tile. No live turbulence/filter animation.
const r=rng(47);let marks='';for(let i=0;i<170;i++){let x=r()*240,y=r()*180;marks+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(4+r()*35).toFixed(1)} ${(-.3+r()*.6).toFixed(1)}" stroke="${i%3?'#fff':'#000'}" stroke-opacity="${(.03+r()*.12).toFixed(2)}" stroke-width="${(.2+r()*.5).toFixed(2)}"/>`;}
for(let i=0;i<130;i++){marks+=`<ellipse cx="${(r()*240).toFixed(1)}" cy="${(r()*180).toFixed(1)}" rx="${(.2+r()*1.3).toFixed(1)}" ry="${(.2+r()*.6).toFixed(1)}" fill="${i%2?'#fff':'#000'}" opacity="${(.04+r()*.16).toFixed(2)}"/>`;}
writeFileSync(new URL('steel-grain.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180">${marks}</svg>`);

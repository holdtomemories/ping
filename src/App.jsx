import { useState, useEffect, useRef, useCallback, memo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE  — with avatar silhouette centre + ping. logo
// ─────────────────────────────────────────────────────────────────────────────
function PingQR({ user, size = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const N = 29, cell = Math.floor(size / N), actual = cell * N;
    c.width = actual; c.height = actual;
    const bits = new Uint8Array(N * N);

    const finder = (ox, oy) => {
      for (let r = 0; r < 7; r++) for (let k = 0; k < 7; k++) {
        const o = r===0||r===6||k===0||k===6, inn = r>=2&&r<=4&&k>=2&&k<=4;
        if (ox+k<N && oy+r<N) bits[(oy+r)*N+(ox+k)] = (o||inn)?1:0;
      }
    };
    finder(0,0); finder(N-7,0); finder(0,N-7);
    for (let i=0;i<9;i++){bits[8*N+i]=2;bits[i*N+8]=2;bits[(N-8+i)*N+8]=2;bits[8*N+(N-8+i)]=2;}
    for (let i=8;i<N-8;i++){if(!bits[6*N+i])bits[6*N+i]=i%2===0?1:0;if(!bits[i*N+6])bits[i*N+6]=i%2===0?1:0;}

    // Encode username as data pattern
    const enc = Array.from(`https://ping.app/@${user?.username||"guest"}`).map(ch=>ch.charCodeAt(0));
    let bi = 0;
    for (let r=0;r<N;r++) for (let k=0;k<N;k++) {
      if (bits[r*N+k]===0) {
        const b=enc[bi%enc.length]||0, v=(b>>(bi%8))&1;
        bits[r*N+k]=v^((r+k+bi)%5===0?1:0)?1:0; bi++;
      }
    }

    // Draw base QR in avatar colour
    const colour = user?.avatar||"#4F8EF7";
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,actual,actual);
    for (let r=0;r<N;r++) for (let k=0;k<N;k++) {
      const v=bits[r*N+k];
      ctx.fillStyle = v===2?"#666" : v===1?colour : "#fff";
      ctx.fillRect(k*cell, r*cell, cell, cell);
    }

    // Centre clear zone
    const cz = cell*7, cx2 = Math.floor((actual-cz)/2), cy2 = Math.floor((actual-cz)/2);
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.roundRect(cx2-2,cy2-2,cz+4,cz+4,8); ctx.fill();

    // Avatar silhouette or initial
    if (user?.photo) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(cx2,cy2,cz,cz,6); ctx.clip();
        // Draw greyscale
        ctx.filter="grayscale(100%) contrast(1.4)";
        ctx.drawImage(img, cx2, cy2, cz, cz);
        ctx.filter="none";
        ctx.restore();
        // Overlay ping. logo
        ctx.fillStyle = colour; ctx.globalAlpha=0.9;
        ctx.fillRect(cx2, cy2+cz-cell*2.2, cz, cell*2.2);
        ctx.globalAlpha=1;
        ctx.fillStyle="#fff"; ctx.font=`bold ${cell*1.1}px 'Georgia',serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("ping.", actual/2, cy2+cz-cell*1.1);
      };
      img.src = user.photo;
    } else {
      // Abstract silhouette from colour
      ctx.fillStyle = colour; ctx.globalAlpha=0.15;
      ctx.beginPath(); ctx.roundRect(cx2,cy2,cz,cz,6); ctx.fill();
      ctx.globalAlpha=1;
      // Person silhouette
      ctx.fillStyle = colour; ctx.globalAlpha=0.6;
      const hr=cz*0.22, pr=cz*0.18;
      ctx.beginPath(); ctx.arc(actual/2, cy2+hr+2, hr, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(actual/2, cy2+cz*0.75, pr, 0, Math.PI*0.95); ctx.fill();
      ctx.globalAlpha=1;
      // ping. text
      ctx.fillStyle = colour;
      ctx.font=`bold ${cell*1.05}px 'Georgia',serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("ping.", actual/2, cy2+cz*0.88);
    }
  }, [user, size]);
  return <canvas ref={canvasRef} style={{imageRendering:"pixelated",width:size,height:size,borderRadius:8}}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const I = {
  Home:     ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search:   ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><circle cx="11"cy="11"r="8"/><line x1="21"y1="21"x2="16.65"y2="16.65"/></svg>,
  Bell:     ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Mail:     ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  User:     ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12"cy="7"r="4"/></svg>,
  Heart:    ({f})=><svg width="17"height="17"viewBox="0 0 24 24"fill={f?"#F75F4F":"none"}stroke={f?"#F75F4F":"currentColor"}strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Comment:  ()=><svg width="17"height="17"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Repost:   ({a})=><svg width="17"height="17"viewBox="0 0 24 24"fill="none"stroke={a?"#4FF7A0":"currentColor"}strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  Share:    ()=><svg width="17"height="17"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"><circle cx="18"cy="5"r="3"/><circle cx="6"cy="12"r="3"/><circle cx="18"cy="19"r="3"/><line x1="8.59"y1="13.51"x2="15.42"y2="17.49"/><line x1="15.41"y1="6.51"x2="8.59"y2="10.49"/></svg>,
  Bkmk:     ({f})=><svg width="17"height="17"viewBox="0 0 24 24"fill={f?"#F7C84F":"none"}stroke={f?"#F7C84F":"currentColor"}strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  Close:    ()=><svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><line x1="18"y1="6"x2="6"y2="18"/><line x1="6"y1="6"x2="18"y2="18"/></svg>,
  Back:     ()=><svg width="20"height="20"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Send:     ()=><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><line x1="22"y1="2"x2="11"y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Check:    ()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Gear:     ()=><svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Plus:     ()=><svg width="22"height="22"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.2"strokeLinecap="round"><line x1="12"y1="5"x2="12"y2="19"/><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  QR:       ()=><svg width="17"height="17"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><rect x="3"y="3"width="7"height="7"/><rect x="14"y="3"width="7"height="7"/><rect x="3"y="14"width="7"height="7"/><rect x="5"y="5"width="3"height="3"fill="currentColor"/><rect x="16"y="5"width="3"height="3"fill="currentColor"/><rect x="5"y="16"width="3"height="3"fill="currentColor"/></svg>,
  Sun:      ()=><svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><circle cx="12"cy="12"r="5"/><line x1="12"y1="1"x2="12"y2="3"/><line x1="12"y1="21"x2="12"y2="23"/><line x1="4.22"y1="4.22"x2="5.64"y2="5.64"/><line x1="18.36"y1="18.36"x2="19.78"y2="19.78"/><line x1="1"y1="12"x2="3"y2="12"/><line x1="21"y1="12"x2="23"y2="12"/><line x1="4.22"y1="19.78"x2="5.64"y2="18.36"/><line x1="18.36"y1="5.64"x2="19.78"y2="4.22"/></svg>,
  Moon:     ()=><svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Link:     ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  Eye:      ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12"cy="12"r="3"/></svg>,
  Refresh:  ()=><svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Trash:    ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Lock:     ()=><svg width="11"height="11"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.2"strokeLinecap="round"strokeLinejoin="round"><rect x="3"y="11"width="18"height="11"rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Unlock:   ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="3"y="11"width="18"height="11"rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
  Camera:   ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12"cy="13"r="4"/></svg>,
  Download: ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12"y1="15"x2="12"y2="3"/></svg>,
  Globe:    ()=><svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="12"cy="12"r="10"/><line x1="2"y1="12"x2="22"y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Warn:     ()=><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12"y1="9"x2="12"y2="13"/><line x1="12"y1="17"x2="12.01"y2="17"/></svg>,
  IG:       ()=><svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="2"y="2"width="20"height="20"rx="5"/><circle cx="12"cy="12"r="4"/><circle cx="17.5"cy="6.5"r="1"fill="currentColor"/></svg>,
  ReplyArr: ()=><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>,
  Star:     ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="currentColor"stroke="currentColor"strokeWidth="1.5"strokeLinecap="round"strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Apple:    ()=><svg width="16"height="16"viewBox="0 0 24 24"fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
  Trophy:   ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12"y1="17"x2="12"y2="13"/><path d="M6 9H4a2 2 0 010-4h2M18 9h2a2 2 0 010 4h-2M6 5h12v6a6 6 0 01-12 0V5z"/></svg>,
  Spark:    ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="currentColor"stroke="none"><path d="M13 2L4.09 12.96 11 12.5 10.5 22 19.91 11.04 13 11.5z"/></svg>,
  LogOut:   ()=><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21"y1="12"x2="9"y2="12"/></svg>,
  Shield:   ()=><svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Mail2:    ()=><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
let _id = 400;
const uid = () => `${++_id}`;
const ts  = m => Date.now() - m * 60000;
const COLORS = ["#4F8EF7","#F75F4F","#4FF7A0","#F7C84F","#C84FF7","#4FF7F0"];
const pickColor = n => COLORS[n.charCodeAt(0) % COLORS.length];

const INIT_USERS = [
  {id:"u1",username:"mara", bio:"product + systems thinking",      isPrivate:false,following:["u2","u3"],followers:["u2","u4"],avatar:"#4F8EF7",photo:null},
  {id:"u2",username:"felix",bio:"building in public. infra nerd.", isPrivate:false,following:["u1","u4"],followers:["u1","u3"],avatar:"#F75F4F",photo:null},
  {id:"u3",username:"yuki", bio:"ux / motion / coffee",            isPrivate:false,following:["u1","u2"],followers:["u2","u4"],avatar:"#4FF7A0",photo:null},
  {id:"u4",username:"dom",  bio:"night owl. security.",            isPrivate:true, following:["u1","u3"],followers:["u1","u2"],avatar:"#F7C84F",photo:null},
];
const p1=uid(),p2=uid(),p3=uid(),p4=uid(),p5=uid(),p6=uid();
const INIT_POSTS = [
  {id:p1,userId:"u2",content:"shipped the new deploy pipeline. 40% faster cold starts.",    createdAt:ts(4), likes:["u1","u3"],reposts:[],     bookmarks:[],    shares:3, uniqueViewers:["u1","u3","u4"],isPublic:false},
  {id:p2,userId:"u3",content:"the space between elements does more work than the elements.",createdAt:ts(9), likes:["u1","u2"],reposts:["u1"], bookmarks:["u1"],shares:7, uniqueViewers:["u1","u2","u4"],isPublic:false},
  {id:p3,userId:"u1",content:"the best meetings could've been a 3-line ping",              createdAt:ts(14),likes:["u2"],     reposts:[],     bookmarks:[],    shares:2, uniqueViewers:["u2","u3"],      isPublic:false},
  {id:p4,userId:"u4",content:"spent 2hrs reading CVEs. the internet is tape.",              createdAt:ts(22),likes:[],         reposts:[],     bookmarks:[],    shares:0, uniqueViewers:["u1"],           isPublic:false},
  {id:p5,userId:"u2",content:"postgres > everything. fight me.",                            createdAt:ts(35),likes:["u3","u1"],reposts:["u3"], bookmarks:[],    shares:12,uniqueViewers:["u1","u3","u4"],isPublic:false},
  {id:p6,userId:"u3",content:"motion design is the grammar of digital space",               createdAt:ts(51),likes:["u1"],     reposts:[],     bookmarks:["u2"],shares:5, uniqueViewers:["u1","u2"],      isPublic:false},
];
const INIT_REPLIES = [
  {id:uid(),postId:p1,userId:"u1",content:"@felix numbers or it didn't happen 👀",      createdAt:ts(3), likes:["u2"]},
  {id:uid(),postId:p1,userId:"u3",content:"@felix cold start latency is so underrated", createdAt:ts(2), likes:[]},
  {id:uid(),postId:p3,userId:"u2",content:"@mara every standup could be a ping thread", createdAt:ts(13),likes:["u1"]},
  {id:uid(),postId:p5,userId:"u1",content:"@felix no debate here honestly",              createdAt:ts(30),likes:[]},
];
const INIT_NOTIFS = [
  {id:uid(),type:"like",  fromId:"u2",postId:p3,  read:false,createdAt:ts(5)},
  {id:uid(),type:"reply", fromId:"u3",postId:p2,  read:false,createdAt:ts(9)},
  {id:uid(),type:"repost",fromId:"u1",postId:p2,  read:true, createdAt:ts(20)},
  {id:uid(),type:"follow",fromId:"u2",postId:null,read:true, createdAt:ts(40)},
];
const INIT_MSGS = {
  "u1_u2":[
    {id:uid(),fromId:"u2",text:"hey, saw your ping about meetings — so true",createdAt:ts(30)},
    {id:uid(),fromId:"u1",text:"right? every standup is a waste",             createdAt:ts(29)},
    {id:uid(),fromId:"u2",text:"we should do async standups with pings",      createdAt:ts(28)},
  ],
  "u1_u3":[
    {id:uid(),fromId:"u3",text:"loved your post on space and elements",  createdAt:ts(120)},
    {id:uid(),fromId:"u1",text:"glad it resonated! motion is everything",createdAt:ts(119)},
  ],
};
const BOT_LINES = [
  "something just clicked and i can't explain it",
  "hotfix deployed. coffee is now a food group.",
  "the diff is cleaner than expected",
  "finally got the animation timing right",
  "sometimes the bug is the feature",
  "reading old notes is humbling",
  "shipped it. no rollback needed. rare.",
  "late night debugging hits different",
];

// Milestone thresholds (exponential) for view counts
const VIEW_MILESTONES = [1,10,50,100,500,1000,5000];
// Milestone messages
const milestoneMsg = (n,content) => {
  const snippets = {
    1:  `Your ping just got its first view! The conversation has started. ✨`,
    10: `People are taking notice — your ping crossed 10 views. 👀`,
    50: `Nice momentum — 50 people have seen what you had to say.`,
    100:`Triple digits! 100 people have seen your ping. 🎯`,
    500:`Your ping is spreading — 500 views and counting. 🔥`,
    1000:`Huge reach! Your ping hit 1,000 views. People are definitely seeing this. 🚀`,
    5000:`Viral territory — 5K views on your ping. You're sparking a trend. 🌊`,
  };
  return snippets[n] || `Your ping just hit ${n} views!`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const timeAgo = t => {
  const d=Math.floor((Date.now()-t)/1000);
  if(d<60)return`${d}s`; if(d<3600)return`${Math.floor(d/60)}m`;
  if(d<86400)return`${Math.floor(d/3600)}h`; return`${Math.floor(d/86400)}d`;
};
const fmtNum = n => {
  if(n>=1e6)return`${(n/1e6).toFixed(1).replace(/\.0$/,"")}M`;
  if(n>=1e3)return`${(n/1e3).toFixed(1).replace(/\.0$/,"")}K`;
  return n>0?`${n}`:"";
};
const dmKey = (a,b) => [a,b].sort().join("_");

// ─────────────────────────────────────────────────────────────────────────────
// THEME  — complete light/dark token sets
// ─────────────────────────────────────────────────────────────────────────────
const DARK = {
  bg:"#0a0a0a",bg2:"#111",bg3:"#1c1c1c",
  border:"#222",border2:"#2e2e2e",
  text:"#f2f2f2",text2:"#b0b0b0",text3:"#555",
  muted:"#333",accent:"#f2f2f2",
  cardHover:"#111",tabActive:"#f2f2f2",
  inputBg:"#1c1c1c",replyBg:"#111",
  navBg:"rgba(10,10,10,0.92)",
  barText:"#f2f2f2", barIcon:"#888",
};
const LIGHT = {
  bg:"#ffffff",bg2:"#f5f5f5",bg3:"#ebebeb",
  border:"#e5e5e5",border2:"#d8d8d8",
  text:"#0a0a0a",text2:"#444",text3:"#999",
  muted:"#ccc",accent:"#0a0a0a",
  cardHover:"#fafafa",tabActive:"#0a0a0a",
  inputBg:"#f0f0f0",replyBg:"#f5f5f5",
  navBg:"rgba(255,255,255,0.92)",
  barText:"#0a0a0a", barIcon:"#555",
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
const Av = memo(function Av({user,size=34}) {
  const color=user?.avatar||"#4F8EF7",name=user?.username||"?",photo=user?.photo;
  if(photo) return (
    <div style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",flexShrink:0}}>
      <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={name}/>
    </div>
  );
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0,userSelect:"none"}}>
      {name[0].toUpperCase()}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAR COUNTER
// ─────────────────────────────────────────────────────────────────────────────
function CC({n,max,T}) {
  const r=max-n,warn=n>=max*0.8,danger=n>=max;
  return <span style={{fontSize:12,fontWeight:warn?700:400,color:danger?"#F75F4F":warn?"#F7C84F":T.text3}}>{danger?`-${Math.abs(r)}`:r}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE TOAST
// ─────────────────────────────────────────────────────────────────────────────
function MilestoneToast({milestone,onDismiss}) {
  useEffect(()=>{
    const t=setTimeout(onDismiss,5000);
    return()=>clearTimeout(t);
  },[onDismiss]);
  return (
    <div style={{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",
      background:"linear-gradient(135deg,#4F8EF7,#7C4FF7)",
      color:"#fff",padding:"12px 18px",borderRadius:14,zIndex:1000,
      display:"flex",alignItems:"center",gap:10,maxWidth:320,
      boxShadow:"0 8px 32px rgba(79,142,247,.4)",
      animation:"milestoneIn .3s cubic-bezier(.34,1.56,.64,1)",cursor:"pointer"}
    } onClick={onDismiss}>
      <div style={{fontSize:20,flexShrink:0}}>
        {milestone.n>=1000?"🚀":milestone.n>=100?"🔥":milestone.n>=10?"👀":"✨"}
      </div>
      <div style={{flex:1,fontSize:13,lineHeight:1.5}}>{milestone.msg}</div>
      <button onClick={e=>{e.stopPropagation();onDismiss();}}
        style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",
          width:22,height:22,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>
        <I.Close/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC BADGE
// ─────────────────────────────────────────────────────────────────────────────
function PublicBadge() {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,
      color:"#4F8EF7",background:"rgba(79,142,247,.12)",padding:"2px 7px",borderRadius:20}}>
      <I.Globe/> public
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLD-TO-DELETE (Poka-yoke — 1.8s ring + confirmation)
// ─────────────────────────────────────────────────────────────────────────────
function HoldToDelete({onDelete,T}) {
  const [progress,setProgress]=useState(0);
  const [holding,setHolding]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const rafRef=useRef(null),startRef=useRef(null);
  const DURATION=1800;

  const start=useCallback(e=>{
    e.preventDefault();e.stopPropagation();
    setHolding(true);startRef.current=performance.now();
    const tick=()=>{
      const pct=Math.min((performance.now()-startRef.current)/DURATION*100,100);
      setProgress(pct);
      if(pct<100){rafRef.current=requestAnimationFrame(tick);}
      else{setHolding(false);setConfirm(true);}
    };
    rafRef.current=requestAnimationFrame(tick);
  },[]);

  const cancel=useCallback(()=>{
    if(rafRef.current)cancelAnimationFrame(rafRef.current);
    setHolding(false);setProgress(0);
  },[]);

  if(confirm) return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",animation:"slideDown .15s ease-out"}}>
      <span style={{fontSize:12,color:"#F75F4F",fontWeight:600}}>delete this ping?</span>
      <button onClick={()=>{setConfirm(false);onDelete();}}
        style={{background:"#F75F4F",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,padding:"4px 12px",cursor:"pointer"}}>yes, delete</button>
      <button onClick={()=>{setConfirm(false);setProgress(0);}}
        style={{background:"none",border:`1px solid ${T.border2}`,borderRadius:7,fontSize:12,color:T.text3,padding:"4px 10px",cursor:"pointer"}}>cancel</button>
    </div>
  );

  return (
    <div onMouseDown={start} onMouseUp={cancel} onMouseLeave={cancel}
      onTouchStart={start} onTouchEnd={cancel}
      style={{display:"inline-flex",alignItems:"center",gap:5,cursor:"pointer",userSelect:"none",
        color:holding?"#F75F4F":T.text3,fontSize:12,padding:"3px 0",
        transition:"color .15s",WebkitTapHighlightColor:"transparent"}}>
      <div style={{position:"relative",width:20,height:20,flexShrink:0}}>
        <svg width="20"height="20"viewBox="0 0 20 20"style={{transform:"rotate(-90deg)"}}>
          <circle cx="10"cy="10"r="8"fill="none"stroke={T.border2}strokeWidth="2"/>
          <circle cx="10"cy="10"r="8"fill="none"
            stroke={progress>0?"#F75F4F":T.text3}strokeWidth="2"
            strokeDasharray={`${2*Math.PI*8}`}
            strokeDashoffset={`${2*Math.PI*8*(1-progress/100)}`}
            strokeLinecap="round"
            style={{transition:"stroke-dashoffset .03s linear"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <I.Trash/>
        </div>
      </div>
      <span style={{fontSize:11}}>{holding?`${Math.round(progress)}%`:"hold to delete"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SWIPE-REVEAL  — with confirmation step before deletion
// ─────────────────────────────────────────────────────────────────────────────
function SwipeReveal({children,onDelete,T}) {
  const [dx,setDx]=useState(0),[active,setActive]=useState(false),[confirm,setConfirm]=useState(false);
  const startX=useRef(0);
  const THRESH=90;

  if(confirm) return (
    <div style={{background:T.bg3,borderBottom:`1px solid ${T.border}`,
      padding:"14px 16px",display:"flex",alignItems:"center",gap:10,animation:"slideDown .15s ease-out"}}>
      <span style={{fontSize:13,color:T.text2,flex:1}}>delete this ping?</span>
      <button onClick={()=>{setConfirm(false);onDelete();}}
        style={{background:"#F75F4F",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,padding:"6px 16px",cursor:"pointer"}}>delete</button>
      <button onClick={()=>{setConfirm(false);setDx(0);}}
        style={{background:"none",border:`1px solid ${T.border2}`,borderRadius:8,fontSize:13,color:T.text3,padding:"6px 12px",cursor:"pointer"}}>cancel</button>
    </div>
  );

  return (
    <div style={{position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:THRESH,background:"#F75F4F",
        display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",gap:4,fontSize:12,fontWeight:600}}>
        <I.Trash/> delete
      </div>
      <div style={{transform:`translateX(${dx}px)`,transition:dx===0?"transform .2s":"none",background:T.bg}}
        onTouchStart={e=>{startX.current=e.touches[0].clientX;setActive(true);}}
        onTouchMove={e=>{if(!active)return;const d=e.touches[0].clientX-startX.current;if(d<0)setDx(Math.max(d,-THRESH-10));}}
        onTouchEnd={()=>{setActive(false);if(dx<-THRESH){setConfirm(true);setDx(0);}else setDx(0);}}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PULL-TO-REFRESH
// ─────────────────────────────────────────────────────────────────────────────
function PullToRefresh({children,onRefresh,T}) {
  const [pullY,setPullY]=useState(0),[busy,setBusy]=useState(false);
  const startY=useRef(0),el=useRef(null);
  return (
    <div ref={el} style={{overflowY:"auto",height:"100%"}}
      onTouchStart={e=>{startY.current=e.touches[0].clientY;}}
      onTouchMove={e=>{if(el.current?.scrollTop>0)return;const dy=e.touches[0].clientY-startY.current;if(dy>0)setPullY(Math.min(dy*0.45,74));}}
      onTouchEnd={async()=>{if(pullY>=64){setBusy(true);await new Promise(r=>setTimeout(r,900));onRefresh();setBusy(false);}setPullY(0);}}>
      {(pullY>0||busy)&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:pullY||36,color:T.text3,fontSize:12,gap:6}}>
          <div style={{animation:busy?"spin .8s linear infinite":"none",display:"flex"}}><I.Refresh/></div>
          {busy&&"refreshing"}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC LINK SAFETY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PublicLinkModal({post,T,onConfirm,onCancel}) {
  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div className="sheet fadeIn" style={{padding:24,maxWidth:400}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(247,200,79,.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"#F7C84F",flexShrink:0}}>
            <I.Warn/>
          </div>
          <div style={{fontSize:15,fontWeight:700,color:T.text}}>make this ping public?</div>
        </div>
        <div style={{background:T.bg3,borderRadius:12,padding:"12px 14px",marginBottom:18,fontSize:13,
          color:T.text2,lineHeight:1.65,borderLeft:"3px solid #F7C84F"}}>
          This will only make <strong style={{color:T.text}}>this specific post</strong> visible to the public. Your profile and other pings will remain private.
        </div>
        <div style={{background:T.bg3,borderRadius:8,padding:"10px 12px",marginBottom:20,fontSize:12,color:T.text3}}>
          <div style={{fontWeight:600,color:T.text2,marginBottom:4,display:"flex",alignItems:"center",gap:5}}><I.Globe/> preview</div>
          "{post.content.slice(0,80)}{post.content.length>80?"…":""}"
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px 0",background:"none",border:`1px solid ${T.border2}`,borderRadius:10,cursor:"pointer",fontSize:14,color:T.text2,fontWeight:500}}>keep private</button>
          <button onClick={onConfirm} style={{flex:1,padding:"10px 0",background:"#4F8EF7",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,color:"#fff",fontWeight:600}}>generate public link</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY EXPORT
// ─────────────────────────────────────────────────────────────────────────────
async function capturePostAsStory(post,author,dark) {
  const W=1080,H=1920,c=document.createElement("canvas");
  c.width=W;c.height=H;const ctx=c.getContext("2d");
  ctx.fillStyle=dark?"#0a0a0a":"#fff";ctx.fillRect(0,0,W,H);
  const cx=80,cy=H/2-300,cw=W-160;
  ctx.shadowColor="rgba(0,0,0,.3)";ctx.shadowBlur=60;ctx.shadowOffsetY=20;
  ctx.fillStyle=dark?"#1c1c1c":"#f5f5f5";ctx.beginPath();ctx.roundRect(cx,cy,cw,600,32);ctx.fill();
  ctx.shadowColor="transparent";
  const ax=cx+56,ay=cy+72;
  ctx.fillStyle=author?.avatar||"#4F8EF7";ctx.beginPath();ctx.arc(ax,ay,38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="bold 32px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText((author?.username?.[0]||"?").toUpperCase(),ax,ay+1);
  ctx.fillStyle=dark?"#f2f2f2":"#0a0a0a";ctx.font="bold 34px system-ui";ctx.textAlign="left";ctx.textBaseline="middle";
  ctx.fillText(`@${author?.username||"?"}`,cx+106,ay);
  ctx.fillStyle=dark?"#aaa":"#666";ctx.font="24px system-ui";ctx.fillText(timeAgo(post.createdAt),cx+106,ay+30);
  ctx.fillStyle=dark?"#f2f2f2":"#0a0a0a";ctx.font="42px Georgia,serif";ctx.textAlign="left";ctx.textBaseline="top";
  const words=post.content.split(" ");let lines=[],ln="";
  for(const w of words){const t=ln?ln+" "+w:w;if(ctx.measureText(t).width>cw-100){lines.push(ln);ln=w;}else ln=t;}
  if(ln)lines.push(ln);
  lines.forEach((l,i)=>ctx.fillText(l,cx+50,cy+160+i*58));
  ctx.fillStyle="#4FF7A0";ctx.beginPath();ctx.roundRect(W/2-260,H-180,520,76,38);ctx.fill();
  ctx.fillStyle="#ffffff";ctx.font="bold 26px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText("read on ping.app →",W/2,H-142);
  const url=`https://ping.app/p/${post.id}`;
  c.toBlob(blob=>{
    if(!blob)return;const burl=URL.createObjectURL(blob);
    if(navigator.share){
      const f=new File([blob],`ping-${post.id}.png`,{type:"image/png"});
      navigator.share({files:[f],title:`ping. by @${author?.username}`,url}).catch(()=>{const a=document.createElement("a");a.href=burl;a.download=`ping-story-${post.id}.png`;a.click();});
    }else{const a=document.createElement("a");a.href=burl;a.download=`ping-story-${post.id}.png`;a.click();}
    setTimeout(()=>URL.revokeObjectURL(burl),10000);
  },"image/png");
}
function exportContact(u) {
  const v=`BEGIN:VCARD\nVERSION:3.0\nFN:${u.username}\nNICKNAME:${u.username}\nURL:https://ping.app/@${u.username}\nNOTE:${u.bio||""}\nEND:VCARD`;
  const blob=new Blob([v],{type:"text/vcard"}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`${u.username}.vcf`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE REPLY — FIX: uncontrolled textarea to prevent keyboard dismiss
// Root cause: `value={text}` on a controlled textarea in a `memo` component
// causes React to re-render+remount on every keystroke inside a modal overlay,
// which repositions the DOM and iOS dismisses the keyboard.
// Fix: use an uncontrolled ref-based textarea + manual submit, 
// only reading value on submit/change rather than syncing on every render.
// ─────────────────────────────────────────────────────────────────────────────
const InlineReply = memo(function InlineReply({postId,author,me,T,onSubmit,onClose,anchorRef}) {
  // Use uncontrolled — avoids re-render loop that dismisses keyboard
  const taRef  = useRef(null);
  const wrapRef= useRef(null);
  const [charCount,setCharCount]=useState(0);
  const prefix = `@${author?.username||""} `;
  const MAX = 240;

  useEffect(()=>{
    if(!taRef.current) return;
    taRef.current.value = prefix;
    taRef.current.focus();
    const l=taRef.current.value.length;
    taRef.current.setSelectionRange(l,l);
    setCharCount(l);
  },[]);

  // Smooth scroll to keep parent in view
  useEffect(()=>{
    anchorRef?.current?.scrollIntoView({behavior:"smooth",block:"nearest"});
  },[]);

  const grow=()=>{
    if(!taRef.current)return;
    taRef.current.style.height="auto";
    taRef.current.style.height=taRef.current.scrollHeight+"px";
  };

  const handleInput=()=>{
    grow();
    setCharCount(taRef.current?.value?.length||0);
  };

  const submit=()=>{
    const val=taRef.current?.value?.trim()||"";
    const canPost=val.length>0 && val!==prefix.trim() && val.length<=MAX;
    if(!canPost)return;
    onSubmit(postId,val);
    onClose();
  };

  const handleKey=e=>{
    if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submit();
    if(e.key==="Escape")onClose();
  };

  const canPost=charCount>prefix.length && charCount<=MAX;

  return (
    <div ref={wrapRef} style={{background:T.replyBg,borderTop:`1px solid ${T.border}`,
      borderBottom:`1px solid ${T.border}`,padding:"12px 16px 14px",
      display:"flex",gap:10,alignItems:"flex-start",animation:"slideDown .18s ease-out"}}>
      <Av user={me} size={30}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
          <span style={{fontSize:12,color:"#4F8EF7",fontWeight:600}}>↳</span>
          <span style={{fontSize:12,color:T.text3}}>replying to</span>
          <span style={{fontSize:12,color:"#4F8EF7",fontWeight:700}}>@{author?.username}</span>
        </div>
        {/* Uncontrolled textarea — no `value` prop, only defaultValue-like initialisation via ref */}
        <textarea
          ref={taRef}
          onInput={handleInput}
          onKeyDown={handleKey}
          rows={2}
          style={{width:"100%",fontSize:14,lineHeight:1.6,color:T.text,background:"transparent",
            border:"none",outline:"none",resize:"none",display:"block",minHeight:44,
            fontFamily:"system-ui,-apple-system,sans-serif"}}
          placeholder={`reply to @${author?.username}…`}
        />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
          <span style={{fontSize:12,color:charCount>MAX?"#F75F4F":charCount>MAX*0.8?"#F7C84F":T.text3,fontWeight:charCount>MAX*0.8?700:400}}>
            {MAX-charCount}
          </span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:T.text3}}>⌘↵</span>
            <button onClick={onClose}
              style={{background:"none",border:`1px solid ${T.border2}`,cursor:"pointer",color:T.text3,
                fontSize:13,padding:"4px 12px",borderRadius:8}}>cancel</button>
            <button onClick={submit} disabled={!canPost}
              style={{background:canPost?"#4F8EF7":"transparent",color:canPost?"#fff":T.text3,
                border:`1px solid ${canPost?"#4F8EF7":T.border2}`,cursor:canPost?"pointer":"not-allowed",
                fontSize:13,fontWeight:600,padding:"4px 16px",borderRadius:8,opacity:canPost?1:.4,transition:"all .15s"}}>
              reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BAR
// ─────────────────────────────────────────────────────────────────────────────
const ActionBar = memo(function ActionBar({post,myId,T,onLike,onRepost,onBookmark,onReply,onShare,replyActive}) {
  const liked=post.likes.includes(myId),reposted=post.reposts.includes(myId),bookmarked=post.bookmarks.includes(myId);
  const uv=(post.uniqueViewers||[]).length;
  const items=[
    {icon:<I.Heart f={liked}/>,    count:post.likes.length,      col:liked?"#F75F4F":"#888",    hi:"#F75F4F",bg:"rgba(247,95,79,.1)",  fn:onLike},
    {icon:<I.Comment/>,            count:post.replyCount||0,     col:replyActive?"#4F8EF7":"#888",hi:"#4F8EF7",bg:"rgba(79,142,247,.1)",fn:onReply},
    {icon:<I.Repost a={reposted}/>,count:post.reposts.length,    col:reposted?"#4FF7A0":"#888", hi:"#4FF7A0",bg:"rgba(79,247,160,.1)", fn:onRepost},
    {icon:<I.Share/>,              count:post.shares||0,         col:"#888",                    hi:"#F7C84F",bg:"rgba(247,200,79,.1)", fn:onShare},
    {icon:<I.Bkmk f={bookmarked}/>,count:post.bookmarks.length,  col:bookmarked?"#F7C84F":"#888",hi:"#F7C84F",bg:"rgba(247,200,79,.1)",fn:onBookmark},
  ];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:4}}>
      {items.map((item,i)=>(
        <button key={i} onClick={item.fn}
          style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",
            gap:5,padding:"5px 3px",borderRadius:6,color:item.col,transition:"color .15s,background .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=item.bg;e.currentTarget.style.color=item.hi;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=item.col;}}>
          {item.icon}
          {item.count>0&&<span style={{fontSize:12,fontWeight:500}}>{item.count}</span>}
        </button>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:3,color:"#666",opacity:.7}}>
        <I.Eye/><span style={{fontSize:11}}>{fmtNum(uv)||"—"}</span>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST CARD
// ─────────────────────────────────────────────────────────────────────────────
const PostCard = memo(function PostCard({
  post,author,me,allReplies,getUser,isNew,T,dark,
  inlineReplyOpen,onToggleReply,
  onLike,onRepost,onBookmark,onShare,onProfile,onFollow,onExpand,
  onDeleteOptimistic,onMakePublic,
}) {
  const myId=me?.id,isOwn=post.userId===myId,following=me?.following?.includes(author.id);
  const gated=author.isPrivate&&author.id!==myId&&!me?.following?.includes(author.id);
  const repCount=allReplies.length,preview=allReplies[allReplies.length-1];
  const anchorRef=useRef(null);

  const card=(
    <div ref={anchorRef} className={`card${isNew?" newPing":""}`}>
      <div style={{display:"flex",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0}}>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:0}} onClick={()=>onProfile(author.id)}>
            <Av user={author} size={40}/>
          </button>
          {me&&author.id!==myId&&(
            <button onClick={()=>onFollow(author.id)}
              style={{background:"none",border:"none",cursor:"pointer",padding:2,
                color:following?"#4FF7A0":T.muted,fontSize:following?11:18,lineHeight:1,display:"flex",alignItems:"center",transition:"color .15s"}}>
              {following?<I.Check/>:<span>+</span>}
            </button>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
            <button className="uBtn" onClick={()=>onProfile(author.id)}>@{author.username}</button>
            {author.isPrivate&&<span style={{color:T.text3,display:"flex",alignItems:"center"}}><I.Lock/></span>}
            {post.isPublic&&author.isPrivate&&<PublicBadge/>}
            <span style={{color:T.text3,fontSize:12,marginLeft:"auto"}}>{timeAgo(post.createdAt)}</span>
          </div>
          {gated
            ?<div style={{color:T.text3,fontSize:14,fontStyle:"italic"}}>private account</div>
            :<div style={{fontSize:15,lineHeight:1.65,color:T.text2,wordBreak:"break-word"}}>{post.content}</div>}
          {!gated&&(
            <>
              <div style={{marginTop:12}}>
                <ActionBar post={{...post,replyCount:repCount}} myId={myId} T={T}
                  onLike={onLike} onRepost={onRepost} onBookmark={onBookmark} onShare={onShare}
                  onReply={onToggleReply} replyActive={inlineReplyOpen}/>
              </div>
              {isOwn&&(
                <div style={{display:"flex",alignItems:"center",gap:16,marginTop:10,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                  <HoldToDelete T={T} onDelete={()=>onDeleteOptimistic(post.id)}/>
                  <button onClick={()=>onMakePublic(post)}
                    style={{display:"inline-flex",alignItems:"center",gap:4,background:"none",border:"none",
                      cursor:"pointer",color:post.isPublic?"#4F8EF7":T.text3,fontSize:12,padding:0,transition:"color .15s"}}>
                    {post.isPublic?<I.Globe/>:<I.Unlock/>}
                    <span>{post.isPublic?"public link":"make public"}</span>
                  </button>
                  {post.isPublic&&<button onClick={()=>navigator.clipboard?.writeText(`https://ping.app/p/${post.id}`).catch(()=>{})}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#4F8EF7",fontSize:12,display:"flex",alignItems:"center",gap:3,padding:0}}>
                    <I.Link/> copy
                  </button>}
                </div>
              )}
              {repCount>0&&preview&&(()=>{
                const ru=getUser(preview.userId);if(!ru)return null;
                return <button onClick={()=>onExpand(post.id)}
                  style={{display:"flex",gap:8,marginTop:10,padding:"9px 12px",background:T.bg3,borderRadius:8,
                    border:"none",cursor:"pointer",textAlign:"left",width:"100%",alignItems:"flex-start"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
                  onMouseLeave={e=>e.currentTarget.style.background=T.bg3}>
                  <Av user={ru} size={22}/>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.text2}}>@{ru.username} </span>
                    <span style={{fontSize:12,color:T.text3}}>{preview.content.slice(0,60)}{preview.content.length>60?"…":""}</span>
                  </div>
                  {repCount>1&&<span style={{fontSize:11,color:T.text3,flexShrink:0}}>+{repCount-1}</span>}
                </button>;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const wrapped=isOwn?<SwipeReveal onDelete={()=>onDeleteOptimistic(post.id)} T={T}>{card}</SwipeReveal>:card;
  return (
    <div>
      {wrapped}
      {inlineReplyOpen&&(
        <InlineReply postId={post.id} author={author} me={me} T={T} anchorRef={anchorRef}
          onSubmit={()=>{}} // overridden in stream
          onClose={()=>onToggleReply(post.id)}/>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED POST MODAL — uncontrolled textarea fix applied here too
// ─────────────────────────────────────────────────────────────────────────────
function ExpandedPostModal({post,author,me,T,threadReplies,getUser,onClose,onLike,onRepost,onBookmark,onShare,onDeletePost,onDeleteReply,onProfile,onSubmitReply}) {
  const [replyingTo,setReplyingTo]=useState(null);
  const taRef=useRef(null);

  // Set initial value when replyingTo changes
  useEffect(()=>{
    if(!replyingTo||!taRef.current)return;
    const prefix=replyingTo==="post"?`@${author.username} `:`@${replyingTo.username} `;
    taRef.current.value=prefix;
    taRef.current.focus();
    const l=taRef.current.value.length;
    taRef.current.setSelectionRange(l,l);
    // Auto-grow
    taRef.current.style.height="auto";
    taRef.current.style.height=taRef.current.scrollHeight+"px";
  },[replyingTo]);

  const openReplyTo=t=>{setReplyingTo(t);};
  const closeReply=()=>{setReplyingTo(null);};
  const submitReply=()=>{
    const val=taRef.current?.value?.trim()||"";
    if(!val)return;
    const toUser=replyingTo==="post"?author:(replyingTo?getUser(replyingTo.id)||author:author);
    onSubmitReply(post.id,val,toUser);
    closeReply();
  };

  const liked=post.likes.includes(me?.id),reposted=post.reposts.includes(me?.id),bookmarked=post.bookmarks.includes(me?.id);
  const uv=(post.uniqueViewers||[]).length;

  const ReplyBox=({targetName})=>(
    <div style={{marginTop:10,animation:"slideDown .15s ease-out"}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
        <span style={{fontSize:12,color:"#4F8EF7",fontWeight:600}}>↳</span>
        <span style={{fontSize:12,color:T.text3}}>replying to</span>
        <span style={{fontSize:12,color:"#4F8EF7",fontWeight:700}}>@{targetName}</span>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Av user={me} size={26}/>
        <div style={{flex:1}}>
          <textarea ref={taRef}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
            onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submitReply();if(e.key==="Escape")closeReply();}}
            style={{width:"100%",fontSize:14,lineHeight:1.55,minHeight:44,color:T.text,
              background:T.inputBg,borderRadius:8,padding:"8px 10px",border:"none",outline:"none",
              resize:"none",fontFamily:"system-ui,-apple-system,sans-serif",display:"block"}}
            placeholder={`reply to @${targetName}…`}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:6}}>
            <button onClick={closeReply}
              style={{background:"none",border:`1px solid ${T.border2}`,cursor:"pointer",color:T.text3,fontSize:13,padding:"4px 12px",borderRadius:8}}>cancel</button>
            <button onClick={submitReply}
              style={{background:"#4F8EF7",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,padding:"4px 16px",borderRadius:8}}>reply</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet fadeIn" style={{maxHeight:"92vh",padding:0,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <span style={{fontSize:13,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>thread</span>
          <button className="iBtn" onClick={onClose}><I.Close/></button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {/* Original post */}
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              <button style={{background:"none",border:"none",cursor:"pointer",padding:0}} onClick={()=>{onClose();onProfile(author.id);}}>
                <Av user={author} size={42}/>
              </button>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <button className="uBtn" style={{fontSize:15}} onClick={()=>{onClose();onProfile(author.id);}}>@{author.username}</button>
                  {author.isPrivate&&<span style={{color:T.text3,display:"flex"}}><I.Lock/></span>}
                  {post.isPublic&&<PublicBadge/>}
                  <span style={{color:T.text3,fontSize:12,marginLeft:"auto"}}>{timeAgo(post.createdAt)}</span>
                </div>
              </div>
            </div>
            <div style={{fontSize:16,color:T.text,lineHeight:1.7,marginBottom:14}}>{post.content}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:4}}>
              {[
                {icon:<I.Heart f={liked}/>,    count:post.likes.length,      col:liked?"#F75F4F":"#888",    hi:"#F75F4F",bg:"rgba(247,95,79,.1)",  fn:onLike},
                {icon:<I.Comment/>,            count:threadReplies.length,   col:"#888",                    hi:"#4F8EF7",bg:"rgba(79,142,247,.1)", fn:()=>replyingTo==="post"?closeReply():openReplyTo("post")},
                {icon:<I.Repost a={reposted}/>,count:post.reposts.length,    col:reposted?"#4FF7A0":"#888", hi:"#4FF7A0",bg:"rgba(79,247,160,.1)", fn:onRepost},
                {icon:<I.Share/>,              count:post.shares||0,         col:"#888",                    hi:"#F7C84F",bg:"rgba(247,200,79,.1)", fn:onShare},
                {icon:<I.Bkmk f={bookmarked}/>,count:post.bookmarks.length,  col:bookmarked?"#F7C84F":"#888",hi:"#F7C84F",bg:"rgba(247,200,79,.1)",fn:onBookmark},
              ].map((item,i)=>(
                <button key={i} onClick={item.fn}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",
                    gap:5,padding:"5px 3px",borderRadius:6,color:item.col,transition:"color .15s,background .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=item.bg;e.currentTarget.style.color=item.hi;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=item.col;}}>
                  {item.icon}{item.count>0&&<span style={{fontSize:12,fontWeight:500}}>{item.count}</span>}
                </button>
              ))}
              <div style={{display:"flex",alignItems:"center",gap:3,color:"#666",opacity:.7}}><I.Eye/><span style={{fontSize:11}}>{fmtNum(uv)||"—"}</span></div>
            </div>
            {replyingTo==="post"&&<ReplyBox targetName={author.username}/>}
            {post.userId===me?.id&&(
              <div style={{marginTop:12,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                <HoldToDelete T={T} onDelete={()=>{onDeletePost(post.id);onClose();}}/>
              </div>
            )}
          </div>

          {/* Replies */}
          {threadReplies.length===0&&<div style={{padding:"32px",color:T.text3,fontSize:14,textAlign:"center"}}>no replies yet — be first</div>}
          {threadReplies.map(r=>{
            const ru=getUser(r.userId);if(!ru)return null;
            const isRT=replyingTo&&replyingTo!=="post"&&replyingTo.id===ru.id;
            return (
              <div key={r.id} style={{borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",gap:11,padding:"13px 18px"}}>
                  <button style={{background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}} onClick={()=>{onClose();onProfile(ru.id);}}>
                    <Av user={ru} size={34}/>
                  </button>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <button className="uBtn" style={{fontSize:14}} onClick={()=>{onClose();onProfile(ru.id);}}>@{ru.username}</button>
                      <span style={{color:T.text3,fontSize:11}}>{timeAgo(r.createdAt)}</span>
                    </div>
                    <div style={{fontSize:14,color:T.text2,lineHeight:1.6,marginBottom:6}}>{r.content}</div>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <button onClick={()=>isRT?closeReply():openReplyTo(ru)}
                        style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",
                          cursor:"pointer",color:isRT?"#4F8EF7":T.text3,fontSize:12,padding:0}}>
                        <I.ReplyArr/> {isRT?"cancel":"reply"}
                      </button>
                      {r.userId===me?.id&&<button onClick={()=>onDeleteReply(r.id)}
                        style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",
                          cursor:"pointer",color:"#F75F4F",fontSize:12,padding:0}}>
                        <I.Trash/> delete
                      </button>}
                    </div>
                    {isRT&&<ReplyBox targetName={ru.username}/>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS MODAL — redesigned with lazy-reg, Apple sign-in, promise header
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({user,T,dark,isGuest,onSave,onClose,onToggleDark,onQR,onSavePhoto,onLogOut,onDeleteAccount,onContinueWithApple}) {
  const [f,setF]=useState({username:user.username,bio:user.bio||"",isPrivate:user.isPrivate,email:user.email||""});
  const fileRef=useRef(null);

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet fadeIn" style={{padding:0,overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 14px",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontSize:13,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>settings</span>
          <button className="iBtn" onClick={onClose}><I.Close/></button>
        </div>

        <div style={{overflowY:"auto",maxHeight:"calc(92vh - 52px)",padding:"0 0 20px"}}>
          {/* Promise banner */}
          <div style={{margin:"16px 20px",padding:"14px 16px",background:`linear-gradient(135deg,rgba(79,142,247,.08),rgba(124,79,247,.08))`,
            borderRadius:12,border:`1px solid rgba(79,142,247,.2)`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <I.Shield/>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>the ping promise</span>
            </div>
            {["No ads. No algorithms.","We don't sell your data.","You own your pings."].map(p=>(
              <div key={p} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <span style={{color:"#4FF7A0",fontSize:11}}>✓</span>
                <span style={{fontSize:12,color:T.text2}}>{p}</span>
              </div>
            ))}
          </div>

          <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:20}}>
            {/* Photo */}
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{position:"relative"}}>
                <Av user={user} size={58}/>
                <button onClick={()=>fileRef.current?.click()}
                  style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",
                    background:"#4F8EF7",border:`2px solid ${T.bg}`,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",padding:0}}>
                  <I.Camera/>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=ev=>onSavePhoto(ev.target.result);r.readAsDataURL(file);}}/>
              </div>
              <div>
                <div style={{fontSize:14,color:T.text,fontWeight:600}}>profile photo</div>
                <div style={{fontSize:12,color:T.text3,marginTop:2}}>tap to change</div>
              </div>
            </div>

            {/* Username */}
            <div>
              <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>username</div>
              <input className="iLine" style={{fontSize:15}} value={f.username}
                onChange={e=>setF(x=>({...x,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))}/>
            </div>

            {/* Bio */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",fontWeight:500}}>bio</div>
                <CC n={f.bio.length} max={80} T={T}/>
              </div>
              <textarea className="iLine" style={{fontSize:14,lineHeight:1.6}} rows={2} maxLength={80} value={f.bio}
                onChange={e=>setF(x=>({...x,bio:e.target.value.slice(0,80)}))}/>
            </div>

            {/* Optional email */}
            <div>
              <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>email <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:10}}>(optional — notifications &amp; recovery)</span></div>
              <input className="iLine" style={{fontSize:14}} type="email" placeholder="you@example.com" value={f.email}
                onChange={e=>setF(x=>({...x,email:e.target.value}))}/>
            </div>

            {/* Theme */}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
              <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:12,fontWeight:500}}>appearance</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {dark?<I.Moon/>:<I.Sun/>}
                  <div>
                    <div style={{fontSize:14,color:T.text,fontWeight:500}}>{dark?"dark mode":"light mode"}</div>
                    <div style={{fontSize:12,color:T.text3,marginTop:2}}>toggle theme</div>
                  </div>
                </div>
                <button onClick={onToggleDark}
                  style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",
                    background:dark?"#e0e0e0":"#333",transition:"background .2s",position:"relative",flexShrink:0}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:dark?"#0a0a0a":"#f0f0f0",
                    position:"absolute",top:3,left:dark?23:3,transition:"left .2s"}}/>
                </button>
              </div>
            </div>

            {/* Private */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14,color:T.text,fontWeight:500}}>private account</span>
                  <span style={{color:T.text3,display:"flex"}}><I.Lock/></span>
                </div>
                <div style={{fontSize:12,color:T.text3,marginTop:2}}>only followers see your pings</div>
              </div>
              <button onClick={()=>setF(x=>({...x,isPrivate:!x.isPrivate}))}
                style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",
                  background:f.isPrivate?"#e0e0e0":"#333",transition:"background .2s",position:"relative",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:f.isPrivate?"#0a0a0a":"#f0f0f0",
                  position:"absolute",top:3,left:f.isPrivate?23:3,transition:"left .2s"}}/>
              </button>
            </div>

            {/* QR */}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
              <button onClick={()=>{onClose();onQR();}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:T.bg3,
                  border:`1px solid ${T.border2}`,borderRadius:10,cursor:"pointer",color:T.text,fontSize:14,width:"100%"}}>
                <I.QR/><span>view QR & save contact</span>
              </button>
            </div>

            {/* Apple sign-in — recovery framing */}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
              <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10,fontWeight:500}}>account recovery</div>
              <div style={{fontSize:12,color:T.text3,marginBottom:12,lineHeight:1.6}}>
                Switching phones? Connect with Apple to restore your pings on any device.
              </div>
              <button onClick={onContinueWithApple}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",
                  padding:"12px 0",background:dark?"#fff":"#000",color:dark?"#000":"#fff",
                  border:"none",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:600}}>
                <I.Apple/> Continue with Apple
              </button>
            </div>

            {/* Save */}
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,paddingTop:4}}>
              <button style={{background:"none",border:"none",color:T.text3,fontSize:14,cursor:"pointer"}} onClick={onClose}>cancel</button>
              <button className="btnPrimary" onClick={()=>onSave(f)}>save</button>
            </div>

            {/* Danger zone */}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
              <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:12,fontWeight:500}}>account</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={onLogOut}
                  style={{display:"flex",alignItems:"center",gap:7,flex:1,padding:"10px 14px",
                    background:T.bg3,border:`1px solid ${T.border2}`,borderRadius:10,
                    cursor:"pointer",color:T.text2,fontSize:13}}>
                  <I.LogOut/> log out
                </button>
                <button onClick={onDeleteAccount}
                  style={{display:"flex",alignItems:"center",gap:7,flex:1,padding:"10px 14px",
                    background:"rgba(247,95,79,.08)",border:"1px solid rgba(247,95,79,.3)",borderRadius:10,
                    cursor:"pointer",color:"#F75F4F",fontSize:13}}>
                  <I.Trash/> delete account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({user,me,myId,posts,replies,getUser,T,dark,onLike,onRepost,onBookmark,onFollow,onProfile,onMsg,postPing,onDeletePost,onDeleteReply,onShare,onFollowList,onQR,onSavePhoto,onMakePublic,submitReply}) {
  const [pTab,setPTab]=useState("posts");
  const [compose,setCompose]=useState("");
  const [inlineRP,setInlineRP]=useState(null);
  const fileRef=useRef(null);
  const isMe=user.id===myId,isFollowing=me.following.includes(user.id);

  const myPosts  =posts.filter(p=>p.userId===user.id).sort((a,b)=>b.createdAt-a.createdAt);
  const myReplies=replies.filter(r=>r.userId===user.id).sort((a,b)=>b.createdAt-a.createdAt);
  const myReposts=posts.filter(p=>p.reposts.includes(user.id)).sort((a,b)=>b.createdAt-a.createdAt);
  const myLikes  =posts.filter(p=>p.likes.includes(user.id)).sort((a,b)=>b.createdAt-a.createdAt);
  const mySaved  =posts.filter(p=>p.bookmarks.includes(user.id)).sort((a,b)=>b.createdAt-a.createdAt);
  const dataMap  ={posts:myPosts,replies:myReplies,reposts:myReposts,likes:myLikes,saved:mySaved};

  return (
    <div>
      <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{position:"relative"}}>
              <Av user={user} size={62}/>
              {isMe&&(
                <>
                  <button onClick={()=>fileRef.current?.click()}
                    style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",
                      background:"#4F8EF7",border:`2px solid ${T.bg}`,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",padding:0}}>
                    <I.Camera/>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                    onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>onSavePhoto(ev.target.result);r.readAsDataURL(f);}}/>
                </>
              )}
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontWeight:700,fontSize:18,color:T.text}}>@{user.username}</span>
                {user.isPrivate&&<span style={{color:T.text3,display:"flex",alignItems:"center"}}><I.Lock/></span>}
              </div>
              {user.bio&&<div style={{fontSize:13,color:T.text3,lineHeight:1.5,marginTop:3,maxWidth:200}}>{user.bio}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {isMe&&<button className="iBtn" style={{color:T.text2}} onClick={onQR}><I.QR/></button>}
            {!isMe&&(
              <>
                <button style={{background:"none",border:`1px solid ${T.border2}`,color:T.text2,fontSize:13,
                  padding:"6px 12px",cursor:"pointer",borderRadius:8,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.text;e.currentTarget.style.color=T.text;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.text2;}}
                  onClick={()=>onMsg(user.id)}>ping now</button>
                <button className={`fBtn ${isFollowing?"on":""}`} onClick={()=>onFollow(user.id)}>
                  {isFollowing?<><I.Check/> following</>:<>+ follow</>}
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:20}}>
          {[{l:"pings",v:myPosts.length,fn:null},{l:"followers",v:user.followers.length,fn:()=>onFollowList("followers")},{l:"following",v:user.following.length,fn:()=>onFollowList("following")}].map(s=>(
            <button key={s.l} onClick={s.fn||undefined} style={{background:"none",border:"none",cursor:s.fn?"pointer":"default",padding:0}}>
              <span style={{color:T.text,fontWeight:700,fontSize:16}}>{s.v} </span>
              <span style={{color:T.text3,fontSize:12}}>{s.l}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,position:"sticky",top:52,zIndex:70,background:`${T.bg}f8`,backdropFilter:"blur(12px)"}}>
        {["posts","replies","reposts","likes","saved"].map(t=>(
          <button key={t} className={`tPill ${pTab===t?"on":""}`} onClick={()=>{setPTab(t);setInlineRP(null);}}>{t}</button>
        ))}
      </div>

      {isMe&&pTab==="posts"&&(
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:10}}>
          <Av user={me} size={36}/>
          <div style={{flex:1}}>
            <textarea style={{width:"100%",fontSize:15,lineHeight:1.6,minHeight:38,color:T.text,fontFamily:"system-ui,-apple-system,sans-serif"}}
              placeholder="What's happening?" value={compose} maxLength={240}
              onChange={e=>setCompose(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){postPing(compose);setCompose("");}}}/>
            {compose.length>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                <CC n={compose.length} max={240} T={T}/>
                <button className="btnPrimary" style={{fontSize:13,padding:"6px 14px"}}
                  onClick={()=>{postPing(compose);setCompose("");}} disabled={!compose.trim()||compose.length>240}>ping</button>
              </div>
            )}
          </div>
        </div>
      )}

      {dataMap[pTab].length===0
        ?<div style={{padding:"52px 20px",color:T.text3,fontSize:14,textAlign:"center"}}>nothing here yet</div>
        :pTab==="replies"
          ?myReplies.map(r=>{
              const p=posts.find(x=>x.id===r.postId),pa=p?getUser(p.userId):null;
              const inner=(
                <div style={{borderBottom:`1px solid ${T.border}`,padding:"13px 16px"}}>
                  {p&&pa&&(
                    <button onClick={()=>onProfile(pa.id)}
                      style={{display:"flex",gap:8,marginBottom:8,opacity:.4,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",width:"100%",alignItems:"center"}}>
                      <Av user={pa} size={18}/>
                      <div style={{fontSize:12,color:T.text3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>@{pa.username}: {p.content}</div>
                    </button>
                  )}
                  <div style={{display:"flex",gap:10}}>
                    <Av user={user} size={30}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:T.text2,marginBottom:3}}>
                        <span style={{fontWeight:700}}>@{user.username}</span>
                        <span style={{color:T.text3,fontSize:11,marginLeft:8}}>{timeAgo(r.createdAt)}</span>
                      </div>
                      <div style={{fontSize:14,color:T.text2,lineHeight:1.6}}>{r.content}</div>
                    </div>
                  </div>
                </div>
              );
              if(r.userId===myId)return <SwipeReveal key={r.id} onDelete={()=>onDeleteReply(r.id)} T={T}>{inner}</SwipeReveal>;
              return <div key={r.id}>{inner}</div>;
            })
          :dataMap[pTab].map(p=>{
              const pA=getUser(p.userId);if(!pA)return null;
              const pReplies=replies.filter(r=>r.postId===p.id);
              return (
                <div key={p.id}>
                  <PostCard post={p} author={pA} me={me} allReplies={pReplies} getUser={getUser}
                    T={T} dark={dark} inlineReplyOpen={inlineRP===p.id}
                    onToggleReply={()=>setInlineRP(prev=>prev===p.id?null:p.id)}
                    onLike={()=>onLike(p.id)} onRepost={()=>onRepost(p.id)}
                    onBookmark={()=>onBookmark(p.id)} onShare={()=>onShare(p.id)}
                    onProfile={onProfile} onFollow={()=>onFollow(p.userId)}
                    onExpand={()=>{}} onDeleteOptimistic={onDeletePost} onMakePublic={onMakePublic}/>
                  {inlineRP===p.id&&(
                    <InlineReply postId={p.id} author={pA} me={me} T={T}
                      onSubmit={(pid,content)=>{submitReply(pid,content,pA);setInlineRP(null);}}
                      onClose={()=>setInlineRP(null)}/>
                  )}
                </div>
              );
            })
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ROW
// ─────────────────────────────────────────────────────────────────────────────
function URow({user,me,following,onFollow,onProfile,onMsg,T}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${T.border}`,transition:"background .1s"}}
      onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <button style={{background:"none",border:"none",cursor:"pointer",padding:0}} onClick={onProfile}><Av user={user} size={40}/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <button className="uBtn" onClick={onProfile}>@{user.username}</button>
          {user.isPrivate&&<span style={{color:T.text3,display:"flex",alignItems:"center"}}><I.Lock/></span>}
        </div>
        {user.bio&&<div style={{color:T.text3,fontSize:12,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.bio}</div>}
      </div>
      <div style={{display:"flex",gap:7}}>
        {onMsg&&<button className="iBtn" style={{color:T.text3}} onClick={onMsg}><I.Mail/></button>}
        {me&&user.id!==me.id&&<button className={`fBtn ${following?"on":""}`} onClick={onFollow}>{following?<><I.Check/> following</>:<>+ follow</>}</button>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark,setDark]=useState(true);
  const T=dark?DARK:LIGHT;

  // Lazy registration — guest mode, no forced sign-in
  const [users,setUsers]=useState(INIT_USERS);
  const [myId,setMyId]=useState(null);        // null = guest
  const [loginF,setLoginF]=useState({username:"",bio:""});
  const [signupMode,setSignupMode]=useState(true);
  const [loginErr,setLoginErr]=useState("");
  const [showAuth,setShowAuth]=useState(false); // deferred sign-in prompt

  const [posts,setPosts]=useState(INIT_POSTS);
  const [replies,setReplies]=useState(INIT_REPLIES);
  const [notifs,setNotifs]=useState(INIT_NOTIFS);
  const [msgs,setMsgs]=useState(INIT_MSGS);

  const [tab,setTab]=useState("stream");
  const [profileTarget,setProfileTarget]=useState(null);
  const [dmTarget,setDmTarget]=useState(null);
  const [followListInfo,setFollowListInfo]=useState(null);

  const [composeOpen,setComposeOpen]=useState(false);
  const [expandedPost,setExpandedPost]=useState(null);
  const [shareTarget,setShareTarget]=useState(null);
  const [qrTarget,setQrTarget]=useState(null);
  const [editOpen,setEditOpen]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [pingText,setPingText]=useState("");
  const [dmText,setDmText]=useState("");
  const [copiedMsg,setCopiedMsg]=useState("");
  const [publicLinkTarget,setPublicLinkTarget]=useState(null);
  const [inlineReplyPost,setInlineReplyPost]=useState(null);

  // Optimistic delete undo
  const [deletedStack,setDeletedStack]=useState([]);
  const [undoVisible,setUndoVisible]=useState(false);
  const undoTimer=useRef(null);

  // Milestone notifications
  const [milestoneQueue,setMilestoneQueue]=useState([]);

  const [barVis,setBarVis]=useState(true),[fabVis,setFabVis]=useState(true);
  const lastY=useRef(0),scrollEl=useRef(null);

  const getUser=useCallback(id=>users.find(u=>u.id===id),[users]);
  const me=users.find(u=>u.id===myId)||null;
  const isGuest=!myId;

  // Guest user for display purposes
  const guestUser={id:"guest",username:"guest",bio:"",isPrivate:false,following:[],followers:[],avatar:"#666",photo:null};
  const displayMe=me||guestUser;

  // Scroll
  useEffect(()=>{
    const el=scrollEl.current;if(!el)return;
    const h=()=>{
      const y=el.scrollTop,dn=y>lastY.current+6,up=y<lastY.current-6;
      if(dn&&y>80){setBarVis(false);setFabVis(false);}
      if(up||y<60){setBarVis(true);setFabVis(true);}
      lastY.current=y;
    };
    el.addEventListener("scroll",h,{passive:true});
    return()=>el.removeEventListener("scroll",h);
  },[tab]);

  // Bot posts
  useEffect(()=>{
    const t=setInterval(()=>{
      const bots=["u1","u2","u3","u4"].filter(x=>x!==myId);
      const bot=bots[Math.floor(Math.random()*bots.length)];
      const newPost={id:uid(),userId:bot,content:BOT_LINES[Math.floor(Math.random()*BOT_LINES.length)],
        createdAt:Date.now(),likes:[],reposts:[],bookmarks:[],shares:0,uniqueViewers:[],isPublic:false};
      setPosts(p=>[newPost,...p]);
    },14000);
    return()=>clearInterval(t);
  },[myId]);

  // Unique views on login
  useEffect(()=>{
    if(!myId)return;
    setPosts(ps=>ps.map(p=>p.uniqueViewers?.includes(myId)?p:{...p,uniqueViewers:[...(p.uniqueViewers||[]),myId]}));
  },[myId]);

  // Milestone check — watch view counts on own posts
  useEffect(()=>{
    if(!myId)return;
    posts.forEach(p=>{
      if(p.userId!==myId)return;
      const uv=(p.uniqueViewers||[]).length;
      VIEW_MILESTONES.forEach(m=>{
        if(uv===m){
          const key=`ms_${p.id}_${m}`;
          if(!sessionStorage.getItem(key)){
            sessionStorage.setItem(key,"1");
            setMilestoneQueue(q=>[...q,{id:uid(),n:m,postId:p.id,msg:milestoneMsg(m,p.content)}]);
          }
        }
      });
    });
  },[posts,myId]);

  // Also check engagement milestones on share/reply
  function checkEngagementMilestone(type,count,postId) {
    if(!myId)return;
    const post=posts.find(p=>p.id===postId);if(!post||post.userId!==myId)return;
    if(type==="share"&&count===5){
      setMilestoneQueue(q=>[...q,{id:uid(),n:"share5",postId,
        msg:"Your latest update is gaining traction — it's been shared 5 times already. 🔄"}]);
    }
    if(type==="reply"&&count===10){
      setMilestoneQueue(q=>[...q,{id:uid(),n:"reply10",postId,
        msg:"You're sparking a trend! 10 people are talking about your ping right now. 💬"}]);
    }
  }

  const addNotif=useCallback(n=>setNotifs(ns=>[{id:uid(),...n,read:false,createdAt:Date.now()},...ns]),[]);

  // ── AUTH ────────────────────────────────────────────────────────────────
  function handleLogin() {
    const un=loginF.username.trim().toLowerCase();
    if(!un||un.length<2){setLoginErr("min 2 chars");return;}
    if(signupMode){
      if(users.find(u=>u.username===un)){setLoginErr("username taken");return;}
      const nu={id:uid(),username:un,bio:loginF.bio.slice(0,80)||"",isPrivate:false,following:[],followers:[],avatar:pickColor(un),photo:null,email:""};
      setUsers(u=>[...u,nu]);setMyId(nu.id);
    } else {
      const found=users.find(u=>u.username===un);
      if(!found){setLoginErr("not found");return;}
      setMyId(found.id);
    }
    setLoginErr("");setShowAuth(false);
  }

  function handleLogOut(){setMyId(null);setEditOpen(false);setShowAuth(false);}

  // ── DATA ACTIONS ─────────────────────────────────────────────────────────
  function postPing(content) {
    if(isGuest){setShowAuth(true);return;}
    if(!content?.trim()||content.length>240)return;
    setPosts(ps=>[{id:uid(),userId:myId,content:content.trim(),createdAt:Date.now(),
      likes:[],reposts:[],bookmarks:[],shares:0,uniqueViewers:[myId],isPublic:false},...ps]);
    setPingText("");setComposeOpen(false);
  }

  function deletePostOptimistic(postId) {
    const post=posts.find(p=>p.id===postId);if(!post)return;
    const orphans=replies.filter(r=>r.postId===postId);
    setPosts(ps=>ps.filter(p=>p.id!==postId));
    setReplies(rs=>rs.filter(r=>r.postId!==postId));
    if(expandedPost===postId)setExpandedPost(null);
    if(inlineReplyPost===postId)setInlineReplyPost(null);
    const entry={post,replies:orphans,at:Date.now()};
    setDeletedStack(prev=>[entry,...prev.slice(0,4)]);
    setUndoVisible(true);
    clearTimeout(undoTimer.current);
    undoTimer.current=setTimeout(()=>{setUndoVisible(false);setDeletedStack([]);},5000);
  }
  function undoDelete(){
    clearTimeout(undoTimer.current);
    const [entry,...rest]=deletedStack;if(!entry)return;
    setPosts(ps=>[entry.post,...ps]);
    setReplies(rs=>[...entry.replies,...rs]);
    setDeletedStack(rest);setUndoVisible(false);
  }
  function deleteReply(rid){setReplies(rs=>rs.filter(r=>r.id!==rid));}

  function submitReply(postId,content,toUser=null) {
    if(isGuest){setShowAuth(true);return;}
    const post=posts.find(p=>p.id===postId);if(!post||!content?.trim())return;
    const newReply={id:uid(),postId,userId:myId,content:content.trim(),createdAt:Date.now(),likes:[]};
    setReplies(rs=>[...rs,newReply]);
    const authorId=toUser?.id||post.userId;
    if(authorId!==myId)addNotif({type:"reply",fromId:myId,postId});
    const repCount=replies.filter(r=>r.postId===postId).length+1;
    checkEngagementMilestone("reply",repCount,postId);
  }

  function toggleLike(postId) {
    if(isGuest){setShowAuth(true);return;}
    setPosts(ps=>ps.map(p=>{
      if(p.id!==postId)return p;
      const had=p.likes.includes(myId);
      if(!had&&p.userId!==myId)addNotif({type:"like",fromId:myId,postId});
      return{...p,likes:had?p.likes.filter(x=>x!==myId):[...p.likes,myId]};
    }));
  }
  function toggleRepost(postId) {
    if(isGuest){setShowAuth(true);return;}
    setPosts(ps=>ps.map(p=>{
      if(p.id!==postId)return p;
      const had=p.reposts.includes(myId);
      if(!had&&p.userId!==myId)addNotif({type:"repost",fromId:myId,postId});
      return{...p,reposts:had?p.reposts.filter(x=>x!==myId):[...p.reposts,myId]};
    }));
  }
  function toggleBookmark(postId) {
    if(isGuest){setShowAuth(true);return;}
    setPosts(ps=>ps.map(p=>{
      if(p.id!==postId)return p;const had=p.bookmarks.includes(myId);
      return{...p,bookmarks:had?p.bookmarks.filter(x=>x!==myId):[...p.bookmarks,myId]};
    }));
  }
  function toggleFollow(targetId) {
    if(isGuest){setShowAuth(true);return;}
    setUsers(us=>us.map(u=>{
      if(u.id===myId){const h=u.following.includes(targetId);return{...u,following:h?u.following.filter(x=>x!==targetId):[...u.following,targetId]};}
      if(u.id===targetId){const h=u.followers.includes(myId);return{...u,followers:h?u.followers.filter(x=>x!==myId):[...u.followers,myId]};}
      return u;
    }));
    if(!me?.following?.includes(targetId))addNotif({type:"follow",fromId:myId,postId:null});
  }
  function sendDM(toId) {
    if(isGuest){setShowAuth(true);return;}
    if(!dmText.trim())return;
    const key=dmKey(myId,toId);
    setMsgs(m=>({...m,[key]:[...(m[key]||[]),{id:uid(),fromId:myId,text:dmText.trim(),createdAt:Date.now()}]}));
    setDmText("");
  }
  function saveProfile(edits){setUsers(us=>us.map(u=>u.id===myId?{...u,...edits}:u));setEditOpen(false);}
  function openProfile(uid){setProfileTarget(uid);setTab("profile");}
  function openDM(uid){setDmTarget(uid);setTab("messages");}
  function copyLink(text){navigator.clipboard?.writeText(text).catch(()=>{});setCopiedMsg("copied!");setTimeout(()=>setCopiedMsg(""),2000);}
  function handleShare(postId){
    const p=posts.find(x=>x.id===postId);if(!p)return;
    setShareTarget(p);
    const newShares=p.shares+1;
    setPosts(ps=>ps.map(x=>x.id===postId?{...x,shares:newShares}:x));
    checkEngagementMilestone("share",newShares,postId);
  }
  function handleRefresh(){
    const bots=["u1","u2","u3","u4"].filter(x=>x!==myId);
    const bot=bots[Math.floor(Math.random()*bots.length)];
    setPosts(p=>[{id:uid(),userId:bot,content:BOT_LINES[Math.floor(Math.random()*BOT_LINES.length)],
      createdAt:Date.now(),likes:[],reposts:[],bookmarks:[],shares:0,uniqueViewers:[],isPublic:false},...p]);
  }
  function toggleInlineReply(postId){
    if(isGuest){setShowAuth(true);return;}
    const exists=posts.find(p=>p.id===postId);if(!exists)return;
    setInlineReplyPost(prev=>prev===postId?null:postId);
  }
  function handleMakePublic(post){
    if(post.isPublic){copyLink(`https://ping.app/p/${post.id}`);return;}
    setPublicLinkTarget(post);
  }
  function confirmMakePublic(){
    if(!publicLinkTarget)return;
    setPosts(ps=>ps.map(p=>p.id===publicLinkTarget.id?{...p,isPublic:true}:p));
    copyLink(`https://ping.app/p/${publicLinkTarget.id}`);
    setPublicLinkTarget(null);
  }

  const unread=notifs.filter(n=>!n.read&&n.fromId!==myId).length;
  const profileUser=tab==="profile"&&profileTarget?getUser(profileTarget):(tab==="profile"?me:null);

  // ── CSS ──────────────────────────────────────────────────────────────────
  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body,input,textarea,button{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    ::placeholder{color:${T.text3};}
    input,textarea{outline:none;border:none;background:transparent;color:${T.text};resize:none;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:2px;}
    .iBtn{background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
      padding:5px;border-radius:50%;transition:background .12s,color .12s;color:${T.text3};}
    .iBtn:hover{background:${T.bg3};color:${T.text};}
    .card{border-bottom:1px solid ${T.border};padding:14px 16px;transition:background .1s;}
    .card:hover{background:${T.cardHover};}
    .tPill{background:none;border:none;font-size:12px;font-weight:500;cursor:pointer;padding:11px 0;
      border-bottom:2px solid transparent;color:${T.text3};transition:color .15s,border-color .15s;flex:1;text-align:center;}
    .tPill.on{color:${T.tabActive};border-bottom-color:${T.tabActive};}
    .tPill:hover:not(.on){color:${T.text2};}
    .bTab{background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
      flex:1;padding:10px;color:${T.barIcon};transition:color .2s;position:relative;}
    .bTab:hover{color:${T.text2};}.bTab.on{color:${T.barText};}
    .fab{position:fixed;bottom:70px;right:18px;width:52px;height:52px;border-radius:50%;background:#4F8EF7;
      border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 24px rgba(79,142,247,.5);color:#fff;z-index:88;
      transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .22s;}
    .fab:hover{transform:scale(1.1)!important;}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,${dark?.65:.45});z-index:200;
      display:flex;align-items:center;justify-content:center;padding:16px;}
    .sheet{background:${T.bg};width:100%;max-width:520px;border-radius:20px;
      border:1px solid ${T.border2};max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.5);}
    .iLine{width:100%;padding:10px 0;border-bottom:1px solid ${T.border2};font-size:15px;
      transition:border-color .2s;color:${T.text};}
    .iLine:focus{border-bottom-color:${T.accent};}
    .btnPrimary{background:#4F8EF7;color:#fff;border:none;padding:9px 22px;font-size:14px;font-weight:600;
      cursor:pointer;border-radius:8px;transition:opacity .15s;}
    .btnPrimary:hover{opacity:.85;}.btnPrimary:disabled{opacity:.25;cursor:not-allowed;}
    .uBtn{background:none;border:none;color:${T.text};font-size:14px;font-weight:700;cursor:pointer;padding:0;transition:color .15s;}
    .uBtn:hover{color:#4F8EF7;}
    .fBtn{background:none;border:1px solid ${T.border2};color:${T.text2};font-size:13px;font-weight:500;
      padding:5px 12px;cursor:pointer;border-radius:8px;transition:all .15s;display:flex;align-items:center;gap:4px;}
    .fBtn:hover{border-color:${T.text};color:${T.text};}
    .fBtn.on{background:${T.accent};color:${dark?"#0a0a0a":"#fff"};border-color:${T.accent};}
    .fBtn.on:hover{background:transparent;color:#F75F4F;border-color:#F75F4F;}
    .ndot{width:7px;height:7px;border-radius:50%;background:#F75F4F;position:absolute;top:5px;right:5px;}
    @keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes milestoneIn{from{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
    @keyframes newPing{from{background:${dark?"#1a1a0a":"#fffde8"}}to{background:transparent}}
    @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fadeIn{animation:fadeIn .18s ease-out;}
    .newPing{animation:newPing 1.6s ease-out;}
  `;

  // ── APP SHELL ──────────────────────────────────────────────────────────
  return (
    <div style={{position:"relative",height:"100vh",background:T.bg,display:"flex",
      flexDirection:"column",maxWidth:600,margin:"0 auto",overflow:"hidden"}}>
      <style>{CSS+`body{background:${T.bg};}`}</style>

      {/* Milestone toasts */}
      {milestoneQueue.length>0&&(
        <MilestoneToast
          milestone={milestoneQueue[0]}
          onDismiss={()=>setMilestoneQueue(q=>q.slice(1))}/>
      )}

      {/* Copy toast */}
      {copiedMsg&&(
        <div style={{position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",
          background:T.text,color:T.bg,padding:"8px 18px",borderRadius:8,fontSize:13,
          zIndex:999,fontWeight:500,pointerEvents:"none",animation:"fadeIn .15s ease-out"}}>
          {copiedMsg}
        </div>
      )}

      {/* Undo delete toast */}
      {undoVisible&&(
        <div style={{position:"fixed",bottom:76,left:"50%",transform:"translateX(-50%)",
          background:dark?"#1c1c1c":"#111",color:"#fff",padding:"10px 18px",borderRadius:10,
          fontSize:13,zIndex:998,display:"flex",alignItems:"center",gap:14,
          boxShadow:"0 4px 20px rgba(0,0,0,.5)",animation:"slideUp .2s ease-out"}}>
          <span style={{opacity:.8}}>ping deleted</span>
          <button onClick={undoDelete}
            style={{background:"none",border:"none",cursor:"pointer",color:"#4F8EF7",fontSize:13,fontWeight:700,padding:0}}>undo</button>
        </div>
      )}

      {/* Deferred auth prompt */}
      {showAuth&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowAuth(false);}}>
          <div className="sheet fadeIn" style={{padding:28,maxWidth:360}}>
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Instrument Serif',serif",fontSize:32,color:T.text,letterSpacing:"-0.02em",marginBottom:8}}>ping.</div>
              <div style={{fontSize:15,color:T.text2,lineHeight:1.6}}>Create an account to reply, follow, and ping.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>username</div>
                <input className="iLine" style={{fontSize:15}} placeholder="pick a handle" value={loginF.username}
                  onChange={e=>setLoginF(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
              </div>
              {signupMode&&(
                <div>
                  <div style={{color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>bio <span style={{fontWeight:400,textTransform:"none",fontSize:10}}>(optional)</span></div>
                  <input className="iLine" style={{fontSize:14}} placeholder="short intro" value={loginF.bio}
                    onChange={e=>setLoginF(f=>({...f,bio:e.target.value.slice(0,80)}))}/>
                </div>
              )}
              {!signupMode&&<div style={{color:T.text3,fontSize:12}}>demo: mara · felix · yuki · dom</div>}
              {loginErr&&<div style={{color:"#F75F4F",fontSize:13}}>{loginErr}</div>}
              <button className="btnPrimary" style={{width:"100%",padding:"12px 0"}} onClick={handleLogin}>
                {signupMode?"create account":"sign in"}
              </button>
              <button style={{background:"none",border:"none",color:T.text3,fontSize:13,cursor:"pointer",textDecoration:"underline",textAlign:"center"}}
                onClick={()=>{setSignupMode(s=>!s);setLoginErr("");}}>
                {signupMode?"already have an account? sign in":"sign up instead"}
              </button>
              <button style={{background:"none",border:"none",color:T.text3,fontSize:13,cursor:"pointer",textAlign:"center"}}
                onClick={()=>setShowAuth(false)}>maybe later</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{position:"sticky",top:0,zIndex:80,background:T.navBg,backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${T.border}`,padding:"0 16px",height:52,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:"'Instrument Serif',serif",fontSize:28,color:T.text,letterSpacing:"-0.02em",lineHeight:1}}>ping.</div>
        <div style={{display:"flex",alignItems:"center"}}>
          {tab==="messages"&&dmTarget&&<button className="iBtn" onClick={()=>setDmTarget(null)}><I.Back/></button>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:100,justifyContent:"flex-end"}}>
          {tab==="stream"&&(
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,letterSpacing:".1em",textTransform:"uppercase",fontWeight:600}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#4FF7A0",display:"inline-block",animation:"pulseDot 2s infinite"}}/>
              <span style={{color:"#4FF7A0"}}>LIVE</span>
            </div>
          )}
          {tab==="notifications"&&unread>0&&(
            <button style={{background:"none",border:"none",color:T.text3,fontSize:12,fontWeight:500,cursor:"pointer"}}
              onClick={()=>setNotifs(ns=>ns.map(n=>({...n,read:true})))}>mark read</button>
          )}
          {tab==="profile"&&(profileUser?.id===myId||!myId)&&(
            <button className="iBtn" style={{color:T.text2}} onClick={()=>!myId?setShowAuth(true):setEditOpen(true)}>
              <I.Gear/>
            </button>
          )}
        </div>
      </div>

      {/* SCROLL AREA */}
      <div ref={scrollEl} style={{flex:1,overflowY:"auto",paddingBottom:64}}>

        {/* STREAM */}
        {tab==="stream"&&(
          <PullToRefresh onRefresh={handleRefresh} T={T}>
            {posts.filter(p=>{const a=getUser(p.userId);return a&&(!a.isPrivate||a.id===myId||me?.following?.includes(a.id));}).sort((a,b)=>b.createdAt-a.createdAt).length===0&&(
              <div style={{padding:"60px 20px",color:T.text3,fontSize:14,textAlign:"center"}}>no pings yet</div>
            )}
            {posts.filter(p=>{const a=getUser(p.userId);return a&&(!a.isPrivate||a.id===myId||me?.following?.includes(a.id));}).sort((a,b)=>b.createdAt-a.createdAt).map((p,i)=>{
              const author=getUser(p.userId);if(!author)return null;
              const pReplies=replies.filter(r=>r.postId===p.id);
              return (
                <div key={p.id}>
                  <PostCard post={p} author={author} me={displayMe} allReplies={pReplies} getUser={getUser}
                    isNew={i===0} T={T} dark={dark}
                    inlineReplyOpen={inlineReplyPost===p.id}
                    onToggleReply={()=>toggleInlineReply(p.id)}
                    onLike={()=>toggleLike(p.id)} onRepost={()=>toggleRepost(p.id)}
                    onBookmark={()=>toggleBookmark(p.id)} onShare={()=>handleShare(p.id)}
                    onProfile={openProfile} onFollow={()=>toggleFollow(p.userId)}
                    onExpand={()=>setExpandedPost(p.id)}
                    onDeleteOptimistic={deletePostOptimistic} onMakePublic={handleMakePublic}/>
                  {inlineReplyPost===p.id&&(
                    <InlineReply postId={p.id} author={author} me={displayMe} T={T}
                      onSubmit={(pid,content)=>{submitReply(pid,content,author);setInlineReplyPost(null);}}
                      onClose={()=>setInlineReplyPost(null)}/>
                  )}
                </div>
              );
            })}
          </PullToRefresh>
        )}

        {/* SEARCH */}
        {tab==="search"&&(
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,background:T.inputBg,borderRadius:12,padding:"10px 14px",marginBottom:16}}>
              <div style={{color:T.text3}}><I.Search/></div>
              <input style={{flex:1,fontSize:15}} placeholder="search by @username…" value={searchQ}
                onChange={e=>setSearchQ(e.target.value.replace(/^@/,""))} autoFocus/>
            </div>
            {users.filter(u=>!searchQ||u.username.toLowerCase().includes(searchQ.toLowerCase())).map(u=>(
              <URow key={u.id} user={u} me={displayMe} following={me?.following?.includes(u.id)||false}
                onFollow={()=>toggleFollow(u.id)} onProfile={()=>openProfile(u.id)} onMsg={()=>openDM(u.id)} T={T}/>
            ))}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab==="notifications"&&(
          <div>
            {isGuest&&(
              <div style={{padding:"20px 16px",borderBottom:`1px solid ${T.border}`,textAlign:"center"}}>
                <div style={{color:T.text3,fontSize:14,marginBottom:12}}>sign in to see notifications</div>
                <button className="btnPrimary" style={{padding:"8px 20px"}} onClick={()=>setShowAuth(true)}>sign in</button>
              </div>
            )}
            {notifs.length===0&&!isGuest&&<div style={{padding:"60px",color:T.text3,fontSize:14,textAlign:"center"}}>no notifications</div>}
            {notifs.map(n=>{
              const from=getUser(n.fromId);if(!from)return null;
              const post=n.postId?posts.find(p=>p.id===n.postId):null;
              return (
                <div key={n.id} className="card"
                  style={{background:n.read?"transparent":dark?"#111108":"#fffde8",display:"flex",gap:12,cursor:"default"}}
                  onClick={()=>setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x))}>
                  <button style={{background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}}
                    onClick={e=>{e.stopPropagation();openProfile(from.id);}}>
                    <Av user={from} size={38}/>
                  </button>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:T.text2,lineHeight:1.6}}>
                      <button className="uBtn" style={{fontSize:14}} onClick={e=>{e.stopPropagation();openProfile(from.id);}}>@{from.username}</button>
                      <span>
                        {n.type==="like"&&" liked your ping"}
                        {n.type==="reply"&&" replied to your ping"}
                        {n.type==="repost"&&" reposted your ping"}
                        {n.type==="follow"&&" followed you"}
                        {n.type==="mention"&&" mentioned you"}
                        {n.type==="milestone"&&n.msg}
                      </span>
                    </div>
                    {post&&<div style={{color:T.text3,fontSize:12,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.content}</div>}
                    <div style={{color:T.text3,fontSize:11,marginTop:4}}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read&&<div style={{width:7,height:7,borderRadius:"50%",background:"#4F8EF7",marginTop:6,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        )}

        {/* MESSAGES LIST */}
        {tab==="messages"&&!dmTarget&&(
          <div>
            {isGuest&&(
              <div style={{padding:"40px 20px",textAlign:"center"}}>
                <div style={{color:T.text3,fontSize:14,marginBottom:12}}>sign in to send messages</div>
                <button className="btnPrimary" style={{padding:"8px 20px"}} onClick={()=>setShowAuth(true)}>sign in</button>
              </div>
            )}
            {!isGuest&&(
              <>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,color:T.text3,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",fontWeight:500}}>conversations</div>
                {users.filter(u=>u.id!==myId).map(u=>{
                  const key=dmKey(myId,u.id),convo=msgs[key]||[],last=convo[convo.length-1];
                  return (
                    <div key={u.id} className="card" style={{display:"flex",gap:12,cursor:"pointer",alignItems:"center"}} onClick={()=>setDmTarget(u.id)}>
                      <Av user={u} size={46}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontWeight:700,fontSize:15,color:T.text}}>@{u.username}</span>
                          {last&&<span style={{color:T.text3,fontSize:11}}>{timeAgo(last.createdAt)}</span>}
                        </div>
                        <div style={{color:T.text3,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {last?(last.fromId===myId?"you: ":"")+last.text:<span style={{fontStyle:"italic"}}>start a conversation</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* DM THREAD — fixed bubble layout */}
        {tab==="messages"&&dmTarget&&(()=>{
          const partner=getUser(dmTarget);
          if(!partner)return <div style={{padding:40,color:T.text3,textAlign:"center"}}>user not found</div>;
          const key=dmKey(myId,dmTarget),convo=msgs[key]||[];
          return (
            <div style={{display:"flex",flexDirection:"column",minHeight:"100%"}}>
              {/* Thread header */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",
                borderBottom:`1px solid ${T.border}`,position:"sticky",top:52,zIndex:70,
                background:T.navBg,backdropFilter:"blur(12px)"}}>
                <button className="iBtn" onClick={()=>setDmTarget(null)}><I.Back/></button>
                <button style={{background:"none",border:"none",cursor:"pointer",padding:0}} onClick={()=>openProfile(partner.id)}>
                  <Av user={partner} size={34}/>
                </button>
                <button className="uBtn" style={{fontSize:15}} onClick={()=>openProfile(partner.id)}>@{partner.username}</button>
              </div>
              {/* Messages */}
              <div style={{flex:1,padding:"16px 14px",display:"flex",flexDirection:"column",gap:10}}>
                {convo.length===0&&(
                  <div style={{color:T.text3,fontSize:14,textAlign:"center",paddingTop:40,fontStyle:"italic"}}>no messages yet</div>
                )}
                {convo.map((msg,idx)=>{
                  const isMe=msg.fromId===myId;
                  const prevMsg=idx>0?convo[idx-1]:null;
                  const sameSender=prevMsg&&prevMsg.fromId===msg.fromId;
                  return (
                    <div key={msg.id} style={{display:"flex",flexDirection:"column",
                      alignItems:isMe?"flex-end":"flex-start",gap:2}}>
                      {/* Show avatar only for first in group */}
                      {!isMe&&!sameSender&&(
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                          <Av user={partner} size={22}/>
                          <span style={{fontSize:11,color:T.text3,fontWeight:600}}>@{partner.username}</span>
                        </div>
                      )}
                      <div style={{
                        maxWidth:"72%",
                        marginLeft:isMe?0:29, // indent partner bubbles under avatar
                        background:isMe?"#4F8EF7":T.bg3,
                        color:isMe?"#fff":T.text,
                        padding:"9px 13px",
                        borderRadius:isMe
                          ?"16px 4px 16px 16px"
                          :"4px 16px 16px 16px",
                        fontSize:14,
                        lineHeight:1.5,
                        wordBreak:"break-word",
                      }}>
                        {msg.text}
                      </div>
                      {/* Timestamp only on last in group or last message */}
                      {(idx===convo.length-1||(convo[idx+1]&&convo[idx+1].fromId!==msg.fromId))&&(
                        <div style={{fontSize:10,color:T.text3,marginLeft:isMe?0:29,marginRight:isMe?4:0}}>
                          {timeAgo(msg.createdAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Input */}
              <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,
                alignItems:"center",position:"sticky",bottom:58,background:T.navBg}}>
                <input style={{flex:1,fontSize:14,padding:"10px 16px",background:T.inputBg,
                  borderRadius:24,border:`1px solid ${T.border2}`,color:T.text}}
                  placeholder={`message @${partner.username}…`} value={dmText}
                  onChange={e=>setDmText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendDM(dmTarget)}/>
                <button className="iBtn" style={{color:dmText.trim()?"#4F8EF7":T.muted,flexShrink:0}} onClick={()=>sendDM(dmTarget)}>
                  <I.Send/>
                </button>
              </div>
            </div>
          );
        })()}

        {/* PROFILE */}
        {tab==="profile"&&(()=>{
          if(!profileUser&&!isGuest)return null;
          const pUser=profileUser||(isGuest?{...guestUser,username:"guest",bio:"Create an account to ping"}:null);
          if(!pUser)return null;
          return (
            <ProfileView user={pUser} me={displayMe} myId={myId}
              posts={posts} replies={replies} getUser={getUser} T={T} dark={dark}
              onLike={toggleLike} onRepost={toggleRepost} onBookmark={toggleBookmark}
              onFollow={toggleFollow} onProfile={openProfile} onMsg={openDM}
              postPing={postPing} onDeletePost={deletePostOptimistic} onDeleteReply={deleteReply}
              onShare={handleShare}
              onFollowList={type=>setFollowListInfo({userId:pUser.id,type})}
              onQR={()=>setQrTarget(pUser)}
              onSavePhoto={photo=>setUsers(us=>us.map(u=>u.id===myId?{...u,photo}:u))}
              onMakePublic={handleMakePublic}
              submitReply={submitReply}/>
          );
        })()}
      </div>

      {/* FAB */}
      {tab==="stream"&&(
        <button className="fab" style={{transform:fabVis?"scale(1)":"scale(0)",opacity:fabVis?1:0}}
          onClick={()=>isGuest?setShowAuth(true):setComposeOpen(true)}>
          <I.Plus/>
        </button>
      )}

      {/* BOTTOM NAV — all colours from T.barText / T.barIcon */}
      <div style={{position:"fixed",bottom:0,left:"50%",width:"100%",maxWidth:600,
        background:T.navBg,backdropFilter:"blur(20px)",borderTop:`1px solid ${T.border}`,
        display:"flex",height:58,zIndex:100,
        transition:"transform .28s ease,opacity .28s ease",
        transform:`translateX(-50%) translateY(${barVis?"0":"64px"})`,opacity:barVis?1:0}}>
        {[{id:"stream",El:I.Home},{id:"search",El:I.Search},{id:"notifications",El:I.Bell,badge:unread>0},{id:"messages",El:I.Mail},{id:"profile",El:I.User}].map(({id,El,badge})=>(
          <button key={id} className={`bTab ${tab===id?"on":""}`}
            onClick={()=>{setTab(id);if(id==="profile")setProfileTarget(myId);if(id!=="messages")setDmTarget(null);setInlineReplyPost(null);}}>
            <El/>{badge&&<div className="ndot"/>}
          </button>
        ))}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Compose */}
      {composeOpen&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setComposeOpen(false);setPingText("");}}}>
          <div className="sheet fadeIn" style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <span style={{fontSize:13,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>new ping</span>
              <button className="iBtn" onClick={()=>{setComposeOpen(false);setPingText("");}}><I.Close/></button>
            </div>
            <div style={{display:"flex",gap:12}}>
              <Av user={displayMe} size={40}/>
              <div style={{flex:1}}>
                <textarea style={{width:"100%",fontSize:16,lineHeight:1.65,minHeight:80,color:T.text,fontFamily:"system-ui,-apple-system,sans-serif"}}
                  placeholder="What's happening?" value={pingText} maxLength={240}
                  onChange={e=>setPingText(e.target.value)} autoFocus
                  onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))postPing(pingText);}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
                  <CC n={pingText.length} max={240} T={T}/>
                  <button className="btnPrimary" onClick={()=>postPing(pingText)} disabled={!pingText.trim()||pingText.length>240}>ping it</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded thread */}
      {expandedPost&&(()=>{
        const post=posts.find(p=>p.id===expandedPost),author=post?getUser(post.userId):null;
        if(!post||!author)return null;
        const threadReplies=replies.filter(r=>r.postId===expandedPost).sort((a,b)=>a.createdAt-b.createdAt);
        return (
          <ExpandedPostModal post={post} author={author} me={displayMe} T={T}
            threadReplies={threadReplies} getUser={getUser}
            onClose={()=>setExpandedPost(null)}
            onLike={()=>toggleLike(post.id)} onRepost={()=>toggleRepost(post.id)}
            onBookmark={()=>toggleBookmark(post.id)}
            onShare={()=>{setShareTarget(post);setPosts(ps=>ps.map(x=>x.id===post.id?{...x,shares:x.shares+1}:x));}}
            onDeletePost={deletePostOptimistic} onDeleteReply={deleteReply}
            onProfile={id=>{setExpandedPost(null);openProfile(id);}}
            onSubmitReply={submitReply}/>
        );
      })()}

      {/* Public link safety */}
      {publicLinkTarget&&<PublicLinkModal post={publicLinkTarget} T={T} onConfirm={confirmMakePublic} onCancel={()=>setPublicLinkTarget(null)}/>}

  {/* Share modal */}
      {shareTarget&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShareTarget(null);}}>
          <div className="sheet slideUp" style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <span style={{fontSize:10,color:T.text3,letterSpacing:"0.1em",textTransform:"uppercase"}}>share ping</span>
              <button className="iBtn" onClick={()=>setShareTarget(null)}><I.Close/></button>
            </div>
            <div style={{background:T.bg3,borderRadius:8,padding:"12px 14px",marginBottom:18,fontSize:12,color:T.text2,lineHeight:1.65}}>
              "{shareTarget.content}"
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={()=>{copyLink(`https://ping.app/p/${shareTarget.id}`);setShareTarget(null);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.bg3,border:`1px solid ${T.border2}`,borderRadius:6,cursor:"pointer",fontFamily:"'Space Mono',monospace",color:T.text,fontSize:11,textAlign:"left"}}>
                <I.Link/><span>copy link to ping</span>
              </button>

              <button onClick={()=>capturePostAsStory(shareTarget, getUser(shareTarget.userId), dark)}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:12,
                  padding:"12px 14px",
                  background:"linear-gradient(135deg,#7cc644, #4FF7A0)",
                  border:"none",
                  borderRadius:6,
                  cursor:"pointer",
                  fontFamily:"'Space Mono',monospace",
                  color:"#fff",
                  fontSize:11,
                  textAlign:"left"
                }}>
                
                {/* green dot logo */}
                <span style={{
                  width:8,
                  height:8,
                  background:"#ffffff",
                  borderRadius:"50%",
                  display:"inline-block"
                }}></span>

                <span>share ping card</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* QR Identity — with new PingQR */}
      {qrTarget&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setQrTarget(null);}}>
          <div className="sheet fadeIn" style={{padding:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <span style={{fontSize:13,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>ping identity</span>
              <button className="iBtn" onClick={()=>setQrTarget(null)}><I.Close/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18,paddingBottom:8}}>
              <Av user={qrTarget} size={70}/>
              <div style={{textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <span style={{fontWeight:700,fontSize:20,color:T.text}}>@{qrTarget.username}</span>
                  {qrTarget.isPrivate&&<span style={{color:T.text3,display:"flex"}}><I.Lock/></span>}
                </div>
                {qrTarget.bio&&<div style={{color:T.text3,fontSize:13,marginTop:4,maxWidth:240,lineHeight:1.5}}>{qrTarget.bio}</div>}
              </div>
              <div style={{background:"#fff",borderRadius:14,padding:12,boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}>
                <PingQR user={qrTarget} size={200}/>
              </div>
              <div style={{fontSize:11,color:T.text3,letterSpacing:".05em"}}>ping.app/@{qrTarget.username}</div>
              <div style={{display:"flex",gap:10,width:"100%"}}>
                <button onClick={()=>copyLink(`https://ping.app/@${qrTarget.username}`)}
                  style={{flex:1,padding:"11px 0",background:T.bg3,border:`1px solid ${T.border2}`,borderRadius:8,cursor:"pointer",fontSize:13,color:T.text,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <I.Link/> copy link
                </button>
                <button onClick={()=>exportContact(qrTarget)}
                  style={{flex:1,padding:"11px 0",background:T.bg3,border:`1px solid ${T.border2}`,borderRadius:8,cursor:"pointer",fontSize:13,color:T.text,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <I.Download/> save contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow list */}
      {followListInfo&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setFollowListInfo(null);}}>
          <div className="sheet fadeIn" style={{maxHeight:"75vh"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:13,color:T.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>{followListInfo.type}</span>
              <button className="iBtn" onClick={()=>setFollowListInfo(null)}><I.Close/></button>
            </div>
            {(()=>{
              const u=getUser(followListInfo.userId);if(!u)return null;
              const list=followListInfo.type==="followers"?users.filter(x=>u.followers.includes(x.id)):users.filter(x=>u.following.includes(x.id));
              return list.length===0
                ?<div style={{padding:40,color:T.text3,fontSize:14,textAlign:"center"}}>nobody yet</div>
                :list.map(x=><URow key={x.id} user={x} me={displayMe} following={me?.following?.includes(x.id)||false} T={T}
                    onFollow={()=>toggleFollow(x.id)}
                    onProfile={()=>{setFollowListInfo(null);openProfile(x.id);}}
                    onMsg={()=>{setFollowListInfo(null);openDM(x.id);}}/>);
            })()}
          </div>
        </div>
      )}

      {/* Settings */}
      {editOpen&&me&&(
        <SettingsModal user={me} T={T} dark={dark}
          isGuest={false}
          onSave={saveProfile} onClose={()=>setEditOpen(false)}
          onToggleDark={()=>setDark(d=>!d)}
          onQR={()=>{setEditOpen(false);setQrTarget(me);}}
          onSavePhoto={photo=>setUsers(us=>us.map(u=>u.id===myId?{...u,photo}:u))}
          onLogOut={handleLogOut}
          onDeleteAccount={()=>{handleLogOut();setUsers(us=>us.filter(u=>u.id!==myId));}}
          onContinueWithApple={()=>{setCopiedMsg("Apple sign-in coming soon!");setEditOpen(false);}}/>
      )}
    </div>
  );
}
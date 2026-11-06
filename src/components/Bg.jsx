import React from 'react';

const Bg = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)', backgroundSize: '58px 58px' }} />
    {[
      { w:520,h:520,top:'-160px',left:'-160px',c:'rgba(0,212,255,0.065)',d:'22s',dl:'0s' },
      { w:360,h:360,bottom:'-90px',right:'-90px',c:'rgba(0,255,136,0.05)',d:'18s',dl:'-6s' },
      { w:270,h:270,top:'42%',left:'62%',c:'rgba(139,92,246,0.05)',d:'26s',dl:'-12s' },
      { w:190,h:190,top:'18%',right:'18%',c:'rgba(0,212,255,0.04)',d:'20s',dl:'-4s' },
    ].map((o, i) => (
      <div key={i} style={{ position:'absolute', width:o.w, height:o.h, top:o.top, left:o.left, bottom:o.bottom, right:o.right, borderRadius:'50%', background:`radial-gradient(circle,${o.c} 0%,transparent 70%)`, animation:`float ${o.d} ease-in-out infinite`, animationDelay:o.dl }} />
    ))}
    <div style={{ position:'absolute',top:0,left:0,width:180,height:180,borderTop:'1px solid rgba(0,212,255,0.1)',borderLeft:'1px solid rgba(0,212,255,0.1)' }} />
    <div style={{ position:'absolute',bottom:0,right:0,width:180,height:180,borderBottom:'1px solid rgba(0,212,255,0.1)',borderRight:'1px solid rgba(0,212,255,0.1)' }} />
  </div>
);

export default Bg;

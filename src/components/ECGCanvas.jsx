import React, { useEffect, useRef } from 'react';

const ECGCanvas = ({ heartRate = 72, color = '#00ff88', height = 130 }) => {
  const ref  = useRef(null);
  const anim = useRef(null);
  const data = useRef([]);
  const lastBeatX = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = height;
    const mid = H / 2;
    const speed = Math.max(2, Math.min(5, heartRate / 18));
    const beatInterval = (60 / heartRate) * (W / speed * 0.016);

    if (!data.current.length) data.current = new Array(W).fill(mid);

    const ecgY = (phase) => {
      if (phase < 0.06)  return mid - (phase / 0.06) * H * 0.07;
      if (phase < 0.11)  return mid - H * 0.07 + ((phase - 0.06) / 0.05) * H * 0.07;
      if (phase < 0.25)  return mid;
      if (phase < 0.27)  return mid + H * 0.1 * ((phase - 0.25) / 0.02);
      if (phase < 0.31)  return mid + H * 0.1 - H * 0.5 * ((phase - 0.27) / 0.04);
      if (phase < 0.36)  return mid - H * 0.4 + H * 0.5 * ((phase - 0.31) / 0.05);
      if (phase < 0.39)  return mid + H * 0.1 - H * 0.1 * ((phase - 0.36) / 0.03);
      if (phase < 0.55)  return mid;
      if (phase < 0.65)  return mid - Math.sin(((phase - 0.55) / 0.1) * Math.PI) * H * 0.1;
      return mid;
    };

    let x = 0;
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(0,212,255,0.055)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 28) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

      if (x - lastBeatX.current >= beatInterval) lastBeatX.current = x;
      const phase = ((x - lastBeatX.current) / beatInterval) % 1;
      data.current.shift();
      data.current.push(ecgY(phase));
      x += speed;

      ctx.shadowColor = color; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      data.current.forEach((y, i) => i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y));
      ctx.stroke();

      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(W - 1, data.current[data.current.length - 1], 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();

      anim.current = requestAnimationFrame(draw);
    };

    anim.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim.current);
  }, [heartRate, color, height]);

  return <canvas ref={ref} style={{ width: '100%', height: `${height}px`, display: 'block', borderRadius: 6 }} />;
};

export default ECGCanvas;

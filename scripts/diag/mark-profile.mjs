import sharp from 'sharp'
// Centre-panel Almaghrabi lockup, generous region.
const L=1080,T=30,W=380,H=280
const { data, info } = await sharp('assets/brand/brochure_page1.jpg')
  .extract({ left:L, top:T, width:W, height:H }).raw().toBuffer({ resolveWithObject:true })
const ch=info.channels
// The mark is GOLD on white: look for saturated warm pixels, not just dark ones.
const isMark=(x,y)=>{
  const i=(y*info.width+x)*ch
  const r=data[i],g=data[i+1],b=data[i+2]
  return (r-b) > 25 && r > 90 && b < 200
}
let minX=1e9,maxX=-1,minY=1e9,maxY=-1
const rows=new Array(info.height).fill(0)
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++) if(isMark(x,y)){
  rows[y]++
  if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y
}
console.log('gold-ink bbox abs: x', L+minX, '→', L+maxX, '  y', T+minY, '→', T+maxY)
console.log('row profile (abs y : count):')
rows.forEach((c,i)=>{ if(c>0) console.log('  ', T+i, c) })

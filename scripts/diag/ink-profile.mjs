import sharp from 'sharp'
const L=892,T=470,W=640,H=200
const { data, info } = await sharp('assets/brand/brochure_page1.jpg')
  .extract({ left:L, top:T, width:W, height:H }).raw().toBuffer({ resolveWithObject:true })
const ch=info.channels
const ink=(x,y)=>{const i=(y*info.width+x)*ch; return (255-Math.min(data[i],data[i+1],data[i+2]))>60}
for(let y=0;y<info.height;y++){let c=0;for(let x=0;x<info.width;x++)if(ink(x,y))c++
  if(T+y>=618) console.log('  y='+(T+y), c)}

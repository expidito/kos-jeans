"use client";
import Image from 'next/image';
import {useState,useRef} from 'react';
import {Modal} from '@/components/storefront/modal';
export type ProductImage={id:string;alt_text:string};

function Photo({image,title,contain=false,eager=false,thumbnail=false}:{image:ProductImage;title:string;contain?:boolean;eager?:boolean;thumbnail?:boolean}){
  const [failed,setFailed]=useState(false);
  return failed?<span className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">Фотографія тимчасово недоступна.</span>:<Image unoptimized src={`/media/${image.id}?w=${thumbnail?160:contain?1440:960}`} alt={image.alt_text||title} fill loading={eager?'eager':'lazy'} sizes={contain?'100vw':'(max-width: 768px) 100vw, 55vw'} onError={()=>setFailed(true)} className={contain?'object-contain':'object-cover'}/>;
}
export function ProductGallery({images,title}:{images:ProductImage[];title:string}){
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(false),[magnified,setMagnified]=useState(true);
  const touch=useRef<{x:number;y:number}|null>(null);const swiped=useRef(false);const active=images[index];
  const move=(delta:number)=>setIndex(i=>(i+delta+images.length)%images.length);
  return <div className="min-w-0" aria-label="Галерея товару">
    <div className="relative bg-canvas" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};swiped.current=false;}} onTouchEnd={e=>{if(touch.current!==null&&images.length>1){const delta=e.changedTouches[0].clientX-touch.current.x;const vertical=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(delta)>55&&Math.abs(delta)>Math.abs(vertical)){swiped.current=true;move(delta<0?1:-1);}}touch.current=null;}}>
      <button type="button" disabled={!active} onClick={()=>{if(swiped.current){swiped.current=false;return;}setMagnified(true);setZoom(true);}} aria-label="Збільшити фотографію" className="relative block aspect-[3/4] w-full overflow-hidden text-left disabled:cursor-default">{active?<Photo key={active.id} image={active} title={title} eager/>:<span className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">Фотографії товару ще готуються.</span>}</button>
      {active&&<span className="pointer-events-none absolute right-4 bottom-4 border border-line bg-paper/95 px-3 py-2 text-[10px]">Натисніть, щоб збільшити ↗</span>}
    </div>
    {images.length>1&&<><div className="mt-4 flex items-center justify-between gap-4"><button type="button" onClick={()=>move(-1)} aria-label="Попередня фотографія" className="min-h-11 border border-line px-4">←</button><p role="status" className="text-xs text-muted">Фото {index+1} з {images.length}</p><button type="button" onClick={()=>move(1)} aria-label="Наступна фотографія" className="min-h-11 border border-line px-4">→</button></div><div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">{images.map((image,i)=><button key={image.id} type="button" onClick={()=>setIndex(i)} aria-label={`Фото ${i+1}`} aria-pressed={index===i} className={`relative aspect-[3/4] overflow-hidden border-2 bg-canvas ${index===i?'border-ink':'border-transparent'}`}><Photo image={image} title={`Фото ${i+1}: ${title}`} thumbnail/></button>)}</div></>}
    <Modal open={zoom} onClose={()=>setZoom(false)} title="Перегляд фотографії">{zoom&&active&&<><button type="button" onClick={()=>setMagnified(v=>!v)} aria-pressed={magnified} className="mb-3 min-h-11 border border-control px-4 text-xs">{magnified?"Вписати у вікно":"Збільшити ×2"}</button><p className="mb-3 text-[11px] text-muted">Прокручуйте фотографію, щоб роздивитися деталі.</p><div className="h-[65vh] overflow-auto bg-canvas" data-zoomed={magnified}><div className={magnified?"relative h-[130vh] w-[200%]":"relative h-full w-full"}><Photo key={active.id} image={active} title={title} contain eager/></div></div></>}{zoom&&images.length>1&&<div className="mt-4 flex items-center justify-between"><button type="button" onClick={()=>move(-1)} className="min-h-11 border border-line px-4" aria-label="Попередня збільшена фотографія">←</button><span role="status" className="text-xs">{index+1} / {images.length}</span><button type="button" onClick={()=>move(1)} className="min-h-11 border border-line px-4" aria-label="Наступна збільшена фотографія">→</button></div>}</Modal>
  </div>;
}

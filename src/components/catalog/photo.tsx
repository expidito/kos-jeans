"use client";
import Image from 'next/image';
import {useState} from 'react';
export function CatalogPhoto({id,alt}:{id:string|null;alt:string}){const[failed,setFailed]=useState(false);return id&&!failed?<Image unoptimized src={`/media/${id}`} alt={alt} fill sizes="(max-width: 768px) 45vw, 24vw" onError={()=>setFailed(true)} className="object-cover"/>:<div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">Фотографія готується</div>;}

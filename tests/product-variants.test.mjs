import {test} from 'node:test';
import assert from 'node:assert/strict';
import {variantColors,variantSizes,findVariant,cartSelection} from '../src/lib/product/variants.ts';
const variants=[
  {id:'v1',product_id:'p',sku:'TEST-1',size:'28',color:'Синій',stock:0,is_active:true},
  {id:'v2',product_id:'p',sku:'TEST-2',size:'30',color:'Білий',stock:5,is_active:true},
  {id:'v3',product_id:'p',sku:'TEST-3',size:'26',color:'Синій',stock:2,is_active:true},
  {id:'v4',product_id:'p',sku:'TEST-4',size:'29',color:'Синій',stock:7,is_active:false},
];
test('sizes reflect selected color, include zero stock and disable nonexistent combinations',()=>{
 assert.deepEqual(variantColors(variants),['Синій','Білий']);
 assert.deepEqual(variantSizes(variants,'Синій'),[{value:'26',available:true},{value:'28',available:false},{value:'30',available:false}]);
 assert.deepEqual(variantSizes(variants,'Білий'),[{value:'26',available:false},{value:'28',available:false},{value:'30',available:true}]);
});
test('only an active, existing, positive-stock variant can be selected',()=>{
 assert.equal(findVariant(variants,'Синій','28'),null);assert.equal(findVariant(variants,'Синій','30'),null);assert.equal(findVariant(variants,'Синій','29'),null);
 assert.equal(findVariant(variants,'Білий','30').id,'v2');assert.equal(findVariant(variants,'Unknown','30'),null);
});
test('future cart selection keeps real IDs and bounds quantity to the variant stock',()=>{
 const v=findVariant(variants,'Білий','30');assert.deepEqual(cartSelection('p',v,2),{productId:'p',variantId:'v2',color:'Білий',size:'30',quantity:2});
 for(const quantity of [0,-1,1.5,6,NaN,Infinity])assert.equal(cartSelection('p',v,quantity),null);
 assert.equal(cartSelection('other',v,1),null);assert.equal(cartSelection('p',null,1),null);assert.equal(cartSelection('p',variants[0],1),null);assert.equal(cartSelection('p',variants[3],1),null);
});

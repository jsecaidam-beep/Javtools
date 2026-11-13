const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('/Users/javisfiles/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const repo = path.resolve(__dirname,'../..');
const photoRoot = '/Users/javisfiles/Downloads/Fotos de servicios de Salud';
const photoFiles = {
  limarBefore:'Cetro Comunitario El Limar/Antes/Imagen3.jpg',
  limarRoof:'Cetro Comunitario El Limar/Antes/Imagen5.jpg',
  limarProgress:'Cetro Comunitario El Limar/Despues/4942c69b-5bf8-4faf-9269-f20e480ba8a7.jpg',
  limarDrain:'Cetro Comunitario El Limar/Despues/db786965-a627-485e-9f50-a8eb682fba83.jpg',
  camotanBefore:'Centro de Salud Camotán/Antres/Imagen5.jpg',
  camotanInside:'Centro de Salud Camotán/Antres/Imagen4.jpg',
  camotanProgress:'Centro de Salud Camotán/Despues/eaba21bf-435b-4f75-a46d-a0a82f838be7.jpg',
  camotanWall:'Centro de Salud Camotán/Despues/62f82abd-99e9-4bdf-a4d6-e9d697bdf79b.jpg',
  antonioBefore:'Centro Comunitario San Antonio La Libertad/Antes/Imagen4.jpg',
  antonioProgress:'Centro Comunitario San Antonio La Libertad/Despues/61f02413-5972-470c-b7c5-dde23e849224.jpg',
  chiquimulaBefore:'Centro de Salud de Chiquimula/Anrtes/Imagen2.jpg',
  chiquimulaProgress:'Centro de Salud de Chiquimula/Despues/ab500a98-d740-4215-8cb7-aeaf6b48a60a.jpg',
  palmarBefore:'Centro Comunitario Palmarcito/Antes/Imagen10.jpg',
  palmarDetail:'Centro Comunitario Palmarcito/Antes/Imagen5.jpg',
  shalaguaBefore:'Centro Comunitario Shalagua/Antes/Imagen3.jpg',
  shalaguaDetail:'Centro Comunitario Shalagua/Antes/Imagen5.jpg',
};
const coverage = [
 {id:'limar-salud',name:'Centro comunitario de salud de Limar',municipality:'Chiquimula',families:665,people:1304,type:'Salud'},
 {id:'volcan',name:'Aldea Volcán',municipality:'Camotán',families:428,people:2139,type:'Sistema de agua potable'},
 {id:'ticipe',name:'Aldea Ticipe',detail:'Caseríos Cañón y Tierra Blanca',municipality:'Camotán',families:691,people:3458,type:'Sistema de agua potable'},
 {id:'tablas',name:'Aldea Las Tablas',municipality:'Chiquimula',families:281,people:876,type:'Sistema de agua potable'},
 {id:'maraxco',name:'Aldea Maraxco',municipality:'Chiquimula',families:1191,people:5958,type:'Sistema de agua potable'},
 {id:'limar-agua',name:'Aldea Limar',municipality:'Chiquimula',families:260,people:1304,type:'Sistema de agua potable'},
 {id:'palmarcito',name:'Centro comunitario de salud Palmarcito',municipality:'Chiquimula',families:1517,people:7586,type:'Agua y saneamiento'},
 {id:'brisas',name:'Barrio Las Brisas',municipality:'Chiquimula',families:26,people:131,type:'Reparación de tanque de almacenamiento'},
 {id:'rodeo',name:'Centro comunitario El Rodeo',municipality:'Camotán',families:405,people:665,type:'Mejoramiento del centro comunitario'},
];
(async()=>{
 const assets={};
 for(const [key,file] of Object.entries(photoFiles)) {
  const bytes=await fs.readFile(path.join(photoRoot,file));
  const buffer=await sharp(bytes).rotate().resize({width:1500,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
  assets[key]='data:image/webp;base64,'+buffer.toString('base64');
 }
 for(const [key,file,mime] of [['fhg','fhg-blanco.svg','image/svg+xml'],['ach','ach-blanco.svg','image/svg+xml'],['font','futura-lt-pro-bold.woff2','font/woff2']]) {
  assets[key]='data:'+mime+';base64,'+(await fs.readFile(path.join(repo,'public/assets/invitaciones',file))).toString('base64');
 }
 const template=await fs.readFile(path.join(__dirname,'template.html'),'utf8');
 const html=template.replace('/*__ASSETS__*/', 'const ASSETS='+JSON.stringify(assets)+'; const COVERAGE='+JSON.stringify(coverage)+';').replaceAll('__FUTURA_URL__',assets.font).replaceAll('__ACH_URL__',assets.ach).replaceAll('__FHG_URL__',assets.fhg);
 await fs.mkdir(path.join(repo,'public/presentaciones'),{recursive:true});
 await fs.writeFile(path.join(repo,'public/presentaciones/mejoramientos.html'),html);
 console.log('Mejoramientos: '+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MB · 16 fotografías · 9 obras con cobertura · sin dependencias externas');
})();

const now = Date.now(), H = 3600e3;
const iso = (ms) => new Date(now + ms).toISOString();
const types = [{id:1,slug:'torre',name:'Guerra de Torres',kind:'war',color:'#a52525',rsvp_enabled:true,active:true,sort:1},{id:2,slug:'cidades',name:'Guerra de Cidades',kind:'war',color:'#d4a017',rsvp_enabled:true,active:true,sort:2,has_cities:true},{id:4,slug:'boss',name:'Boss',kind:'boss',color:'#6a4',rsvp_enabled:false,active:true,sort:3}];
types.splice(2,0,{id:3,slug:'noatun',name:'Guerra de Noatun',kind:'war',color:'#4f8fd8',rsvp_enabled:true,active:true,sort:3,optional:true});
const classes = [['TK','TransKnight'],['FM','Foema'],['BM','BeastMaster'],['HT','Huntress']].map(([code,name],i)=>({code,name,sort:i,active:true}));
const LN={TK:['TK Confiança','TK Trans','TK Espada Mágica'],FM:['FM Blood','Foema Black','Foema Dano'],BM:['BM Natureza','BM Evocação','BM Mago'],HT:['HT Troca','HT Captura','HT Sobrevivência']};
let lid=0; const lin=Object.entries(LN).flatMap(([c,a])=>a.map(n=>({id:++lid,class_code:c,name:n,sort:lid,active:true})));
const me = 'u1';
const chars = (u,n,c,main=true)=>[{id:'c'+u,user_id:u,nick:n,class_code:c,lineage_id:lin.find(l=>l.class_code===c).id,level:99,is_main:main}];
const prof = [['u1','Rafael','TK','RafaTK','owner'],['u2','Bia','FM','BiaBlood','member'],['u3','Caio','BM','CaioBM','leader'],['u4','Duda','HT','DudaHT','member'],['u5','Eli','TK','EliTrans','member'],['u6','Fabi','FM','FabiBlack','leader'],['u7','Gui','BM','GuiEvoc','member'],['u8','Hugo','TK','HugoMK','leader']].map(([id,dn,c,n,role])=>({id,display_name:dn,role,status:'active',sub_slot:({u3:1,u6:2,u8:3})[id]||null,joined_at:iso(-99*H),characters:chars(id,n,c)}));
const ev = (id,t,title,off)=>({id,event_type_id:t,title,starts_at:iso(off),rsvp_opens_at:iso(off-8*H),rsvp_closes_at:iso(off-0.5*H),status:'scheduled',event_types:types.find(x=>x.id===t)});
const DATA = {
  site_settings:[{key:'theme',value:{bg:'#060a14',surface:'#0e1526',text:'#efe8d8',muted:'#9aa3b5',primary:'#a3162b',accent:'#e2b552'}},{key:'guild_name',value:'FATALITY'},{key:'logo_url',value:'assets/logo.jpg'},{key:'favicon_url',value:'assets/logo.jpg'}],
  profiles:prof, game_classes:classes, game_lineages:lin, event_types:types,
  characters:prof.flatMap(p=>p.characters),
  events:[{...ev('p1',1,'Guerra de Torres',-48*H),status:'done'},{...ev('p2',1,'Guerra de Torres',-120*H),status:'done'},ev('e1',1,'Guerra de Torres',3*H),ev('e2',2,'Guerra de Cidades + Noatun',27*H),ev('e3',3,'Boss Dragão',5*H),{...ev('p3',1,'Guerra de Torres',-72*H),status:'done'},{...ev('n1',3,'Guerra de Noatun',29*H),status:'cancelled'},{...ev('n2',3,'Guerra de Noatun',197*H),status:'scheduled'}],
  event_rsvps:[{event_id:'e1',user_id:'u1',status:'going',character_id:'cu1'},{event_id:'e1',user_id:'u2',status:'going',character_id:'cu2'},{event_id:'e1',user_id:'u3',status:'not_going',character_id:'cu3'}],
  event_cities:[{id:'c1',event_id:'e2',city:'Armia',sort:1},{id:'c2',event_id:'e2',city:'Erion',sort:2}], event_results:[{event_id:'p1',fame:1250000,note:'Torres 1 e 2'},{event_id:'p2',fame:980000},{event_id:'p3',fame:1410000},{event_id:'e2',bet_fame:3000000}], event_prints:[], event_attendance:[{event_id:'p1',user_id:'u1',attended:true},{event_id:'p1',user_id:'u2',attended:true},{event_id:'p1',user_id:'u3',attended:true},{event_id:'p2',user_id:'u1',attended:true},{event_id:'p2',user_id:'u3',attended:true},{event_id:'p2',user_id:'u6',attended:true}], announcements:[{id:'a',title:'Treino sábado',body:'Todos **online** às 20h.',pinned:true,created_at:iso(-H)}],
  bosses:[{id:1,name:'Dragão',respawn_minutes:180,notes:'',active:true,sort:1},{id:2,name:'Rei Esqueleto',respawn_minutes:null,notes:'Fixo',active:true,sort:2}],
  boss_next_spawn:[{boss_id:1,name:'Dragão',last_killed_at:iso(-H),next_spawn_at:iso(2*H)}],
  boss_kills:[], invites:[{id:'i',code:'abc',label:'Recrutamento',role_on_join:'member',max_uses:10,uses:2,expires_at:null,active:true}],
  pending_members:[], schedule_rules:[{id:'r',title:'Torre',event_type_id:1,weekdays:[2,4],start_time:'21:00:00',rsvp_open_time:'15:00:00',rsvp_close_offset_min:30,lead_days:7,active:true,event_types:{name:'Guerra de Torres'},bosses:null}],
  integration_settings:[{id:1,evolution_base_url:'',evolution_instance:'',whatsapp_connected:false,sends_paused:true,delay_min_s:4,delay_max_s:12}],
  notification_rules:[{id:'n',name:'Torre',kind:'war',event_type_id:1,offsets_min:[10],audience:'going',audience_classes:[],template:'Oi {nome}',active:false,event_types:{name:'Guerra de Torres'}}],
  notification_queue:[], audit_log:[], cms_pages:[], profile_private:[{id:'u1',whatsapp:'5548999999999',notify_prefs:{}}], member_notes:[],
};
const user = {id:me,email:'a@b.c',user_metadata:{full_name:'Rafael'},identities:[{provider:'google'}]};
function builder(t){
  let single=false;
  const b = new Proxy({}, { get(_,k){
    if(k==='then') return (res)=>{ let d = DATA[t]||[]; if(single) d=d[0]||null; res({data:d,error:null,count:(DATA[t]||[]).length}); };
    if(k==='maybeSingle'||k==='single'){ return ()=>{ single=true; return b; }; }
    return ()=>b;
  }});
  return b;
}
export function createClient(){
  const ch={on(){return ch;},subscribe(){return ch;}};
  const session = window.__NOSESSION ? null : {user, access_token:'x'};
  return {
    from:builder, rpc:()=>builder('none'), channel:()=>ch, removeChannel(){},
    auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){return{data:{subscription:{}}}},signOut:async()=>{},signInWithOAuth:async()=>({}),linkIdentity:async()=>({})},
    functions:{invoke:async()=>({data:{valid:true,state:'close'},error:null})},
    storage:{from:()=>({upload:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}})})},
  };
}

// ============================================================
// NANZMUSIFY - CORE PLAYER (FULL FIX)
// ============================================================
const API={search:'/api/search',artist:'/api/artist',suggest:'/api/suggest',lyrics:'/api/lyrics',ytplay:'/api/ytplay'};
const FI='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#2a2a2a"/><text x="150" y="150" text-anchor="middle" dy=".3em" font-size="50" fill="#6b7280">🎵</text></svg>');
const S={ht:[],sr:[],ar:[],sq:'',filter:'all',ct:null,pl:[],pi:-1,ps:'',ip:false,il:false,rm:'off',autoNext:true,yp:null,yr:false,iv:null,pt:0,pd:0,at:'home',ld:{type:'none',lines:[]},cli:-1,lo:false,lyricOffset:0,server:'2',playbackRate:1.0,sleepSecondsLeft:0,sleepEndWithTrack:false};
try{S.server=localStorage.getItem('nanzz_server')||'2';}catch(e){}
try{S.playbackRate=parseFloat(localStorage.getItem('nanzz_playback_rate'))||1.0;}catch(e){S.playbackRate=1.0;}
function fm(s){if(isNaN(s))return"0:00";const m=Math.floor(s/60),se=Math.floor(s%60);return m+':'+(se<10?'0':'')+se;}
function es(t){if(!t)return'';const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function cn(t){if(!t)return'Unknown';return t.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\uFFFF]/g,'').replace(/\s*-\s*Topic$/i,'').trim()||'Unknown';}
function gid(id){return document.getElementById(id);}

function updateOG(title,image){
    var t=document.querySelector('meta[property="og:title"]');if(!t){t=document.createElement('meta');t.setAttribute('property','og:title');document.head.appendChild(t);}t.setAttribute('content',title+' | Musicall');
    var i=document.querySelector('meta[property="og:image"]');if(!i){i=document.createElement('meta');i.setAttribute('property','og:image');document.head.appendChild(i);}i.setAttribute('content',image||FI);
    document.title=title+' - Musicall';
}

const yt=document.createElement('script');yt.src="https://www.youtube.com/iframe_api";document.head.appendChild(yt);
function onYouTubeIframeAPIReady(){S.yp=new YT.Player('yt-player',{height:'0',width:'0',playerVars:{autoplay:1,controls:0,enablejsapi:1,playsinline:1},events:{onReady:function(){S.yr=true;},onStateChange:ys}});}
var ytFallbackTimeout = null;
function ys(e){
    if(S.server!=='1')return;
    if(e.data===1){
        if(ytFallbackTimeout){clearTimeout(ytFallbackTimeout);ytFallbackTimeout=null;}
        S.ip=true;S.il=false;UB();SP();
        try{if(S.yp&&typeof S.yp.setPlaybackRate==='function')S.yp.setPlaybackRate(S.playbackRate||1.0);}catch(ex){}
    }else if(e.data===2){
        S.ip=false;UB();ST();
    }else if(e.data===0){
        ST();
        if(handleTrackEnded())return;
        if(S.rm==='one'){S.yp.seekTo(0);S.yp.playVideo();}
        else if(S.autoNext){NX();}
    }else if(e.data===3){
        S.il=true;UB();
    }
}

// ---- AUDIO ENGINE SERVER 2 (elemen <audio> native, sumber stream dari /api/ytplay) ----
var AU=gid('audio-player');
if(!AU){AU=document.createElement('audio');AU.id='audio-player';AU.preload='auto';AU.style.display='none';document.body.appendChild(AU);}
AU.addEventListener('play',function(){if(S.server==='2'){S.ip=true;S.il=false;UB();SP();try{AU.playbackRate=S.playbackRate||1.0;}catch(ex){}}});
AU.addEventListener('pause',function(){if(S.server==='2'&&!AU.ended){S.ip=false;UB();ST();}});
AU.addEventListener('waiting',function(){if(S.server==='2'){S.il=true;UB();}});
AU.addEventListener('playing',function(){if(S.server==='2'){S.il=false;UB();}});
AU.addEventListener('ended',function(){if(S.server!=='2')return;ST();if(handleTrackEnded())return;if(S.rm==='one'){AU.currentTime=0;AU.play().catch(function(){});}else if(S.autoNext){NX();}else{S.ip=false;UB();}});
AU.addEventListener('error',function(){if(S.server==='2'&&AU.src){S.il=false;S.ip=false;UB();showToast('⚠️ Server 2 gagal memutar lagu ini');}});

function SP(){
    ST();
    S.iv=setInterval(function(){
        if(S.server==='2'){
            if(!AU.paused){S.pt=AU.currentTime||0;S.pd=AU.duration||0;renderProgress();}
        }else if(S.yp&&S.yr&&S.ip){
            S.pt=S.yp.getCurrentTime()||0;S.pd=S.yp.getDuration()||0;renderProgress();
        }
    },200);
}
function ST(){if(S.iv){clearInterval(S.iv);S.iv=null;}}
function renderProgress(){
    var p=S.pd>0?(S.pt/S.pd)*100:0;
    var mp=gid('mini-progress'),fp=gid('full-progress'),sb=gid('seek-bar'),tc=gid('time-curr'),td=gid('time-dur');
    if(mp)mp.style.width=p+'%';if(fp)fp.style.width=p+'%';if(sb)sb.value=p;if(tc)tc.innerText=fm(S.pt);if(td)td.innerText=fm(S.pd);ULH(S.pt);
}

function UB(){
    var mi=gid('mini-play-btn'),fu=gid('full-play-btn');
    if(!mi||!fu)return;
    if(S.il){mi.innerHTML='<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';fu.innerHTML='<div class="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin"></div>';}
    else if(S.ip){mi.innerHTML='<i data-lucide="pause" class="w-6 h-6 fill-current"></i>';fu.innerHTML='<i data-lucide="pause" class="w-7 h-7 fill-current"></i>';}
    else{mi.innerHTML='<i data-lucide="play" class="w-6 h-6 fill-current"></i>';fu.innerHTML='<i data-lucide="play" class="w-7 h-7 fill-current ml-0.5"></i>';}
    lucide.createIcons();
}

function UU(){if(!S.ct)return;var mc=gid('mini-cover'),mt=gid('mini-title'),ma=gid('mini-artist'),fc=gid('full-cover'),ft=gid('full-title'),fa=gid('full-artist'),fh=gid('full-header-artist'),fb=gid('full-bg-blur');if(mc)mc.src=S.ct.cover;if(mt)mt.innerText=S.ct.title;if(ma)ma.innerText=S.ct.artist;if(fc)fc.src=S.ct.cover;if(ft)ft.innerText=S.ct.title;if(fa)fa.innerText=S.ct.artist;if(fh)fh.innerText=S.ct.artist;if(fb)fb.src=S.ct.cover;updateOG(S.ct.title,S.ct.cover);}

// PLAY TRACK - AUTO FETCH LYRICS
function PK(s,i){
    var l=[];if(s==='home1')l=S.ht.slice(0,6);else if(s==='home2')l=S.ht.slice(6,12);else if(s==='search')l=S.sr;else if(s==='playlist')l=S.pl;else if(s==='rec0')l=S.rec0||[];else if(s==='rec1')l=S.rec1||[];else if(s==='rec2')l=S.rec2||[];
    if(!l[i])return;S.ps=s;S.pl=l;S.pi=i;S.ct=l[i];
    var url=location.origin+'/?play='+S.ct.videoId;history.pushState({},'',url);
    UU();MP.show();S.il=true;UB();
    
    // RESET & FETCH LYRICS BARU 🔥 (langsung pas miniplayer muncul)
    resetLyricsUI(S.ct.videoId);
    
    loadTrack(S.ct);
}

// MUAT TRACK SESUAI SERVER PEMUTAR YANG AKTIF
function loadTrack(track,resumeAt){
    if(!track)return;
    ST();
    if(ytFallbackTimeout){
        clearTimeout(ytFallbackTimeout);
        ytFallbackTimeout=null;
    }
    if(S.server==='2'){
        if(S.yp&&S.yr){try{S.yp.stopVideo();}catch(e){}}
        playViaServer2(track,resumeAt);
    }else{
        try{AU.pause();}catch(e){}
        if(S.yp&&S.yr&&track.videoId){
            S.yp.loadVideoById({videoId:track.videoId});
            if(resumeAt)try{S.yp.seekTo(resumeAt,true);}catch(e){}
            
            // Set timeout 4 detik untuk fallback jika player tidak mulai play
            ytFallbackTimeout=setTimeout(function(){
                if(S.ct===track && !S.ip){
                    console.log('YouTube Player gagal memutar, mengalihkan ke Server 2...');
                    showToast('⚡ Mengalihkan ke Server 2 untuk pemutaran lebih lancar...');
                    S.server='2';
                    try{localStorage.setItem('nanzz_server','2');}catch(e){}
                    try{S.yp.stopVideo();}catch(e){}
                    playViaServer2(track,resumeAt);
                }
            },4000);
        }else{
            // Jika YouTube Player belum siap atau diblokir, langsung pakai Server 2!
            console.log('YouTube Player belum siap, menggunakan Server 2...');
            playViaServer2(track,resumeAt);
        }
    }
}
// SERVER 2 - ambil direct audio stream dari /api/ytplay lalu putar via elemen <audio>
async function playViaServer2(track,resumeAt){
    S.il=true;UB();
    try{
        var ytUrl=track.ytUrl||('https://youtube.com/watch?v='+track.videoId);
        var r=await fetch(API.ytplay,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:ytUrl})});
        var d=await r.json();
        if(S.ct!==track)return; // user udah pindah lagu sebelum fetch ini selesai
        if(d&&d.status&&d.result&&d.result.download&&d.result.download.audio){
            var audioUrl = d.result.download.audio;
            if (audioCtx) {
                // Gunakan proxy audio agar Web Audio Equalizer dapat memproses audio cross-origin
                AU.src = '/api/proxy-audio?url=' + encodeURIComponent(audioUrl);
            } else {
                // Lepaskan properti crossOrigin agar browser memutar link langsung tanpa hambatan CORS
                AU.removeAttribute('crossorigin');
                AU.src = audioUrl;
            }
            if(resumeAt){
                var onMeta=function(){AU.currentTime=resumeAt;AU.removeEventListener('loadedmetadata',onMeta);};
                AU.addEventListener('loadedmetadata',onMeta);
            }
            AU.play().catch(function(){});
        }else{
            S.il=false;S.ip=false;UB();showToast('⚠️ Server 2 gagal memuat lagu ini');
        }
    }catch(e){
        if(S.ct===track){S.il=false;S.ip=false;UB();showToast('⚠️ Server 2 gagal memuat lagu ini');}
    }
}

function TP(){
    if(!S.ct)return;
    if(S.server==='2'){
        if(!AU.src)return;
        if(AU.paused)AU.play().catch(function(){});else AU.pause();
    }else{
        if(!S.yp||!S.yr)return;
        S.ip?S.yp.pauseVideo():S.yp.playVideo();
    }
}
function NX(){if(!S.pl.length)return;var ni=S.pi+1;if(ni>=S.pl.length){if(S.rm==='all')ni=0;else{S.ip=false;UB();return;}}PK(S.ps,ni);}
function PV(){
    if(!S.pl.length)return;
    if(S.pt>3){
        if(S.server==='2'){AU.currentTime=0;}else if(S.yp&&S.yr){S.yp.seekTo(0);}
        return;
    }
    var pi=S.pi-1;if(pi<0)pi=S.pl.length-1;PK(S.ps,pi);
}
function SK(v){
    if(S.server==='2'){
        if(AU.duration)AU.currentTime=(parseFloat(v)/100)*AU.duration;
    }else{
        if(S.yp&&S.yr&&S.pd>0)S.yp.seekTo((parseFloat(v)/100)*S.pd,true);
    }
}
function TR(){var b=gid('btn-repeat'),d=gid('repeat-dot'),o=gid('repeat-one');if(S.rm==='off'){S.rm='all';b.classList.add('text-[#cfd3d8]');d.classList.remove('hidden');}else if(S.rm==='all'){S.rm='one';o.classList.remove('hidden');}else{S.rm='off';b.classList.remove('text-[#cfd3d8]');d.classList.add('hidden');o.classList.add('hidden');}}
function SF(){if(S.pl.length)PK(S.ps,Math.floor(Math.random()*S.pl.length));}
function toggleAutoNext(){S.autoNext=!S.autoNext;showToast(S.autoNext?'✅ Putar Berikutnya: ON':'⏸️ Putar Berikutnya: OFF');}

function shareTrack(){if(!S.ct||!S.ct.videoId)return;var url=location.origin+'/?play='+S.ct.videoId+'&share=1';updateOG(S.ct.title,S.ct.cover);if(navigator.share){navigator.share({title:S.ct.title,text:'🎵 '+S.ct.title+' - '+S.ct.artist,url:url}).catch(function(){});}}

// ============================================================
// PENGATURAN SERVER PEMUTAR
// ============================================================
function setServer(v){
    if(S.server===v){closeServerSettings();return;}
    var prevTime=S.pt||0,hadTrack=!!S.ct;
    S.server=v;
    try{localStorage.setItem('nanzz_server',v);}catch(e){}
    if(v==='1'&&'Notification' in window&&Notification.permission==='default'){
        Notification.requestPermission().then(function(perm){
            if(perm==='granted')showToast('✅ Izin notifikasi diberikan');
            else showToast('⚠️ Tanpa izin notifikasi, pemutaran di background bisa terhenti');
        }).catch(function(){});
    }
    closeServerSettings();
    showToast('🔁 Server pemutar diganti ke Server '+v);
    if(hadTrack){S.il=true;UB();loadTrack(S.ct,prevTime);}
}
function openServerSettings(){
    closeServerSettings();
    var s1=S.server==='1',s2=S.server==='2';
    var popup=document.createElement('div');
    popup.id='server-settings-popup';
    popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
    popup.onclick=function(e){if(e.target===popup)closeServerSettings();};
    popup.innerHTML='<div class="bg-[#1a1a1a] w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.3s ease-out forwards;">'+
        '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>'+
        '<h3 class="font-bold text-white mb-1">Pengaturan Server</h3>'+
        '<p class="text-[#6b7280] text-xs mb-4">Pilih server pemutaran yang sesuai kebutuhanmu</p>'+
        '<button onclick="setServer(\'1\')" class="w-full text-left p-4 rounded-2xl mb-3 border '+(s1?'border-white/40 bg-white/10':'border-white/10 hover:bg-white/5')+' transition-all">'+
            '<div class="flex items-center justify-between"><span class="font-bold text-white">Server 1</span>'+(s1?'<i data-lucide="check-circle" class="w-5 h-5 text-[#1ed760]"></i>':'')+'</div>'+
            '<p class="text-[#b3b3b3] text-xs mt-1">⚡ Lebih cepat, tapi perlu izin notifikasi agar tetap jalan saat aplikasi di background.</p>'+
        '</button>'+
        '<button onclick="setServer(\'2\')" class="w-full text-left p-4 rounded-2xl mb-2 border '+(s2?'border-white/40 bg-white/10':'border-white/10 hover:bg-white/5')+' transition-all">'+
            '<div class="flex items-center justify-between"><span class="font-bold text-white">Server 2</span>'+(s2?'<i data-lucide="check-circle" class="w-5 h-5 text-[#1ed760]"></i>':'')+'</div>'+
            '<p class="text-[#b3b3b3] text-xs mt-1">🐢 Sedikit lebih lambat memuat lagu, tapi tidak perlu izin notifikasi untuk tetap jalan di background.</p>'+
        '</button>'+
        '<button onclick="closeServerSettings()" class="w-full mt-3 py-3 border border-white/20 text-white rounded-full">Tutup</button>'+
    '</div>';
    document.body.appendChild(popup);
    lucide.createIcons();
}
function closeServerSettings(){var p=gid('server-settings-popup');if(p)p.remove();}

// RESET TAMPILAN LIRIK + FETCH BARU - dipanggil di SEMUA jalur play (klik lagu, share link, dll)
// biar lirik selalu fetch persis saat miniplayer pertama kali muncul
function resetLyricsUI(vid){
    S.ld={type:'none',lines:[]};S.cli=-1;S.lyricOffset=0;
    var lc=gid('lyrics-loading'),cc=gid('lyrics-content'),ec=gid('lyrics-empty');
    if(lc)lc.classList.remove('hidden');
    if(cc){cc.classList.add('hidden');cc.innerHTML='';}
    if(ec)ec.classList.add('hidden');
    updateSyncBadge();
    if(vid)FL(vid);
}

// LYRICS - AUTO FETCH + NO CACHE
async function FL(vid){
    var l=gid('lyrics-loading'),c=gid('lyrics-content'),e=gid('lyrics-empty');
    l.classList.remove('hidden');c.classList.add('hidden');e.classList.add('hidden');
    S.ld={type:'none',lines:[]};S.cli=-1;S.lyricOffset=0;updateSyncBadge();
    try{
        // Tambah timestamp biar gak cache
        var r=await fetch(API.lyrics+'?id='+vid+'&t='+Date.now());
        var d=await r.json();
        if(d.status&&d.result.lyrics&&d.result.lyrics.lines.length>0){
            S.ld=d.result.lyrics;var html='';
            S.ld.lines.forEach(function(li,i){
                html+='<p class="lyric-line text-left px-4 py-2 cursor-pointer" data-time="'+li.time+'" onclick="SLT('+li.time+')">'+es(li.text)+'</p>';
            });
            html+='<p class="text-center text-[#4b5563] text-xs mt-8 mb-4 opacity-50 tracking-widest">——— end ———</p>';
            c.innerHTML=html;l.classList.add('hidden');c.classList.remove('hidden');
        }else{l.classList.add('hidden');e.classList.remove('hidden');}
    }catch(er){l.classList.add('hidden');e.classList.remove('hidden');}
}

function ULH(ct){
    if(S.ld.lines.length===0)return;
    var ls=document.querySelectorAll('.lyric-line');
    var ni=-1;for(var i=0;i<S.ld.lines.length;i++){if(ct>=S.ld.lines[i].time){ni=i;}}
    // Terapkan offset sinkronisasi manual (tombol +/-) di atas hasil deteksi otomatis
    var off=S.lyricOffset||0;
    var ei=ni+off;
    if(ei<-1)ei=-1;
    if(ei>S.ld.lines.length-1)ei=S.ld.lines.length-1;
    if(ei===S.cli)return;
    ls.forEach(function(l, i){
        l.classList.remove('active-lyric');
        if (i < ei) {
            l.style.opacity = '0.3';
        } else if (i === ei) {
            l.classList.add('active-lyric');
            l.style.opacity = '1';
            l.scrollIntoView({behavior:'smooth',block:'center'});
        } else {
            l.style.opacity = '0.6';
        }
    });
    S.cli=ei;
}
function SLT(t){if(S.yp&&S.yr)S.yp.seekTo(t,true);}

// SINKRONISASI MANUAL LIRIK - tombol + maju 1 lirik, tombol - mundur 1 lirik
function adjustLyricSync(delta){
    if(!S.ld||!S.ld.lines||S.ld.lines.length===0){showToast('⚠️ Lirik belum tersedia');return;}
    var max=S.ld.lines.length-1;
    S.lyricOffset=(S.lyricOffset||0)+delta;
    if(S.lyricOffset>max)S.lyricOffset=max;
    if(S.lyricOffset<-max)S.lyricOffset=-max;
    S.cli=-2; // pastikan ULH re-render walau index hasil hitungan sama
    ULH(S.pt);
    updateSyncBadge();
    showToast((delta>0?'⏩ Lirik maju':'⏪ Lirik mundur')+' 1 baris');
}
function lyricSyncNext(){adjustLyricSync(1);}
function lyricSyncPrev(){adjustLyricSync(-1);}
function updateSyncBadge(){
    var b=gid('lyric-sync-badge');if(!b)return;
    var o=S.lyricOffset||0;
    if(o===0){b.classList.add('hidden');b.innerText='';}
    else{b.classList.remove('hidden');b.innerText=(o>0?'+':'')+o;}
}

function toggleLyrics(){var o=gid('lyrics-overlay');if(S.lo){o.style.transform='translateY(100%)';setTimeout(function(){o.style.display='none';},400);S.lo=false;MP.show();}else{o.style.display='flex';requestAnimationFrame(function(){requestAnimationFrame(function(){o.style.transform='translateY(0)';});});S.lo=true;MP.hide();if(S.ct&&S.ct.videoId&&S.ld.lines.length===0)FL(S.ct.videoId);}}

// PLAYLIST SYSTEM
function getUserPlaylists(){try{return JSON.parse(localStorage.getItem('nanzz_playlists')||'[]');}catch(e){return[];}}
function saveUserPlaylists(pls){try{localStorage.setItem('nanzz_playlists',JSON.stringify(pls));}catch(e){}}
function createPlaylist(name,image){var pls=getUserPlaylists();var id='pl_'+Date.now();pls.push({id:id,name:name,image:image||'',songs:[]});saveUserPlaylists(pls);return id;}
function updateUserPlaylist(id,name,image){var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===id;});if(!pl)return;if(name)pl.name=name;if(image)pl.image=image;saveUserPlaylists(pls);}
function deleteUserPlaylist(id){var pls=getUserPlaylists().filter(function(p){return p.id!==id;});saveUserPlaylists(pls);}
function addToPlaylistById(playlistId,track){var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===playlistId;});if(!pl)return;var exists=pl.songs.find(function(s){return s.videoId===track.videoId;});if(!exists){pl.songs.push({id:track.id,videoId:track.videoId,title:track.title,artist:track.artist,cover:track.cover,artistId:track.artistId||'',ytUrl:track.ytUrl});if(!pl.image&&pl.songs.length===1){pl.image=track.cover;}saveUserPlaylists(pls);showToast('✅ Ditambahkan ke '+pl.name);}else{showToast('⚠️ Sudah ada di playlist');}}
function showToast(msg){var toast=document.createElement('div');toast.className='fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1ed760] text-black font-bold px-5 py-2.5 rounded-full shadow-2xl z-[999]';toast.style.animation='slideUp 0.3s ease-out forwards';toast.innerText=msg;document.body.appendChild(toast);setTimeout(function(){toast.remove();},2000);}
function addCurrentToPlaylist(){if(!S.ct)return;var pls=getUserPlaylists();if(pls.length===0){showToast('⚠️ Belum ada playlist! Buat di Library dulu');return;}showPlaylistPicker(S.ct);}
function showPlaylistPicker(track){var pls=getUserPlaylists();var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';popup.onclick=function(e){if(e.target===popup)popup.remove();};var listHtml=pls.map(function(p){return'<button onclick="addToPlaylistById(\''+p.id+'\',S.ct);this.parentElement.parentElement.remove();" class="w-full text-left p-4 hover:bg-white/5 flex items-center gap-3 border-b border-white/5"><img src="'+(p.image||FI)+'" class="w-10 h-10 rounded object-cover" /><div><p class="font-medium text-white">'+p.name+'</p><p class="text-[#6b7280] text-xs">'+p.songs.length+' lagu</p></div></button>';}).join('');popup.innerHTML='<div class="bg-[#1a1a1a] w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.3s ease-out forwards;"><div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div><h3 class="font-bold text-white mb-3">Tambah ke Playlist</h3><div class="max-h-72 overflow-y-auto hide-scrollbar">'+listHtml+'</div><button onclick="this.parentElement.parentElement.remove()" class="w-full mt-3 py-3 border border-white/20 text-white rounded-full">Batal</button></div>';document.body.appendChild(popup);}

// ============================================================
// EQUALIZER & SHARE CARD FEATURES
// ============================================================
var audioCtx = null;
var sourceNode = null;
var filters = [];

function setupWebAudioEQ() {
    if (audioCtx) return;
    try {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
        var AU_el = gid('audio-player');
        if (!AU_el) return;
        AU_el.crossOrigin = "anonymous";
        sourceNode = audioCtx.createMediaElementSource(AU_el);
        
        var freqs = [60, 230, 910, 4000, 14000];
        var lastNode = sourceNode;
        filters = freqs.map(function(f, idx) {
            var filter = audioCtx.createBiquadFilter();
            filter.type = idx === 0 ? 'lowshelf' : (idx === 4 ? 'highshelf' : 'peaking');
            filter.frequency.value = f;
            filter.Q.value = 1.0;
            filter.gain.value = S.eqBands ? S.eqBands[idx] : 0;
            lastNode.connect(filter);
            lastNode = filter;
            return filter;
        });
        lastNode.connect(audioCtx.destination);
    } catch(e) {
        console.warn('Web Audio API Equalizer failed to setup:', e);
    }
}

function updateEQGain(bandIdx, gainValue) {
    if (!S.eqBands) S.eqBands = [0, 0, 0, 0, 0];
    S.eqBands[bandIdx] = parseFloat(gainValue);
    
    if (filters && filters[bandIdx]) {
        try {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            filters[bandIdx].gain.value = parseFloat(gainValue);
        } catch(e) {}
    }
}

function handleTrackEnded() {
    if (S.sleepEndWithTrack) {
        triggerSleep();
        return true;
    }
    return false;
}

var sleepIntervalId = null;

function startSleepTimer(minutes) {
    clearSleepTimer();
    var seconds = minutes * 60;
    S.sleepSecondsLeft = seconds;
    S.sleepEndWithTrack = false;
    
    updateSleepBadge();
    
    sleepIntervalId = setInterval(function() {
        if (S.sleepSecondsLeft > 0) {
            S.sleepSecondsLeft--;
            updateSleepBadge();
            var timerDisplay = gid('sleep-countdown-display');
            if (timerDisplay) {
                timerDisplay.innerText = fm(S.sleepSecondsLeft);
            }
        } else {
            triggerSleep();
        }
    }, 1000);
    
    showToast('💤 Timer tidur diatur: ' + minutes + ' menit');
    closeSleepTimer();
}

function startSleepAtTrackEnd() {
    clearSleepTimer();
    S.sleepEndWithTrack = true;
    updateSleepBadge();
    showToast('💤 Musik akan berhenti di akhir lagu ini');
    closeSleepTimer();
}

function clearSleepTimer() {
    if (sleepIntervalId) {
        clearInterval(sleepIntervalId);
        sleepIntervalId = null;
    }
    S.sleepSecondsLeft = 0;
    S.sleepEndWithTrack = false;
    updateSleepBadge();
    
    var popup = gid('sleep-timer-popup');
    if (popup) {
        closeSleepTimer();
        setTimeout(openSleepTimer, 100);
    }
}

function triggerSleep() {
    if (sleepIntervalId) {
        clearInterval(sleepIntervalId);
        sleepIntervalId = null;
    }
    S.sleepSecondsLeft = 0;
    S.sleepEndWithTrack = false;
    updateSleepBadge();
    
    if (S.server === '2') {
        if (AU) {
            try { AU.pause(); } catch(e){}
        }
    } else {
        if (S.yp && S.yr) {
            try { S.yp.pauseVideo(); } catch(e){}
        }
    }
    S.ip = false;
    UB();
    ST();
    showToast('💤 Timer tidur selesai, musik dihentikan');
}

function updateSleepBadge() {
    var badge = gid('sleep-badge');
    var dot = gid('sleep-dot');
    if (!badge) return;
    
    if (S.sleepSecondsLeft > 0) {
        var mins = Math.ceil(S.sleepSecondsLeft / 60);
        badge.innerText = mins + 'm';
        if (dot) dot.classList.remove('hidden');
    } else if (S.sleepEndWithTrack) {
        badge.innerText = 'Akhir Lagu';
        if (dot) dot.classList.remove('hidden');
    } else {
        badge.innerText = 'Timer';
        if (dot) dot.classList.add('hidden');
    }
}

function openSleepTimer() {
    if (gid('sleep-timer-popup')) return;
    
    var popup = document.createElement('div');
    popup.id = 'sleep-timer-popup';
    popup.className = 'fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
    popup.onclick = function(e) { if(e.target === popup) closeSleepTimer(); };
    
    var contentHtml = '';
    
    if (S.sleepSecondsLeft > 0) {
        contentHtml = '<div class="text-center mb-6">' +
            '<p class="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Timer Sedang Berjalan</p>' +
            '<h4 id="sleep-countdown-display" class="text-3xl font-black font-mono text-white">' + fm(S.sleepSecondsLeft) + '</h4>' +
            '<button onclick="clearSleepTimer()" class="mt-4 px-6 py-2.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all">Batalkan Timer</button>' +
        '</div>';
    } else if (S.sleepEndWithTrack) {
        contentHtml = '<div class="text-center mb-6">' +
            '<p class="text-sm text-[#cfd3d8] font-bold mb-1">Berhenti di akhir lagu aktif</p>' +
            '<p class="text-[11px] text-[#6b7280] mb-4">Lagu akan berhenti setelah lagu ini selesai diputar.</p>' +
            '<button onclick="clearSleepTimer()" class="px-6 py-2.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all">Batalkan Timer</button>' +
        '</div>';
    } else {
        var options = [5, 10, 15, 30, 45, 60];
        var gridHtml = options.map(function(m) {
            return '<button onclick="startSleepTimer(' + m + ')" class="py-3 px-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white font-medium hover:bg-white/10 active:scale-95 transition-all">' + m + ' Menit</button>';
        }).join('');
        
        contentHtml = '<div class="grid grid-cols-3 gap-3 mb-4">' + gridHtml + '</div>' +
            '<button onclick="startSleepAtTrackEnd()" class="w-full py-3.5 px-4 rounded-2xl bg-[#cfd3d8]/10 hover:bg-[#cfd3d8]/20 border border-white/10 text-xs text-white font-bold active:scale-95 transition-all flex items-center justify-center gap-2">' +
                '<i data-lucide="music-4" class="w-4 h-4"></i> Hentikan di Akhir Lagu' +
            '</button>';
    }
    
    popup.innerHTML = '<div class="w-full max-w-md rounded-t-3xl p-6 border-t border-white/10 glass-strong" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color);">' +
        '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>' +
        '<div class="flex justify-between items-center mb-5">' +
            '<div>' +
                '<h3 class="font-black text-white text-lg">Timer Tidur</h3>' +
                '<p class="text-[#6b7280] text-xs">Hentikan musik secara otomatis saat tidur</p>' +
            '</div>' +
            '<button onclick="closeSleepTimer()" class="text-[#6b7280] hover:text-white p-1"><i data-lucide="x" class="w-5 h-5"></i></button>' +
        '</div>' +
        contentHtml +
    '</div>';
    
    document.body.appendChild(popup);
    lucide.createIcons();
}

function closeSleepTimer() {
    var p = gid('sleep-timer-popup');
    if (p) p.remove();
}

function openPlaybackSpeed() {
    if (gid('playback-speed-popup')) return;
    
    var popup = document.createElement('div');
    popup.id = 'playback-speed-popup';
    popup.className = 'fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
    popup.onclick = function(e) { if(e.target === popup) closePlaybackSpeed(); };
    
    var speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    var currentSpeed = S.playbackRate || 1.0;
    
    var optionsHtml = speeds.map(function(sp) {
        var isSelected = currentSpeed === sp;
        var btnStyle = isSelected 
            ? 'bg-[#cfd3d8] text-black font-bold border-[#cfd3d8]' 
            : 'bg-white/5 hover:bg-white/10 text-white border-white/5';
        var label = sp === 1.0 ? '1.0x (Normal)' : sp + 'x';
        return '<button onclick="setPlaybackSpeed(' + sp + ')" class="w-full py-3.5 px-4 rounded-2xl border text-sm font-medium active:scale-98 transition-all flex items-center justify-between ' + btnStyle + '">' +
            '<span>' + label + '</span>' +
            (isSelected ? '<i data-lucide="check" class="w-4 h-4 text-black"></i>' : '') +
        '</button>';
    }).join('');
    
    popup.innerHTML = '<div class="w-full max-w-md rounded-t-3xl p-6 border-t border-white/10 glass-strong" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color); max-height: 80vh; overflow-y: auto;">' +
        '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>' +
        '<div class="flex justify-between items-center mb-5">' +
            '<div>' +
                '<h3 class="font-black text-white text-lg">Kecepatan Putar</h3>' +
                '<p class="text-[#6b7280] text-xs">Atur kecepatan putar lagu sesuai seleramu</p>' +
            '</div>' +
            '<button onclick="closePlaybackSpeed()" class="text-[#6b7280] hover:text-white p-1"><i data-lucide="x" class="w-5 h-5"></i></button>' +
        '</div>' +
        '<div class="flex flex-col gap-2 mb-4">' +
            optionsHtml +
        '</div>' +
    '</div>';
    
    document.body.appendChild(popup);
    lucide.createIcons();
}

function setPlaybackSpeed(speed) {
    S.playbackRate = speed;
    try {
        localStorage.setItem('nanzz_playback_rate', speed);
    } catch(e) {}
    
    applyPlaybackSpeed();
    closePlaybackSpeed();
    showToast('⚡ Kecepatan putar diatur ke ' + (speed === 1.0 ? 'Normal' : speed + 'x'));
}

function applyPlaybackSpeed() {
    var speed = S.playbackRate || 1.0;
    if (S.server === '2') {
        if (AU) {
            try { AU.playbackRate = speed; } catch(e) {}
        }
    } else {
        if (S.yp && S.yr && typeof S.yp.setPlaybackRate === 'function') {
            try { S.yp.setPlaybackRate(speed); } catch(e) {}
        }
    }
    updateSpeedBadge();
}

function updateSpeedBadge() {
    var badge = gid('speed-badge');
    if (!badge) return;
    var speed = S.playbackRate || 1.0;
    badge.innerText = speed === 1.0 ? 'Normal' : speed + 'x';
}

function closePlaybackSpeed() {
    var p = gid('playback-speed-popup');
    if (p) p.remove();
}

function openEqualizer() {
    if (document.getElementById('equalizer-popup')) return;
    
    if (!S.eqBands) S.eqBands = [0, 0, 0, 0, 0];
    if (!S.activePreset) S.activePreset = 'Normal';
    
    if (S.server === '2') {
        var hadAudioCtx = !!audioCtx;
        setupWebAudioEQ();
        if (!hadAudioCtx && audioCtx && S.ct && !AU.paused) {
            // Jika audioCtx baru aktif, muat ulang lagu saat ini menggunakan proxy agar filter EQ berfungsi
            var currTime = AU.currentTime;
            showToast('🎚️ Mengaktifkan Equalizer...');
            loadTrack(S.ct, currTime);
        }
    }
    
    var popup = document.createElement('div');
    popup.id = 'equalizer-popup';
    popup.className = 'fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
    popup.onclick = function(e) { if(e.target === popup) closeEqualizer(); };
    
    var bandsList = ['Bass', 'Low-Mid', 'Mid', 'High-Mid', 'Treble'];
    var slidersHtml = bandsList.map(function(b, idx) {
        var val = S.eqBands[idx];
        return '<div class="flex flex-col items-center flex-1 gap-2">' +
            '<span id="eq-val-label-' + idx + '" class="text-[10px] text-[#6b7280] font-mono">' + (val > 0 ? '+' : '') + Math.round(val) + 'dB</span>' +
            '<input type="range" min="-12" max="12" step="0.5" value="' + val + '" ' +
                'class="eq-slider h-32" style="writing-mode: vertical-lr; direction: rtl; -webkit-appearance: slider-vertical; width: 12px;" ' +
                'oninput="changeSlider(' + idx + ', this.value)" />' +
            '<span class="text-xs text-[#a0a5b0] font-medium">' + b + '</span>' +
        '</div>';
    }).join('');
    
    var presets = ['Normal', 'Bass Booster', 'Vocal Booster', 'Electronic', 'Acoustic'];
    var presetsHtml = presets.map(function(p) {
        var act = S.activePreset === p;
        var btnStyle = act ? 'bg-[#cfd3d8]/20 text-white font-bold' : 'hover:bg-white/5 text-[#a0a5b0]';
        return '<button onclick="applyPreset(\'' + p + '\')" class="px-3.5 py-1.5 rounded-full text-xs transition-all ' + btnStyle + '">' + p + '</button>';
    }).join('');
    
    popup.innerHTML = '<div class="w-full max-w-md rounded-t-3xl p-6 border-t border-white/10 glass-strong" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color);">' +
        '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>' +
        '<div class="flex justify-between items-center mb-4">' +
            '<div>' +
                '<h3 class="font-black text-white text-lg">Equalizer</h3>' +
                '<p class="text-[#6b7280] text-xs">Atur frekuensi suara sesuai selera</p>' +
            '</div>' +
            '<div id="visualizer-container" class="flex items-end gap-1 h-8 px-3 py-1 rounded-xl bg-white/5 shadow-inner" style="box-shadow: var(--nm-shadow-inset-sm);">' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
                '<div class="eq-bar"></div>' +
            '</div>' +
        '</div>' +
        
        '<div id="eq-presets-container" class="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-6">' + presetsHtml + '</div>' +
        
        '<div class="flex items-center justify-around mb-8 h-48">' + slidersHtml + '</div>' +
        
        '<button onclick="closeEqualizer()" class="w-full btn-chrome py-3.5 font-bold rounded-full">Selesai</button>' +
    '</div>';
    
    document.body.appendChild(popup);
    lucide.createIcons();
    startEqVisualizer();
}

var eqVisInterval = null;
function startEqVisualizer() {
    if (eqVisInterval) clearInterval(eqVisInterval);
    var bars = document.querySelectorAll('.eq-bar');
    if (bars.length === 0) return;
    
    eqVisInterval = setInterval(function() {
        bars.forEach(function(bar, idx) {
            var h = 4;
            if (S.ip) {
                var multiplier = (S.eqBands ? S.eqBands[idx % 5] : 0) + 12;
                var baseRandom = Math.random() * 24;
                h = Math.max(5, Math.min(32, Math.round(baseRandom + (multiplier / 2))));
            }
            bar.style.height = h + 'px';
        });
    }, 120);
}

function stopEqVisualizer() {
    if (eqVisInterval) {
        clearInterval(eqVisInterval);
        eqVisInterval = null;
    }
}

function closeEqualizer() {
    stopEqVisualizer();
    var el = gid('equalizer-popup');
    if (el) el.remove();
}

function changeSlider(bandIdx, val) {
    if (!S.eqBands) S.eqBands = [0, 0, 0, 0, 0];
    var floatVal = parseFloat(val);
    S.eqBands[bandIdx] = floatVal;
    S.activePreset = 'Custom';
    
    // update label dynamically in slider UI
    var label = gid('eq-val-label-' + bandIdx);
    if (label) {
        label.innerText = (floatVal > 0 ? '+' : '') + Math.round(floatVal) + 'dB';
    }
    
    // unhighlight active preset buttons
    var pc = gid('eq-presets-container');
    if (pc) {
        var buttons = pc.querySelectorAll('button');
        buttons.forEach(function(btn) {
            btn.className = 'px-3.5 py-1.5 rounded-full text-xs transition-all hover:bg-white/5 text-[#a0a5b0]';
        });
    }
    
    updateEQGain(bandIdx, floatVal);
}

function applyPreset(presetName) {
    S.activePreset = presetName;
    if (!S.eqBands) S.eqBands = [0, 0, 0, 0, 0];
    
    var mapping = {
        'Normal': [0, 0, 0, 0, 0],
        'Bass Booster': [8, 5, 1, 0, -2],
        'Vocal Booster': [-3, 1, 6, 4, 1],
        'Electronic': [5, 3, -1, 2, 4],
        'Acoustic': [3, 1, 2, 3, 2]
    };
    
    var values = mapping[presetName] || [0, 0, 0, 0, 0];
    values.forEach(function(v, idx) {
        S.eqBands[idx] = v;
        updateEQGain(idx, v);
    });
    
    var pop = gid('equalizer-popup');
    if (pop) {
        pop.remove();
        openEqualizer();
    }
    showToast('🎛️ Equalizer: ' + presetName);
}

function openShareCard() {
    if (!S.ct) {
        showToast('⚠️ Putar lagu terlebih dahulu');
        return;
    }
    
    var popup = document.createElement('div');
    popup.id = 'share-card-popup';
    popup.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black/75 px-4';
    popup.onclick = function(e) { if(e.target === popup) popup.remove(); };
    
    popup.innerHTML = '<div class="w-full max-w-sm rounded-3xl p-6 border border-white/10 glass-strong text-center" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color);">' +
        '<div class="flex justify-between items-center mb-4">' +
            '<h3 class="font-bold text-lg text-white">Bagikan Lagu</h3>' +
            '<button onclick="document.getElementById(\'share-card-popup\').remove()" class="text-[#a0a5b0] hover:text-white p-1"><i data-lucide="x" class="w-5 h-5"></i></button>' +
        '</div>' +
        
        '<div id="share-card-preview" class="p-6 rounded-2xl mb-6 flex flex-col items-center gap-4 relative overflow-hidden" ' +
            'style="box-shadow: var(--nm-shadow-inset); background: var(--bg-color); border: 1px solid var(--border-color);">' +
            '<img src="' + S.ct.cover + '" class="w-48 h-48 object-cover rounded-2xl shadow-xl border border-white/5" />' +
            '<div class="w-full truncate">' +
                '<p class="text-white font-black text-lg truncate">' + es(S.ct.title) + '</p>' +
                '<p class="text-[#a0a5b0] text-xs font-bold mt-1 truncate">' + es(S.ct.artist) + '</p>' +
            '</div>' +
            '<div class="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden"><div class="h-full bg-gradient-to-r from-gray-400 to-white w-2/3"></div></div>' +
            '<div class="flex justify-between w-full text-[9px] text-[#6b7280] font-mono mt-1"><span>1:48</span><span>2:56</span></div>' +
            '<div class="border-t border-white/5 w-full pt-3 mt-1 flex items-center justify-center gap-1.5">' +
                '<i data-lucide="music" class="w-3.5 h-3.5 text-[#a0a5b0]"></i>' +
                '<span class="text-[10px] text-[#6b7280] tracking-wider font-semibold uppercase">NanzMusify Web App</span>' +
            '</div>' +
        '</div>' +
        
        '<div class="space-y-2.5">' +
            '<button onclick="downloadShareCard()" class="w-full btn-chrome py-3 flex items-center justify-center gap-2 font-bold">' +
                '<i data-lucide="download" class="w-4 h-4"></i> Unduh Gambar Card' +
            '</button>' +
            '<div class="grid grid-cols-2 gap-2">' +
                '<button onclick="copyShareLink()" class="btn-chrome py-3 text-sm font-semibold flex items-center justify-center gap-1.5">' +
                    '<i data-lucide="copy" class="w-4 h-4"></i> Salin Link' +
                '</button>' +
                '<button onclick="triggerNativeShare()" class="btn-chrome py-3 text-sm font-semibold flex items-center justify-center gap-1.5">' +
                    '<i data-lucide="share" class="w-4 h-4"></i> Bagikan' +
                '</button>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    document.body.appendChild(popup);
    lucide.createIcons();
}

function copyShareLink() {
    if(!S.ct || !S.ct.videoId) return;
    var url = location.origin + '/?play=' + S.ct.videoId + '&share=1';
    navigator.clipboard.writeText(url).then(function() {
        showToast('📋 Link berhasil disalin ke clipboard!');
    }).catch(function() {
        showToast('⚠️ Gagal menyalin link');
    });
}

function triggerNativeShare() {
    if(!S.ct || !S.ct.videoId) return;
    var url = location.origin + '/?play=' + S.ct.videoId + '&share=1';
    if (navigator.share) {
        navigator.share({
            title: S.ct.title,
            text: '🎵 Dengarkan ' + S.ct.title + ' - ' + S.ct.artist + ' di NanzMusify!',
            url: url
        }).catch(function() {});
    } else {
        copyShareLink();
    }
}

function downloadShareCard() {
    if (!S.ct) return;
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    var ctx = canvas.getContext('2d');
    
    var grad = ctx.createLinearGradient(0, 0, 0, 800);
    var isLight = localStorage.getItem('theme') === 'light';
    if (isLight) {
        grad.addColorStop(0, '#e0e5ec');
        grad.addColorStop(1, '#c8d0db');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 800);
    } else {
        grad.addColorStop(0, '#1a1b22');
        grad.addColorStop(1, '#0f1014');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 800);
    }
    
    ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 540, 740);
    
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        ctx.save();
        var rx = 100, ry = 80, rw = 400, rh = 400, radius = 24;
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, rx, ry, rw, rh);
        ctx.restore();
        
        ctx.fillStyle = isLight ? '#2d3748' : '#ffffff';
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(S.ct.title, 300, 540, 480);
        
        ctx.fillStyle = isLight ? '#718096' : '#a0a5b0';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(S.ct.artist, 300, 585, 480);
        
        ctx.fillStyle = isLight ? '#a0aec0' : '#4a5568';
        ctx.font = '16px monospace';
        ctx.fillText('DIDENGARKAN DI NANZMUSIFY', 300, 710);
        
        try {
            var dataUrl = canvas.toDataURL('image/png');
            var a = document.createElement('a');
            a.download = S.ct.title.replace(/[^a-zA-Z0-9]/g, '_') + '_nanzmusify.png';
            a.href = dataUrl;
            a.click();
            showToast('✅ Berhasil mengunduh Share Card!');
        } catch(e) {
            showToast('⚠️ Gagal unduh karena CORS gambar, silakan screenshot layar!');
        }
    };
    img.onerror = function() {
        ctx.fillStyle = isLight ? '#2d3748' : '#ffffff';
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(S.ct.title, 300, 300, 480);
        
        ctx.fillStyle = isLight ? '#718096' : '#a0a5b0';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(S.ct.artist, 300, 360, 480);
        
        ctx.fillStyle = isLight ? '#a0aec0' : '#4a5568';
        ctx.font = '16px monospace';
        ctx.fillText('DIDENGARKAN DI NANZMUSIFY', 300, 710);
        
        try {
            var dataUrl = canvas.toDataURL('image/png');
            var a = document.createElement('a');
            a.download = S.ct.title.replace(/[^a-zA-Z0-9]/g, '_') + '_nanzmusify.png';
            a.href = dataUrl;
            a.click();
            showToast('✅ Berhasil mengunduh Share Card (tanpa cover)!');
        } catch(ex) {
            showToast('⚠️ Gagal mengunduh Share Card');
        }
    };
    img.src = S.ct.cover || FI;
}

// DAFTAR ANTRIAN (QUEUE)
function openQueue(){
    if(gid('queue-popup'))return;
    var popup=document.createElement('div');
    popup.id='queue-popup';
    popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
    popup.onclick=function(e){if(e.target===popup)closeQueue();};

    var listHtml='';
    if(!S.pl||S.pl.length===0){
        listHtml='<div class="text-center text-[#6b7280] py-10"><i data-lucide="list-music" class="w-12 h-12 mx-auto mb-3 opacity-30"></i><p class="text-sm">Antrian kosong</p></div>';
    }else{
        listHtml=S.pl.map(function(t,i){
            var active=i===S.pi;
            return '<div onclick="playQueueIndex('+i+')" class="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer active:scale-[0.98] '+(active?'bg-white/10':'hover:bg-white/5')+'">'+
                '<img src="'+t.cover+'" class="w-11 h-11 rounded-lg object-cover flex-shrink-0" onerror="this.src=\''+FI+'\'" />'+
                '<div class="flex-1 truncate"><p class="text-sm font-medium truncate '+(active?'text-[#cfd3d8]':'text-white')+'">'+es(t.title)+'</p><p class="text-[#6b7280] text-xs truncate">'+es(t.artist)+'</p></div>'+
                (active?'<i data-lucide="volume-2" class="w-4 h-4 text-[#cfd3d8] flex-shrink-0"></i>':'<span class="text-[#6b7280] text-xs flex-shrink-0">'+(i+1)+'</span>')+
            '</div>';
        }).join('');
    }

    popup.innerHTML='<div class="w-full max-w-md rounded-t-3xl p-6 border-t border-white/10 glass-strong" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color); max-height:75vh; display:flex; flex-direction:column;">'+
        '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0"></div>'+
        '<div class="flex justify-between items-center mb-4 flex-shrink-0">'+
            '<div><h3 class="font-black text-white text-lg">Daftar Antrian</h3><p class="text-[#6b7280] text-xs">'+(S.pl?S.pl.length:0)+' lagu dalam antrian</p></div>'+
            '<button onclick="closeQueue()" class="text-[#6b7280] hover:text-white p-1"><i data-lucide="x" class="w-5 h-5"></i></button>'+
        '</div>'+
        '<div class="overflow-y-auto hide-scrollbar space-y-1 flex-1">'+listHtml+'</div>'+
    '</div>';

    document.body.appendChild(popup);
    lucide.createIcons();
}
function closeQueue(){var p=gid('queue-popup');if(p)p.remove();}
function playQueueIndex(i){
    if(!S.pl||!S.pl[i])return;
    S.pi=i;S.ct=S.pl[i];
    var url=location.origin+'/?play='+S.ct.videoId;history.pushState({},'',url);
    UU();MP.show();S.il=true;UB();
    resetLyricsUI(S.ct.videoId);
    loadTrack(S.ct);
    closeQueue();
}

// UNDUH LAGU (AUDIO)
function downloadCurrentSong(){
    if(!S.ct)return;
    showToast('⏳ Menyiapkan unduhan...');
    var ytUrl=S.ct.ytUrl||('https://youtube.com/watch?v='+S.ct.videoId);
    fetch(API.ytplay,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:ytUrl})})
        .then(function(r){return r.json();})
        .then(function(d){
            if(d&&d.status&&d.result&&d.result.download&&d.result.download.audio){
                var audioUrl=d.result.download.audio;
                var a=document.createElement('a');
                a.href='/api/proxy-audio?url='+encodeURIComponent(audioUrl);
                a.download=(S.ct.title||'lagu').replace(/[^a-zA-Z0-9]/g,'_')+'.mp3';
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast('✅ Unduhan dimulai!');
            }else{
                showToast('⚠️ Gagal mengambil link unduhan');
            }
        })
        .catch(function(){showToast('⚠️ Gagal mengunduh lagu');});
}

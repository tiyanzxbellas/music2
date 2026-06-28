const Search={
    render(){
        gid('view-search').innerHTML=`
        <div class="pt-12 px-4"><h1 class="text-3xl font-black mb-4">Cari</h1><form id="search-form" class="relative" autocomplete="off"><div class="absolute inset-y-0 left-0 pl-4 flex items-center text-[#6b7280]"><i data-lucide="search" class="h-5 w-5"></i></div><input type="text" id="search-input" class="w-full glass-input text-white font-medium rounded-xl pl-12 pr-16 py-3.5 focus:outline-none placeholder:text-[#6b7280]" placeholder="Cari lagu, artis, atau album..." autocomplete="off" /><button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 btn-chrome font-bold px-4 py-1.5 rounded-lg active:scale-90">Cari</button></form><div id="suggestions" class="hidden mt-2 glass-strong rounded-xl shadow-2xl max-h-72 overflow-y-auto hide-scrollbar"></div></div>
        <div id="filter-tabs" class="hidden flex gap-2 px-4 pb-3 mt-3"><button onclick="setFilter('all')" id="f-all" class="filter-tab active px-4 py-2 rounded-full text-sm font-medium bg-white text-black">Semua</button><button onclick="setFilter('songs')" id="f-songs" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white">Lagu</button><button onclick="setFilter('videos')" id="f-videos" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white">Video</button><button onclick="setFilter('artists')" id="f-artists" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white">Artis</button></div>
        <div class="px-4 mt-2" id="search-results"></div>
        <div id="search-recs" class="px-4 mt-2 space-y-6 pb-8"></div>`;
        lucide.createIcons();Search.events();
    },
    onShow(){if(!S.sq){Search.renderRecs();}},
    REC_ROWS:[{key:'rec0',label:'🆕 Rilis Anyar',q:'baru rilis'},{key:'rec1',label:'🌎 Barat Top',q:'barat Top'},{key:'rec2',label:'🎤 Rapp',q:'Rapp Top'}],
    renderRecs(){
        var rc=gid('search-recs');if(!rc)return;
        if(S.rec0&&S.rec1&&S.rec2){Search.showRecs();return;}
        rc.innerHTML=Search.REC_ROWS.map(function(row){
            return '<div><div class="h-5 w-32 bg-white/10 rounded mb-3 animate-pulse"></div><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-1">'+
                Array(4).fill(0).map(function(){return '<div class="flex-shrink-0 w-32 animate-pulse"><div class="w-32 h-32 rounded-xl bg-white/5 mb-2"></div><div class="h-3 bg-white/10 rounded w-3/4"></div></div>';}).join('')+
            '</div></div>';
        }).join('');
        Promise.all(Search.REC_ROWS.map(function(row){
            return fetch(API.search+'?query='+encodeURIComponent(row.q)).then(function(r){return r.json();}).then(function(d){
                S[row.key]=d.status&&d.result.songs?d.result.songs.map(function(s){return{id:s.videoId,videoId:s.videoId,title:cn(s.title),artist:cn(s.artist),artistId:s.artistId||'',cover:s.thumbnail||FI,ytUrl:s.url};}):[];
            }).catch(function(){S[row.key]=[];});
        })).then(function(){Search.showRecs();});
    },
    showRecs(){
        var rc=gid('search-recs');if(!rc)return;
        rc.innerHTML=Search.REC_ROWS.map(function(row){
            var list=S[row.key]||[];
            if(list.length===0)return '';
            var cardsHtml=list.map(function(t,i){
                return '<div onclick="PK(\''+row.key+'\','+i+')" class="flex-shrink-0 w-32 cursor-pointer active:scale-95 animate-stagger" style="animation-delay:'+(i*40)+'ms"><div class="w-32 h-32 mb-2 relative rounded-xl overflow-hidden glass-edge"><img src="'+t.cover+'" class="w-full h-full object-cover" onerror="this.src=\''+FI+'\'" /><div class="absolute bottom-1.5 right-1.5 btn-chrome rounded-full p-2 shadow-lg shadow-black/40"><i data-lucide="play" class="w-3.5 h-3.5 fill-current ml-0.5"></i></div></div><h3 class="font-semibold text-xs truncate">'+es(t.title)+'</h3><p class="text-[#6b7280] text-[10px] truncate mt-0.5">'+es(t.artist)+'</p></div>';
            }).join('');
            return '<div><h2 class="text-base font-bold mb-3">'+row.label+'</h2><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-1">'+cardsHtml+'</div></div>';
        }).join('');
        lucide.createIcons();
    },
    events(){
        var sf=gid('search-form'),si=gid('search-input');if(!sf||!si)return;
        sf.addEventListener('submit',async function(e){e.preventDefault();S.sq=si.value.trim();gid('suggestions').classList.add('hidden');if(!S.sq){S.ar=[];S.sr=[];Search.show();return;}var url=location.origin+'/?search='+encodeURIComponent(S.sq);history.pushState({},'',url);Search.show(true);try{var r=await fetch(API.search+'?query='+encodeURIComponent(S.sq));var d=await r.json();S.ar=d.status&&d.result.songs?d.result.songs.map(function(s){return{id:s.videoId,videoId:s.videoId,title:cn(s.title),artist:cn(s.artist),artistId:s.artistId||'',cover:s.thumbnail||FI,ytUrl:s.url};}):[];gid('filter-tabs').classList.remove('hidden');Search.apply();}catch(e){S.ar=[];Search.show();}});
        si.addEventListener('input',function(){var q=this.value.trim();if(!q){gid('suggestions').classList.add('hidden');return;}fetch(API.suggest+'?q='+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(s){if(Array.isArray(s)&&s.length>0){gid('suggestions').innerHTML=s.map(function(sg){return'<div onclick="selectSuggestion(\''+es(sg).replace(/'/g,"\\'")+'\')" class="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm">'+es(sg)+'</div>';}).join('');gid('suggestions').classList.remove('hidden');}else{gid('suggestions').classList.add('hidden');}});});
        document.addEventListener('click',function(e){if(!e.target.closest('#search-form')&&!e.target.closest('#suggestions'))gid('suggestions').classList.add('hidden');});
    },
    show(loading){
        var c=gid('search-results'),rc=gid('search-recs');if(!c)return;
        if(!S.sq){c.innerHTML='';if(rc)rc.style.display='';return;}
        if(rc)rc.style.display='none';
        if(loading){c.innerHTML='<div class="text-center mt-10"><div class="w-8 h-8 border-3 border-[#cfd3d8] border-t-transparent rounded-full animate-spin mx-auto"></div></div>';return;}
        if(S.sr.length===0){c.innerHTML='<p class="text-center text-[#6b7280] mt-10">Tidak ada hasil</p>';return;}
        c.innerHTML=S.sr.map(function(t,i){return'<div onclick="PK(\'search\','+i+')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer active:scale-[0.98] animate-stagger" style="animation-delay:'+(i*30)+'ms"><img src="'+t.cover+'" class="w-12 h-12 rounded-lg object-cover" onerror="this.src=\''+FI+'\'" /><div class="truncate"><h3 class="font-medium truncate '+(S.ct&&S.ct.id===t.id?'text-[#cfd3d8]':'text-white')+'">'+es(t.title)+'</h3><p class="text-[#6b7280] text-sm truncate">'+es(t.artist)+'</p></div></div>';}).join('');
    },
    apply(){if(S.filter==='all')S.sr=S.ar;else S.sr=S.ar;Search.show();}
};
function selectSuggestion(t){gid('suggestions').classList.add('hidden');gid('search-input').value=t;gid('search-form').dispatchEvent(new Event('submit'));}
function setFilter(f){S.filter=f;document.querySelectorAll('.filter-tab').forEach(function(el){el.classList.remove('active','bg-white','text-black');el.classList.add('glass','text-white');});var a=gid('f-'+f);if(a){a.classList.add('active','bg-white','text-black');a.classList.remove('glass','text-white');}Search.apply();}

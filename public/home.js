const Home={
    render(){
        var themeIcon = localStorage.getItem('theme') === 'light' ? 'moon' : 'sun';
        gid('view-home').innerHTML=`
        <div class="glass-pane border-b border-white/5 pt-12 pb-6 px-4 sticky top-0 z-10">
            <div class="flex justify-between items-center"><div><h1 class="text-3xl font-black chrome-text">Musicall</h1><p class="text-[#b3b3b3] text-xs mt-1">Rekomendasi buat kamu</p></div><div class="flex items-center gap-2"><button onclick="toggleTheme()" id="theme-toggle-btn" class="glass glass-hover rounded-full p-2.5 text-[#b3b3b3] hover:text-white active:scale-90" title="Ubah Tema"><i data-lucide="${themeIcon}" class="w-4 h-4"></i></button><button onclick="openServerSettings()" class="glass glass-hover rounded-full p-2.5 text-[#b3b3b3] hover:text-white active:scale-90" title="Pengaturan Server"><i data-lucide="settings" class="w-4 h-4"></i></button><button onclick="Home.refresh()" class="glass glass-hover rounded-full p-2.5 text-[#b3b3b3] hover:text-white active:scale-90"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button></div></div>
        </div>
        <div class="px-4 space-y-6 mt-4"><div id="home-grid" class="grid grid-cols-2 gap-3"></div><div><h2 class="text-lg font-bold mb-3">Playlist</h2><div id="home-scroll" class="flex gap-4 overflow-x-auto hide-scrollbar pb-4"></div></div></div>`;
        lucide.createIcons();
        if(S.ht && S.ht.length > 0){Home.show();}else{Home.showSkeleton();}
    },
    showSkeleton(){
        var g=gid('home-grid'),s=gid('home-scroll');if(!g||!s)return;
        g.innerHTML=Array(6).fill(0).map(function(_,i){
            return '<div class="glass rounded-xl flex items-center gap-3 p-2 animate-pulse"><div class="w-14 h-14 rounded-lg bg-white/5"></div><div class="flex-grow space-y-2"><div class="h-3.5 bg-white/10 rounded w-3/4"></div><div class="h-2.5 bg-white/5 rounded w-1/2"></div></div></div>';
        }).join('');
        s.innerHTML=Array(4).fill(0).map(function(_,i){
            return '<div class="flex-shrink-0 w-40 animate-pulse"><div class="w-40 h-40 mb-2 rounded-xl bg-white/5"></div><div class="h-3.5 bg-white/10 rounded w-3/4 mb-1"></div><div class="h-2.5 bg-white/5 rounded w-1/2"></div></div>';
        }).join('');
    },
    async fetch(){
        Home.showSkeleton();
        // Query berputar: jangan pakai tahun mati (dulu "lagu viral indonesia 2024")
        var qs=['lagu viral indonesia','top hits indonesia','lagu populer indonesia','hits terbaru indonesia','lagu galau indonesia'];
        var q=qs[Math.floor(Math.random()*qs.length)];
        try{
            var r=await fetch(API.search+'?query='+encodeURIComponent(q)+'&filter=songs&limit=24');
            var d=await r.json();
            var items=(d&&d.status&&d.result&&d.result.items)?d.result.items:[];
            if(items.length===0)throw new Error('kosong');
            S.ht=items.map(function(s){return{id:s.videoId,videoId:s.videoId,type:s.type,title:cn(s.title),artist:cn(s.artist||s.subtitle),artistId:s.artistId||'',cover:s.thumbnail||FI,duration:s.duration||'',ytUrl:s.url};}).filter(function(t){return !!t.videoId;});
            Home.show();
        }catch(e){
            // Tampilkan status gagal + tombol coba lagi (dulu skeleton berputar selamanya)
            var g=gid('home-grid'),s2=gid('home-scroll');
            if(g)g.innerHTML='<div class="col-span-2 text-center py-10 text-[#6b7280]"><i data-lucide="wifi-off" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p class="text-sm mb-3">Gagal memuat rekomendasi</p><button onclick="Home.refresh()" class="btn-chrome px-5 py-2 rounded-full text-xs font-bold">Coba lagi</button></div>';
            if(s2)s2.innerHTML='';
            lucide.createIcons();
        }
    },
    show(){
        var g=gid('home-grid'),s=gid('home-scroll');if(!g||!s)return;
        g.innerHTML=S.ht.slice(0,6).map(function(t,i){return'<div onclick="PK(\'home1\','+i+')" class="glass glass-hover rounded-xl flex items-center gap-3 p-2 cursor-pointer active:scale-95 animate-stagger" style="animation-delay:'+(i*50)+'ms"><img src="'+t.cover+'" class="w-14 h-14 rounded-lg object-cover shadow-lg" onerror="this.src=\''+FI+'\'" /><span class="font-bold text-sm line-clamp-2">'+es(t.title)+'</span></div>';}).join('');
        
        var pls=getUserPlaylists();
        var plHtml='';
        
        // Tampilkan playlist yang dibuat pengguna
        pls.forEach(function(p, i){
            plHtml+='<div onclick="App.switch(\'library\');Library.open(\''+p.id+'\')" class="flex-shrink-0 w-40 cursor-pointer active:scale-95 animate-stagger" style="animation-delay:'+(i*50)+'ms"><div class="w-40 h-40 mb-2 relative rounded-xl overflow-hidden glass-edge"><img src="'+(p.image||FI)+'" class="w-full h-full object-cover" onerror="this.src=\''+FI+'\'" /><div class="absolute bottom-2 right-2 btn-chrome rounded-full p-3 opacity-0 hover:opacity-100 transition-all shadow-lg shadow-black/40"><i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i></div></div><h3 class="font-semibold text-sm truncate">'+es(p.name)+'</h3><p class="text-[#6b7280] text-xs truncate mt-1">'+p.songs.length+' lagu</p></div>';
        });

        // Tampilkan tombol Buat Playlist Baru sebagai card
        plHtml+='<div onclick="App.switch(\'library\');Library.createNew()" class="flex-shrink-0 w-40 cursor-pointer active:scale-95 flex flex-col"><div class="w-40 h-40 mb-2 relative rounded-xl overflow-hidden glass flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-white/40"><i data-lucide="plus" class="w-8 h-8 text-[#6b7280]"></i><span class="text-xs text-[#6b7280] mt-2">Buat Playlist</span></div><h3 class="font-semibold text-sm truncate text-[#6b7280]">Buat Baru</h3></div>';

        // Tampilkan rekomendasi tambahan sebagai mix/album playlist
        S.ht.slice(6,12).forEach(function(t,i){
            plHtml+='<div onclick="PK(\'home2\','+i+')" class="flex-shrink-0 w-40 cursor-pointer active:scale-95 animate-stagger" style="animation-delay:'+((i+pls.length+1)*50)+'ms"><div class="w-40 h-40 mb-2 relative rounded-xl overflow-hidden glass-edge"><img src="'+t.cover+'" class="w-full h-full object-cover" onerror="this.src=\''+FI+'\'" /><div class="absolute bottom-2 right-2 btn-chrome rounded-full p-3 opacity-0 hover:opacity-100 transition-all shadow-lg shadow-black/40"><i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i></div></div><h3 class="font-semibold text-sm truncate">'+es(t.title)+'</h3><p class="text-[#6b7280] text-xs truncate mt-1">'+es(t.artist)+'</p></div>';
        });

        s.innerHTML=plHtml;
        lucide.createIcons();
    },
    refresh(){Home.fetch();gid('main-area').scrollTop=0;}
};

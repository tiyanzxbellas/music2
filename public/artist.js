const Artist={
    init(){
        gid('artist-container').innerHTML=`
        <div id="artist-modal" class="fixed inset-0 bg-[#050507] flex flex-col z-[150]" style="display:none;">
            <div class="flex items-center gap-3 p-4 pt-6">
                <button onclick="Artist.close()" class="glass glass-hover rounded-full text-white p-3 active:scale-90"><i data-lucide="x" class="w-6 h-6"></i></button>
                <h1 id="artist-name" class="text-xl font-bold truncate">Artist</h1>
            </div>
            <div class="flex-1 overflow-y-auto hide-scrollbar pb-28" id="artist-content">
                <p class="text-center text-[#6b7280] mt-10">Memuat...</p>
            </div>
        </div>`;
        lucide.createIcons();
    },
    open(id,name){
        gid('artist-modal').style.display='flex';
        gid('artist-name').innerText=name||'Artist';
        gid('artist-content').innerHTML=`
        <div class="flex justify-center mt-10">
            <div class="w-10 h-10 border-3 border-[#cfd3d8] border-t-transparent rounded-full animate-spin"></div>
        </div>`;
        MP.hide();
        fetch(API.artist+'?id='+id).then(function(r){return r.json();}).then(function(d){
            if(d.status&&d.result){
                var a=d.result;
                var headerImg=a.thumbnails&&a.thumbnails[2]?a.thumbnails[2].url:FI;
                var html='';
                
                // HEADER
                html+=`
                <div class="relative mb-6 pt-8">
                    <div class="absolute top-0 left-0 right-0 h-48 overflow-hidden rounded-b-3xl">
                        <img src="${headerImg}" class="w-full h-full object-cover blur-3xl opacity-35 scale-150" />
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#050507]"></div>
                    </div>
                    <div class="relative z-10 flex flex-col items-center">
                        <img src="${headerImg}" class="artist-photo shadow-2xl" onerror="this.src='${FI}'" />
                        <h2 class="text-2xl font-bold mt-4">${es(a.name)}</h2>
                    </div>
                </div>`;
                
                // TOP SONGS
                if(a.topSongs&&a.topSongs.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Lagu Teratas</h3><div class="space-y-1 px-2">';
                    a.topSongs.slice(0,10).forEach(function(s,i){
                        var im=s.thumbnails&&s.thumbnails[0]?s.thumbnails[0].url:FI;
                        html+=`
                        <div onclick="Artist.play('${s.videoId}','${es(s.title).replace(/'/g,"\\'")}','${es(s.artist||a.name).replace(/'/g,"\\'")}')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer active:scale-[0.98] transition-all group">
                            <span class="text-[#6b7280] w-6 text-center text-sm font-medium">${i+1}</span>
                            <img src="${im}" class="w-12 h-12 rounded-lg object-cover shadow-md" onerror="this.src='${FI}'" />
                            <div class="flex-1 truncate">
                                <p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">${es(s.title)}</p>
                                <p class="text-[#6b7280] text-xs truncate">${es(s.artist||a.name)}</p>
                            </div>
                            <i data-lucide="play" class="w-5 h-5 text-[#6b7280] opacity-0 group-hover:opacity-100 group-hover:text-[#cfd3d8] transition-all"></i>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                // TOP ALBUMS
                if(a.topAlbums&&a.topAlbums.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Album</h3><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">';
                    a.topAlbums.forEach(function(al){
                        var im=al.thumbnails&&al.thumbnails[1]?al.thumbnails[1].url:FI;
                        html+=`
                        <div onclick="Artist.open('${al.browseId}','${es(al.name).replace(/'/g,"\\'")}')" class="flex-shrink-0 w-36 cursor-pointer group">
                            <div class="w-36 h-36 rounded-xl overflow-hidden shadow-lg mb-2">
                                <img src="${im}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='${FI}'" />
                            </div>
                            <p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">${es(al.name)}</p>
                            <p class="text-[#6b7280] text-xs">Album • ${es(al.artist||a.name)}</p>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                // TOP SINGLES
                if(a.topSingles&&a.topSingles.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Singles & EP</h3><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">';
                    a.topSingles.forEach(function(sg){
                        var im=sg.thumbnails&&sg.thumbnails[1]?sg.thumbnails[1].url:FI;
                        html+=`
                        <div class="flex-shrink-0 w-36 cursor-pointer group">
                            <div class="w-36 h-36 rounded-xl overflow-hidden shadow-lg mb-2">
                                <img src="${im}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='${FI}'" />
                            </div>
                            <p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">${es(sg.name)}</p>
                            <p class="text-[#6b7280] text-xs">Single</p>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                // TOP VIDEOS
                if(a.topVideos&&a.topVideos.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Video</h3><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">';
                    a.topVideos.forEach(function(vd){
                        var im=vd.thumbnails&&vd.thumbnails[1]?vd.thumbnails[1].url:FI;
                        html+=`
                        <div onclick="Artist.play('${vd.videoId||''}','${es(vd.name).replace(/'/g,"\\'")}','${es(vd.artist||a.name).replace(/'/g,"\\'")}')" class="flex-shrink-0 w-44 cursor-pointer group">
                            <div class="w-44 h-24 rounded-xl overflow-hidden shadow-lg mb-2 relative">
                                <img src="${im}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='${FI}'" />
                                <div class="absolute bottom-2 right-2 bg-black/70 rounded-full p-1.5"><i data-lucide="play" class="w-4 h-4 fill-current text-white"></i></div>
                            </div>
                            <p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">${es(vd.name)}</p>
                            <p class="text-[#6b7280] text-xs">${es(vd.artist||a.name)}</p>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                // FEATURED ON
                if(a.featuredOn&&a.featuredOn.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Tampil Di</h3><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">';
                    a.featuredOn.forEach(function(fo){
                        var im=fo.thumbnails&&fo.thumbnails[1]?fo.thumbnails[1].url:FI;
                        html+=`
                        <div onclick="Artist.open('${fo.browseId}','${es(fo.name).replace(/'/g,"\\'")}')" class="flex-shrink-0 w-36 cursor-pointer group">
                            <div class="w-36 h-36 rounded-xl overflow-hidden shadow-lg mb-2">
                                <img src="${im}" class="w-full h-full object-cover" onerror="this.src='${FI}'" />
                            </div>
                            <p class="font-medium text-sm truncate">${es(fo.name)}</p>
                            <p class="text-[#6b7280] text-xs">${es(fo.artist||'')}</p>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                // SIMILAR ARTISTS
                if(a.similarArtists&&a.similarArtists.length>0){
                    html+='<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Artis Serupa</h3><div class="flex gap-4 overflow-x-auto hide-scrollbar pb-2 px-4">';
                    a.similarArtists.forEach(function(s){
                        var im=s.thumbnails&&s.thumbnails[1]?s.thumbnails[1].url:FI;
                        html+=`
                        <div onclick="Artist.open('${s.browseId}','${es(s.name).replace(/'/g,"\\'")}')" class="flex-shrink-0 text-center cursor-pointer group">
                            <div class="w-24 h-24 rounded-full overflow-hidden shadow-lg ring-2 ring-transparent group-hover:ring-[#cfd3d8]/50 transition-all">
                                <img src="${im}" class="w-full h-full object-cover" onerror="this.src='${FI}'" />
                            </div>
                            <p class="text-xs mt-2 truncate w-24 group-hover:text-[#cfd3d8] transition-colors">${es(s.name)}</p>
                        </div>`;
                    });
                    html+='</div></div>';
                }
                
                gid('artist-content').innerHTML=html;
                lucide.createIcons();
            }
        });
    },
    close(){
        gid('artist-modal').style.display='none';
        MP.show();
    },
    play(vid,title,artist){
        S.ct={id:vid,videoId:vid,title:title,artist:artist,cover:FI,artistId:'',ytUrl:'https://youtube.com/watch?v='+vid};
        S.ps='artist';S.pl=[S.ct];S.pi=0;UU();MP.show();S.il=true;UB();
        if(S.yp&&S.yr&&vid)S.yp.loadVideoById({videoId:vid});
    }
};
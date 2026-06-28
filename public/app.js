const App={
    init(){
        // Initialize Theme
        var activeTheme = localStorage.getItem('theme') || 'dark';
        if(activeTheme === 'light') {
            document.documentElement.classList.add('theme-light');
        } else {
            document.documentElement.classList.remove('theme-light');
        }
        window.toggleTheme = function() {
            var isLight = document.documentElement.classList.toggle('theme-light');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            var themeBtn = document.getElementById('theme-toggle-btn');
            if(themeBtn) {
                themeBtn.innerHTML = isLight ? '<i data-lucide="moon" class="w-4 h-4"></i>' : '<i data-lucide="sun" class="w-4 h-4"></i>';
                lucide.createIcons();
            }
        };

        gid('nav-container').innerHTML=`
        <div class="nav-blur pb-safe h-[65px] flex items-center justify-around fixed bottom-0 w-full z-40">
            <button onclick="App.switch('home')" id="nav-home" class="flex flex-col items-center text-[#cfd3d8] active:scale-90"><i data-lucide="home" class="w-5 h-5 fill-current"></i><span class="text-[10px]">Home</span></button>
            <button onclick="App.switch('search')" id="nav-search" class="flex flex-col items-center text-[#6b7280] active:scale-90"><i data-lucide="search" class="w-5 h-5"></i><span class="text-[10px]">Search</span></button>
            <button onclick="App.switch('library')" id="nav-library" class="flex flex-col items-center text-[#6b7280] active:scale-90"><i data-lucide="library" class="w-5 h-5"></i><span class="text-[10px]">Library</span></button>
            <button onclick="App.switch('dev')" id="nav-dev" class="flex flex-col items-center text-[#6b7280] active:scale-90"><i data-lucide="info" class="w-5 h-5"></i><span class="text-[10px]">Info</span></button>
        </div>`;
        
        gid('view-dev').innerHTML=`
        <div class="pt-12 px-4 text-center">
            <div class="relative w-24 h-24 rounded-full mx-auto mb-6 glass-strong shine-sweep flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50">
                <i data-lucide="music" class="w-12 h-12 text-white/60 absolute"></i>
                <img src="/dev.png" class="absolute inset-0 w-full h-full object-cover" onerror="this.style.display='none'" />
            </div>
            <h1 class="text-3xl font-black chrome-text mb-1">Musicall</h1>
            <p class="text-[#b3b3b3] text-sm mb-6">Streaming Musik YouTube dengan Lirik</p>
            
            <div class="glass rounded-2xl p-5 max-w-sm mx-auto space-y-3 text-left mb-6">
                <h3 class="text-[#cfd3d8] font-bold text-sm uppercase tracking-wider mb-2">📱 Aplikasi</h3>
                <div class="flex justify-between"><span class="text-[#6b7280] text-sm">Nama</span><span class="text-white font-medium text-sm">Musicall</span></div>
                <div class="flex justify-between"><span class="text-[#6b7280] text-sm">Versi</span><span class="text-white font-medium text-sm">v3.0.0</span></div>
                <div class="flex justify-between"><span class="text-[#6b7280] text-sm">Framework</span><span class="text-white font-medium text-sm">HTML + Tailwind + JS</span></div>
                <div class="flex justify-between"><span class="text-[#6b7280] text-sm">Hosting</span><span class="text-white font-medium text-sm">Vercel</span></div>
            </div>

            <div class="glass rounded-2xl p-5 max-w-sm mx-auto space-y-3 text-left mb-6">
                <h3 class="text-[#cfd3d8] font-bold text-sm uppercase tracking-wider mb-2">👥 Kontributor</h3>
                <div class="flex justify-between items-center">
                    <span class="text-[#6b7280] text-sm">Developed by</span>
                    <div class="flex items-center gap-2">
                        <img src="/dev.png" class="w-6 h-6 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=nanzz'" />
                        <span class="text-white font-medium text-sm">Tiyanz</span>
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[#6b7280] text-sm">Customs & add New Features by</span>
                    <div class="flex items-center gap-2">
                        <img src="jansen_avatar.jpg" class="w-6 h-6 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Jansen'" />
                        <span class="text-white font-medium text-sm">Jansen</span>
                    </div>
                </div>
            </div>
            
            <a href="https://whatsapp.com/channel/0029VbCs8HM9xVJd31fSu60X" target="_blank" class="block w-full max-w-sm mx-auto btn-chrome font-bold py-4 rounded-full active:scale-95 transition-all text-center">
                💬 Gabung Channel WhatsApp
            </a>
        </div>`;
        
        MP.init();FullPlayer.init();Artist.init();Home.render();Search.render();
        lucide.createIcons();
        setTimeout(function(){ App.checkUrl(); }, 1000);
    },
    checkUrl(){
        var p=new URLSearchParams(location.search);
        var play=p.get('play'),search=p.get('search'),isShared=p.get('share')==='1';
        if(play){if(isShared){App.showSharePopup(play);}else{App.autoPlayTrack(play);}}
        else if(search){setTimeout(function(){var si=gid('search-input');if(si){si.value=decodeURIComponent(search);gid('search-form').dispatchEvent(new Event('submit'));}App.switch('search');},300);}
    },
    autoPlayTrack(videoId){
        fetch(API.search+'?query=https://youtube.com/watch?v='+videoId).then(function(r){return r.json();}).then(function(d){
            var title='Lagu',artist='NanzMusify',cover=FI,artistId='';
            if(d.status&&d.result.songs&&d.result.songs.length>0){var song=d.result.songs[0];title=cn(song.title);artist=cn(song.artist);cover=song.thumbnail||FI;artistId=song.artistId||'';}
            S.ct={id:videoId,videoId:videoId,title:title,artist:artist,cover:cover,artistId:artistId,ytUrl:'https://youtube.com/watch?v='+videoId};
            S.ps='direct';S.pl=[S.ct];S.pi=0;UU();MP.show();resetLyricsUI(videoId);
            setTimeout(function(){FullPlayer.open();loadTrack(S.ct);},400);
        }).catch(function(){
            S.ct={id:videoId,videoId:videoId,title:'Lagu',artist:'NanzMusify',cover:FI,artistId:'',ytUrl:'https://youtube.com/watch?v='+videoId};
            S.ps='direct';S.pl=[S.ct];S.pi=0;UU();MP.show();resetLyricsUI(videoId);
            setTimeout(function(){FullPlayer.open();loadTrack(S.ct);},400);
        });
    },
    showSharePopup(videoId){
        fetch(API.search+'?query=https://youtube.com/watch?v='+videoId).then(function(r){return r.json();}).then(function(d){
            var title='Lagu',artist='NanzMusify',cover=FI;
            if(d.status&&d.result.songs&&d.result.songs.length>0){var song=d.result.songs[0];title=cn(song.title);artist=cn(song.artist);cover=song.thumbnail||FI;}
            App.renderPopup(videoId,title,artist,cover);
        }).catch(function(){App.renderPopup(videoId,'Lagu','NanzMusify',FI);});
    },
    renderPopup(videoId,title,artist,cover){
        var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
        popup.onclick=function(e){if(e.target===popup)popup.remove();};
        popup.innerHTML='<div class="glass-strong w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.4s ease-out forwards;"><div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div><div class="flex items-center gap-4 mb-4"><img src="'+cover+'" class="w-16 h-16 rounded-xl object-cover shadow-lg" onerror="this.src=\''+FI+'\'" /><div class="flex-1 truncate"><h3 class="font-bold text-white truncate">'+title+'</h3><p class="text-[#b3b3b3] text-sm truncate">'+artist+'</p></div></div><p class="text-[#6b7280] text-xs mb-4 text-center">Seseorang membagikan lagu ini kepadamu</p><div class="flex gap-3"><button id="popup-play" class="flex-1 btn-chrome font-bold py-3 rounded-full active:scale-95">🎵 Putar Sekarang</button><button id="popup-later" class="px-6 py-3 glass glass-hover text-white rounded-full active:scale-95">Nanti</button></div></div>';
        document.body.appendChild(popup);
        popup.querySelector('#popup-play').onclick=function(){popup.remove();S.ct={id:videoId,videoId:videoId,title:title,artist:artist,cover:cover,artistId:'',ytUrl:'https://youtube.com/watch?v='+videoId};S.ps='direct';S.pl=[S.ct];S.pi=0;UU();MP.show();resetLyricsUI(videoId);setTimeout(function(){FullPlayer.open();loadTrack(S.ct);},400);};
        popup.querySelector('#popup-later').onclick=function(){popup.remove();};
    },
    switch(t){
        S.at=t;['home','search','library','dev'].forEach(function(id){gid('view-'+id).style.display='none';});
        if(t==='library'){Library.render();}
        if(t==='home'){Home.render();}
        if(t==='search'){Search.onShow();}
        gid('view-'+t).style.display='block';
        ['home','search','library','dev'].forEach(function(n){var b=gid('nav-'+n);if(!b)return;b.classList.remove('text-[#cfd3d8]');b.classList.add('text-[#6b7280]');var i=b.querySelector('i, svg');if(i)i.classList.remove('fill-current');});
        var ab=gid('nav-'+t);if(!ab)return;ab.classList.remove('text-[#6b7280]');ab.classList.add('text-[#cfd3d8]');if(t==='home'){var icon=ab.querySelector('i, svg');if(icon)icon.classList.add('fill-current');}
        gid('main-area').scrollTop=0;lucide.createIcons();
    },
    showV3Popup() {
        if(localStorage.getItem('seen_v3_popup_update')) return;
        var popup = document.createElement('div');
        popup.id = 'v3-popup';
        popup.className = 'fixed inset-0 z-[400] flex items-center justify-center bg-black/80 px-4';
        popup.style.backdropFilter = 'blur(8px)';
        popup.innerHTML = `
            <div class="glass-strong w-full max-w-sm rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden" style="animation: slideUp 0.3s ease-out forwards;">
                <!-- Header -->
                <div class="relative w-16 h-16 rounded-full mx-auto mb-4 bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <i data-lucide="sparkles" class="w-8 h-8 text-white"></i>
                </div>
                
                <h2 class="text-2xl font-black chrome-text mb-1">New Version v3 🚀</h2>
                <p class="text-[#6b7280] text-xs mb-5">Berikut adalah fitur dan pembaruan terbaru:</p>
                
                <!-- Features list -->
                <div class="space-y-4 text-left mb-6 max-h-[250px] overflow-y-auto pr-1">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="sliders" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Equalizer Suara (Web Audio)</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Sesuaikan Bass, Mid, Treble, dan gunakan berbagai Preset Keren untuk kualitas audio musik terbaik.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="share-2" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Share Lagu via Link Audio Langsung</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Bagikan lagu favorit Anda menggunakan link audio langsung untuk kemudahan berbagi musik.</p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="timer" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Timer Sleep (Pengantar Tidur)</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Atur waktu putar musik otomatis sebelum tidur dengan durasi yang dapat ditentukan sendiri.</p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="shield-check" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Fitur Pintar: "Hentikan di Akhir Lagu"</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Dilengkapi opsi agar lagu aktif Anda tetap berputar sampai selesai sebelum pemutaran otomatis berhenti tanpa memotong lagu di tengah-tengah.</p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="gauge" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Kontrol Kecepatan Putar</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Memungkinkan Anda mempercepat atau memperlambat musik sesuai kebutuhan (mendukung kecepatan 0.5x, 0.75x, 1.0x (Normal), 1.25x, 1.5x, 1.75x, hingga 2.0x).</p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="zap" class="w-4 h-4 text-rose-400"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-bold text-sm">Mode "Slowed + Reverb" & "Nightcore"</h4>
                            <p class="text-[#b3b3b3] text-xs leading-relaxed">Kustomisasi getaran audio dengan mengubah kecepatan musik secara instan ke gaya favorit Anda.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Button -->
                <button id="close-v3-popup" class="w-full btn-chrome font-bold py-3.5 rounded-full active:scale-95 transition-all">
                    Keren, Mulai Dengar! 🎵
                </button>
            </div>
        `;
        document.body.appendChild(popup);
        lucide.createIcons();
        popup.querySelector('#close-v3-popup').onclick = function() {
            localStorage.setItem('seen_v3_popup_update', 'true');
            popup.remove();
        };
    }
};
App.init();Home.fetch();

// SPLASH SCREEN - LOGO BULAT BESAR
(function(){
    var sp=gid('splash-screen');
    if(!sp)return;
    // Ganti logo jadi bulat besar
    var logoWrap=sp.querySelector('.logo-wrap');
    if(logoWrap){
        logoWrap.style.width='200px';
        logoWrap.style.height='200px';
        logoWrap.style.borderRadius='50%';
    }
    var logo=sp.querySelector('.logo');
    if(logo){
        logo.style.borderRadius='50%';
        logo.style.objectFit='cover';
    }
    setTimeout(function(){
        sp.classList.add('hide');
        setTimeout(function(){ 
            if(sp&&sp.parentNode) sp.parentNode.removeChild(sp); 
            // Trigger V3 Update popup here
            App.showV3Popup();
        },350);
    },2000);
})();

const Library={
    render(){
        var pls=getUserPlaylists();
        var html='<div class="pt-12 px-4"><h1 class="text-3xl font-black mb-4">Library</h1>';
        html+='<button onclick="Library.createNew()" class="w-full btn-chrome font-bold py-3 rounded-xl active:scale-95 mb-4">+ Buat Playlist Baru</button>';
        if(pls.length===0){html+='<div class="text-center text-[#6b7280] mt-10"><i data-lucide="library" class="w-16 h-16 mx-auto mb-4 opacity-30"></i><p>Belum ada playlist</p></div>';}
        else{
            html+='<div class="grid grid-cols-2 gap-3">';
            pls.forEach(function(p){
                html+='<div onclick="Library.open(\''+p.id+'\')" class="glass glass-hover rounded-xl p-3 cursor-pointer active:scale-95">'+
                    '<div class="relative w-full aspect-square mb-2 rounded-lg overflow-hidden">'+
                        '<img src="'+(p.image||FI)+'" class="w-full h-full object-cover" onerror="this.src=\''+FI+'\'" />'+
                        '<button onclick="event.stopPropagation();Library.showActions(\''+p.id+'\')" class="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 rounded-full p-1.5 active:scale-90 transition-all" title="Opsi Playlist"><i data-lucide="more-vertical" class="w-3.5 h-3.5 text-white"></i></button>'+
                        (p.songs.length>0?'<button onclick="event.stopPropagation();Library.playSong(\''+p.id+'\',0)" class="absolute bottom-1.5 right-1.5 btn-chrome rounded-full p-2.5 shadow-lg shadow-black/40 active:scale-90" title="Putar"><i data-lucide="play" class="w-4 h-4 fill-current ml-0.5"></i></button>':'')+
                    '</div>'+
                    '<h3 class="font-bold text-sm truncate">'+es(p.name)+'</h3><p class="text-[#6b7280] text-xs">'+p.songs.length+' lagu</p>'+
                '</div>';
            });
            html+='</div>';
        }
        html+='</div>';gid('view-library').innerHTML=html;lucide.createIcons();
    },
    createNew(){
        var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
        popup.innerHTML='<div class="glass-strong w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.3s ease-out forwards;"><div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div><h3 class="font-bold text-white mb-4">Buat Playlist Baru</h3><input id="pl-name" class="w-full glass-input text-white rounded-xl px-4 py-3 mb-3 focus:outline-none" placeholder="Nama Playlist" /><input id="pl-image" type="file" accept="image/*" class="w-full text-sm text-[#6b7280] mb-4" /><div class="flex gap-3"><button id="pl-create" class="flex-1 btn-chrome font-bold py-3 rounded-full">Buat</button><button onclick="this.closest(\'.fixed\').remove()" class="px-6 py-3 glass glass-hover text-white rounded-full">Batal</button></div></div>';
        document.body.appendChild(popup);
        popup.querySelector('#pl-create').onclick=function(){
            var name=gid('pl-name').value.trim()||'Playlist Baru';
            var file=gid('pl-image').files[0];
            if(file){var reader=new FileReader();reader.onload=function(e){createPlaylist(name,e.target.result);popup.remove();Library.render();};reader.readAsDataURL(file);}
            else{createPlaylist(name,'');popup.remove();Library.render();}
        };
    },
    showActions(id){
        var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===id;});if(!pl)return;
        var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
        popup.onclick=function(e){if(e.target===popup)popup.remove();};
        popup.innerHTML='<div class="w-full max-w-md rounded-t-3xl p-6 border-t border-white/10 glass-strong" style="animation:slideUp 0.3s ease-out forwards; background: var(--bg-color);">'+
            '<div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>'+
            '<div class="flex items-center gap-3 mb-5"><img src="'+(pl.image||FI)+'" class="w-12 h-12 rounded-lg object-cover" onerror="this.src=\''+FI+'\'" /><div class="truncate"><h3 class="font-bold text-white truncate">'+es(pl.name)+'</h3><p class="text-[#6b7280] text-xs">'+pl.songs.length+' lagu</p></div></div>'+
            '<button onclick="this.closest(\'.fixed\').remove();Library.editPlaylist(\''+id+'\')" class="w-full text-left p-4 rounded-xl hover:bg-white/5 flex items-center gap-3 mb-1"><i data-lucide="pencil" class="w-5 h-5 text-[#cfd3d8]"></i><span class="font-medium text-white">Edit Playlist</span></button>'+
            '<button onclick="this.closest(\'.fixed\').remove();Library.confirmDelete(\''+id+'\')" class="w-full text-left p-4 rounded-xl hover:bg-red-500/10 flex items-center gap-3"><i data-lucide="trash-2" class="w-5 h-5 text-red-400"></i><span class="font-medium text-red-400">Hapus Playlist</span></button>'+
        '</div>';
        document.body.appendChild(popup);lucide.createIcons();
    },
    editPlaylist(id){
        var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===id;});if(!pl)return;
        var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
        popup.innerHTML='<div class="glass-strong w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.3s ease-out forwards;"><div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div><h3 class="font-bold text-white mb-4">Edit Playlist</h3><input id="pl-edit-name" class="w-full glass-input text-white rounded-xl px-4 py-3 mb-3 focus:outline-none" placeholder="Nama Playlist" value="'+es(pl.name).replace(/"/g,'&quot;')+'" /><input id="pl-edit-image" type="file" accept="image/*" class="w-full text-sm text-[#6b7280] mb-4" /><div class="flex gap-3"><button id="pl-edit-save" class="flex-1 btn-chrome font-bold py-3 rounded-full">Simpan</button><button onclick="this.closest(\'.fixed\').remove()" class="px-6 py-3 glass glass-hover text-white rounded-full">Batal</button></div></div>';
        document.body.appendChild(popup);
        popup.querySelector('#pl-edit-save').onclick=function(){
            var name=gid('pl-edit-name').value.trim()||pl.name;
            var file=gid('pl-edit-image').files[0];
            if(file){var reader=new FileReader();reader.onload=function(e){updateUserPlaylist(id,name,e.target.result);popup.remove();Library.render();showToast('✅ Playlist diperbarui');};reader.readAsDataURL(file);}
            else{updateUserPlaylist(id,name,null);popup.remove();Library.render();showToast('✅ Playlist diperbarui');}
        };
    },
    confirmDelete(id){
        var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===id;});if(!pl)return;
        var popup=document.createElement('div');popup.className='fixed inset-0 z-[300] flex items-end justify-center bg-black/60';
        popup.innerHTML='<div class="glass-strong w-full max-w-md rounded-t-3xl p-6 border-t border-white/10" style="animation:slideUp 0.3s ease-out forwards;"><div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div><h3 class="font-bold text-white mb-2">Hapus "'+es(pl.name)+'"?</h3><p class="text-[#6b7280] text-sm mb-5">Playlist ini akan dihapus permanen dan tidak bisa dikembalikan.</p><div class="flex gap-3"><button onclick="deleteUserPlaylist(\''+id+'\');this.closest(\'.fixed\').remove();Library.render();App.switch(\'library\');showToast(\'🗑️ Playlist dihapus\')" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full active:scale-95">Hapus</button><button onclick="this.closest(\'.fixed\').remove()" class="px-6 py-3 glass glass-hover text-white rounded-full">Batal</button></div></div>';
        document.body.appendChild(popup);
    },
    open(id){
        var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===id;});if(!pl)return;
        var html='<div class="pt-12 px-4">'+
            '<div class="flex items-center justify-between mb-4">'+
                '<button onclick="Library.render();App.switch(\'library\')" class="text-white p-2 active:scale-90"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>'+
                '<div class="flex items-center gap-1">'+
                    '<button onclick="Library.editPlaylist(\''+id+'\')" class="text-[#a0a5b0] hover:text-white p-2 active:scale-90" title="Edit Playlist"><i data-lucide="pencil" class="w-5 h-5"></i></button>'+
                    '<button onclick="Library.confirmDelete(\''+id+'\')" class="text-[#a0a5b0] hover:text-red-400 p-2 active:scale-90" title="Hapus Playlist"><i data-lucide="trash-2" class="w-5 h-5"></i></button>'+
                '</div>'+
            '</div>'+
            '<div class="relative w-full max-w-[220px] aspect-square mx-auto mb-4 rounded-2xl overflow-hidden glass-edge shadow-2xl shadow-black/40">'+
                '<img src="'+(pl.image||FI)+'" class="w-full h-full object-cover" onerror="this.src=\''+FI+'\'" />'+
                '<div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>'+
            '</div>'+
            '<div class="text-center mb-5"><h1 class="text-xl font-bold truncate">'+es(pl.name)+'</h1><p class="text-[#6b7280] text-xs mt-1">'+pl.songs.length+' lagu</p></div>'+
            (pl.songs.length>0?'<button onclick="Library.playSong(\''+id+'\',0)" class="btn-chrome font-bold rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl shadow-black/40 active:scale-90 hover:scale-105 transition-all" style="width:64px;height:64px;" title="Putar Semua"><i data-lucide="play" class="w-7 h-7 fill-current ml-0.5"></i></button>':'');
        if(pl.songs.length===0){html+='<div class="text-center text-[#6b7280] mt-10"><p>Belum ada lagu</p></div>';}
        else{html+='<div class="space-y-1">';pl.songs.forEach(function(s,i){html+='<div onclick="Library.playSong(\''+id+'\','+i+')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer active:scale-[0.98]"><img src="'+s.cover+'" class="w-10 h-10 rounded object-cover" /><div class="truncate"><p class="font-medium text-sm truncate">'+s.title+'</p><p class="text-[#6b7280] text-xs truncate">'+s.artist+'</p></div></div>';});html+='</div>';}
        html+='</div>';gid('view-library').innerHTML=html;lucide.createIcons();
    },
    playSong(plId,index){var pls=getUserPlaylists();var pl=pls.find(function(p){return p.id===plId;});if(!pl||!pl.songs[index])return;S.pl=pl.songs;S.pi=index;S.ps='playlist';S.ct=S.pl[S.pi];UU();MP.show();S.il=true;UB();resetLyricsUI(S.ct.videoId);loadTrack(S.ct);}
};

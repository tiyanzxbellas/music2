const FullPlayer={
    init(){
        gid('full-container').innerHTML=`
        <div id="full-player" class="fixed flex flex-col z-[100]" style="display:none;background:rgba(5,5,7,0.92);backdrop-filter:blur(44px);-webkit-backdrop-filter:blur(44px);transition:transform 0.35s ease-out;transform:translateY(100%);top:0;left:0;width:100%;height:100%;overflow:hidden;touch-action:none;">
            <div class="absolute inset-0 z-0 pointer-events-none"><img id="full-bg-blur" src="" class="w-full h-full object-cover blur-[100px] opacity-35" /><div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-[#050507]"></div></div>
            <div class="relative z-10 flex justify-between items-center p-4 pt-6 flex-shrink-0">
                <button onclick="FullPlayer.close()" class="text-white/70 hover:text-white hover:bg-white/10 p-3 rounded-full active:scale-90 transition-all duration-200"><i data-lucide="chevron-down" class="w-7 h-7"></i></button>
                <div class="text-center"><p class="text-[10px] uppercase tracking-[0.2em] text-[#b3b3b3]">Now Playing</p><p id="full-header-artist" class="text-sm font-bold truncate max-w-[200px]"></p></div>
                <div class="flex gap-1">
                    <button onclick="openShareCard()" class="text-white/70 hover:text-white hover:bg-white/10 p-3 rounded-full active:scale-90 transition-all" title="Bagikan Lagu (Share Card)"><i data-lucide="share-2" class="w-5 h-5"></i></button>
                    <button onclick="toggleLyrics()" class="text-white/70 hover:text-white hover:bg-white/10 p-3 rounded-full active:scale-90 transition-all"><i data-lucide="align-left" class="w-6 h-6"></i></button>
                </div>
            </div>
            <div class="relative z-10 flex-1 flex items-center justify-center px-8" style="min-height:0;overflow:hidden;">
                <div class="relative w-full max-w-[300px] aspect-square"><img id="full-cover" src="" class="w-full h-full object-cover rounded-3xl shadow-2xl shadow-black/50 transition-transform duration-500" /></div>
            </div>
            <div class="relative z-10 px-6 pb-2 flex-shrink-0">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1 truncate"><h2 id="full-title" class="text-xl font-bold text-white truncate">Pilih lagu</h2><p id="full-artist" class="text-[#b3b3b3] text-sm truncate cursor-pointer hover:text-[#cfd3d8] mt-0.5" onclick="FullPlayer.openArtist()"></p></div>
                </div>
                <div class="mb-2"><div class="relative w-full h-1.5 bg-white/10 rounded-full flex items-center group cursor-pointer"><input type="range" id="seek-bar" min="0" max="100" value="0" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" oninput="SK(this.value)" /><div id="full-progress" class="h-full bg-gradient-to-r from-[#cfd3d8] to-[#e8eaed] rounded-l-full" style="width:0%;box-shadow:0 0 10px rgba(207,211,216,0.5);"><div class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl shadow-[#cfd3d8]/50 opacity-0 group-hover:opacity-100 transition-all"></div></div></div><div class="flex justify-between text-[10px] text-[#6b7280] mt-1"><span id="time-curr">0:00</span><span id="time-dur">0:00</span></div></div>
            </div>
            <!-- Premium Utility Bar -->
            <div class="relative z-10 px-6 flex items-center gap-5 mb-4 flex-shrink-0 border-t border-b border-white/5 py-2 overflow-x-auto hide-scrollbar">
                <button onclick="openEqualizer()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Equalizer">
                    <i data-lucide="sliders" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">EQ</span>
                </button>
                <button onclick="openSleepTimer()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90 relative" title="Timer Tidur">
                    <i data-lucide="clock" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5" id="sleep-badge">Timer</span>
                    <span id="sleep-dot" class="hidden absolute top-0.5 right-2 w-1.5 h-1.5 bg-[#1ed760] rounded-full"></span>
                </button>
                <button onclick="openPlaybackSpeed()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Kecepatan Putar">
                    <i data-lucide="gauge" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5" id="speed-badge">Normal</span>
                </button>
                <button onclick="addCurrentToPlaylist()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Tambah ke Playlist">
                    <i data-lucide="list-plus" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Playlist</span>
                </button>
                <button onclick="openQueue()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Daftar Antrian">
                    <i data-lucide="list-music" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Antrian</span>
                </button>
                <button onclick="downloadCurrentSong()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Unduh Lagu">
                    <i data-lucide="download" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Unduh</span>
                </button>
                <button onclick="toggleLyrics()" class="flex-shrink-0 flex flex-col items-center gap-1 text-[#a0a5b0] hover:text-white transition active:scale-90" title="Lirik Lagu">
                    <i data-lucide="mic-2" class="w-4.5 h-4.5"></i>
                    <span class="text-[9px] font-semibold tracking-wider uppercase opacity-80 mt-0.5">Lirik</span>
                </button>
            </div>
            <div class="relative z-10 px-8 flex items-center justify-between mb-6 flex-shrink-0">
                <button onclick="toggleAutoNext()" class="text-[#6b7280] hover:text-[#cfd3d8] active:scale-90 p-2 transition-all duration-200" title="Auto Next"><i data-lucide="list-end" class="w-5 h-5"></i></button>
                <button onclick="PV()" class="text-white/80 hover:text-white active:scale-90 p-2 transition-all"><i data-lucide="skip-back" class="w-7 h-7 fill-current"></i></button>
                <button onclick="TP()" id="full-play-btn-wrap" class="relative bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full p-4 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/30" style="width:60px;height:60px;"><div id="full-play-btn" class="absolute inset-0 flex items-center justify-center"><i data-lucide="play" class="w-7 h-7 fill-current ml-0.5"></i></div></button>
                <button onclick="NX()" class="text-white/80 hover:text-white active:scale-90 p-2 transition-all"><i data-lucide="skip-forward" class="w-7 h-7 fill-current"></i></button>
                <button onclick="TR()" id="btn-repeat" class="relative text-[#6b7280] hover:text-white active:scale-90 p-2 transition-all"><i data-lucide="repeat" class="w-5 h-5"></i><div id="repeat-dot" class="hidden absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#cfd3d8] rounded-full"></div><span id="repeat-one" class="hidden absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#cfd3d8]">1</span></button>
            </div>
        </div>`;
        gid('lyrics-container').innerHTML=`
        <div id="lyrics-overlay" class="fixed flex flex-col z-[200]" style="display:none;background:rgba(4,4,6,0.95);backdrop-filter:blur(50px);-webkit-backdrop-filter:blur(50px);transition:transform 0.35s ease-out;transform:translateY(100%);top:0;left:0;width:100%;height:100%;overflow:hidden;touch-action:none;">
            <div class="flex justify-between items-center p-4 pt-6 flex-shrink-0">
                <button onclick="toggleLyrics()" class="text-white/70 hover:text-white hover:bg-white/10 p-3 rounded-full active:scale-90"><i data-lucide="chevron-down" class="w-7 h-7"></i></button>
                <div class="text-center">
                    <h2 class="text-lg font-bold">Lirik</h2>
                    <p id="lyric-sync-badge" class="hidden text-[10px] font-bold text-[#1ed760] tracking-wide">+0</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="lyricSyncPrev()" title="Sinkron mundur 1 lirik" class="text-white/70 hover:text-white hover:bg-white/10 w-10 h-10 rounded-full active:scale-90 flex items-center justify-center transition-all"><i data-lucide="minus" class="w-5 h-5"></i></button>
                    <button onclick="lyricSyncNext()" title="Sinkron lanjut 1 lirik" class="text-white/70 hover:text-white hover:bg-white/10 w-10 h-10 rounded-full active:scale-90 flex items-center justify-center transition-all"><i data-lucide="plus" class="w-5 h-5"></i></button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto px-6 py-6 hide-scrollbar"><div id="lyrics-loading" class="flex justify-center items-center h-full"><div class="w-8 h-8 border-3 border-[#cfd3d8] border-t-transparent rounded-full animate-spin"></div></div><div id="lyrics-content" class="hidden pb-32"></div><div id="lyrics-empty" class="hidden flex justify-center items-center h-full text-[#6b7280]"><div><i data-lucide="music" class="w-16 h-16 mx-auto mb-4 opacity-30"></i><p>Lirik tidak tersedia</p></div></div></div>
        </div>`;
        lucide.createIcons();
    },
    open(){var fp=gid('full-player');fp.style.display='flex';document.body.style.overflow='hidden';document.body.style.position='fixed';document.body.style.width='100%';requestAnimationFrame(function(){fp.style.transform='translateY(0)';});MP.hide();try{updateSleepBadge();updateSpeedBadge();}catch(e){}},
    close(){var fp=gid('full-player');fp.style.transform='translateY(100%)';document.body.style.overflow='';document.body.style.position='';document.body.style.width='';setTimeout(function(){fp.style.display='none';MP.show();},350);},
    openArtist(){if(S.ct&&S.ct.artistId){FullPlayer.close();setTimeout(function(){Artist.open(S.ct.artistId,S.ct.artist);},400);}}
};
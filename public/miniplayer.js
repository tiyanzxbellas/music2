const MP={
    init(){
        gid('mini-container').innerHTML=`
        <div id="mini-player" class="hidden fixed left-3 right-3 z-50" style="bottom:80px;transition:transform 0.35s ease-out;transform:translateY(40px);">
            <div class="rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition relative overflow-hidden" style="background:rgba(10,10,13,0.6);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 10px 40px rgba(0,0,0,0.7);">
                <div class="absolute top-0 left-0 h-[3px] bg-white/10 w-full"><div id="mini-progress" class="h-full bg-gradient-to-r from-[#cfd3d8] to-[#e8eaed]" style="width:0%"></div></div>
                <img id="mini-cover" src="" class="w-11 h-11 rounded-xl shadow-lg object-cover flex-shrink-0 mt-1" onclick="event.stopPropagation();FullPlayer.open();" />
                <div class="flex-1 truncate mt-1" onclick="FullPlayer.open()">
                    <div id="mini-title" class="font-bold text-sm truncate">Pilih lagu</div>
                    <div id="mini-artist" class="text-[#b3b3b3] text-xs truncate"></div>
                </div>
                <button onclick="event.stopPropagation();toggleLyrics()" class="text-[#b3b3b3] hover:text-white active:scale-90 p-2"><i data-lucide="mic-2" class="w-4 h-4"></i></button>
                <button onclick="event.stopPropagation();TP()" class="text-white active:scale-90 hover:scale-110 p-2"><div id="mini-play-btn"><i data-lucide="play" class="w-6 h-6 fill-current"></i></div></button>
                <button onclick="event.stopPropagation();MP.dismiss()" class="text-[#6b7280] hover:text-red-400 active:scale-90 p-2 ml-1"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        </div>
        <div id="mini-sidebar" class="hidden fixed right-0 z-50" style="bottom:80px;transition:all 0.3s ease-out;">
            <button onclick="MP.restore()" class="btn-chrome rounded-l-full p-3 shadow-lg shadow-black/50 active:scale-95 transition-all">
                <i data-lucide="music" class="w-5 h-5"></i>
            </button>
        </div>`;
        lucide.createIcons();
    },
    show(){
        var mp=gid('mini-player');
        mp.classList.remove('hidden');
        gid('mini-sidebar').classList.add('hidden');
        requestAnimationFrame(function(){mp.style.transform='translateY(0)';});
    },
    hide(){
        var mp=gid('mini-player');
        mp.style.transform='translateY(40px)';
        setTimeout(function(){mp.classList.add('hidden');},350);
    },
    dismiss(){
        // Sembunyiin mini player, tampilin sidebar kecil
        var mp=gid('mini-player');
        mp.style.transform='translateY(40px)';
        setTimeout(function(){
            mp.classList.add('hidden');
            gid('mini-sidebar').classList.remove('hidden');
        },350);
        // Musik tetep jalan
    },
    restore(){
        // Kembaliin mini player dari sidebar
        gid('mini-sidebar').classList.add('hidden');
        var mp=gid('mini-player');
        mp.classList.remove('hidden');
        requestAnimationFrame(function(){mp.style.transform='translateY(0)';});
    }
};
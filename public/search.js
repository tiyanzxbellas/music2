// Cari: lagu / video / album / artis dengan filter tab yang benar-benar menyaring.
const Search = {
    render() {
        gid('view-search').innerHTML = `
        <div class="pt-12 px-4"><h1 class="text-3xl font-black mb-4">Cari</h1>
        <form id="search-form" class="relative" autocomplete="off">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center text-[#6b7280]"><i data-lucide="search" class="h-5 w-5"></i></div>
            <input type="text" id="search-input" class="w-full glass-input text-white font-medium rounded-xl pl-12 pr-16 py-3.5 focus:outline-none placeholder:text-[#6b7280]" placeholder="Cari lagu, artis, atau album..." autocomplete="off" />
            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 btn-chrome font-bold px-4 py-1.5 rounded-lg active:scale-90">Cari</button>
        </form>
        <div id="suggestions" class="hidden mt-2 glass-strong rounded-xl shadow-2xl max-h-72 overflow-y-auto hide-scrollbar"></div></div>
        <div id="filter-tabs" class="hidden flex gap-2 px-4 pb-3 mt-3 overflow-x-auto hide-scrollbar">
            <button onclick="setFilter('all')" id="f-all" class="filter-tab active px-4 py-2 rounded-full text-sm font-medium bg-white text-black whitespace-nowrap">Semua</button>
            <button onclick="setFilter('songs')" id="f-songs" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white whitespace-nowrap">Lagu</button>
            <button onclick="setFilter('videos')" id="f-videos" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white whitespace-nowrap">Video</button>
            <button onclick="setFilter('albums')" id="f-albums" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white whitespace-nowrap">Album</button>
            <button onclick="setFilter('artists')" id="f-artists" class="filter-tab glass px-4 py-2 rounded-full text-sm font-medium text-white whitespace-nowrap">Artis</button>
        </div>
        <div class="px-4 mt-2" id="search-results"></div>
        <div id="search-recs" class="px-4 mt-2 space-y-6 pb-8"></div>`;
        lucide.createIcons();
        Search.events();
    },

    onShow() { if (!S.sq) { Search.renderRecs(); } else { Search.apply(); } },

    REC_ROWS: [
        { key: 'rec0', label: '🆕 Rilis Anyar', q: 'rilis baru indonesia' },
        { key: 'rec1', label: '🌎 Top Barat', q: 'top hits barat' },
        { key: 'rec2', label: '🎤 Rap & Hip Hop', q: 'rap indonesia terbaru' }
    ],

    /** Normalisasi item API -> objek yang dipakai UI. */
    mapItem(i) {
        return {
            id: i.videoId || i.browseId,
            videoId: i.videoId || '',
            browseId: i.browseId || '',
            type: i.type || 'song',
            title: cn(i.title || ''),
            artist: cn(i.artist || i.subtitle || ''),
            artistId: i.artistId || '',
            album: i.album || '',
            duration: i.duration || '',
            cover: i.thumbnail || FI,
            ytUrl: i.url || (i.videoId ? 'https://youtube.com/watch?v=' + i.videoId : '')
        };
    },

    renderRecs() {
        var rc = gid('search-recs'); if (!rc) return;
        if (S.rec0 && S.rec1 && S.rec2) { Search.showRecs(); return; }
        rc.innerHTML = Search.REC_ROWS.map(function (row) {
            return '<div><div class="h-5 w-32 bg-white/10 rounded mb-3 animate-pulse"></div><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-1">' +
                Array(4).fill(0).map(function () { return '<div class="flex-shrink-0 w-32 animate-pulse"><div class="w-32 h-32 rounded-xl bg-white/5 mb-2"></div><div class="h-3 bg-white/10 rounded w-3/4"></div></div>'; }).join('') +
                '</div></div>';
        }).join('');
        Promise.all(Search.REC_ROWS.map(function (row) {
            return fetch(API.search + '?query=' + encodeURIComponent(row.q) + '&filter=songs&limit=12')
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    S[row.key] = (d.status && d.result.items ? d.result.items : []).map(Search.mapItem);
                }).catch(function () { S[row.key] = []; });
        })).then(function () { Search.showRecs(); });
    },

    showRecs() {
        var rc = gid('search-recs'); if (!rc) return;
        rc.innerHTML = Search.REC_ROWS.map(function (row) {
            var list = S[row.key] || [];
            if (list.length === 0) return '';
            var cardsHtml = list.map(function (t, i) {
                return '<div onclick="PK(\'' + row.key + '\',' + i + ')" class="flex-shrink-0 w-32 cursor-pointer active:scale-95 animate-stagger" style="animation-delay:' + (i * 40) + 'ms"><div class="w-32 h-32 mb-2 relative rounded-xl overflow-hidden glass-edge"><img loading="lazy" src="' + t.cover + '" class="w-full h-full object-cover" onerror="this.src=\'' + FI + '\'" /><div class="absolute bottom-1.5 right-1.5 btn-chrome rounded-full p-2 shadow-lg shadow-black/40"><i data-lucide="play" class="w-3.5 h-3.5 fill-current ml-0.5"></i></div></div><h3 class="font-semibold text-xs truncate">' + es(t.title) + '</h3><p class="text-[#6b7280] text-[10px] truncate mt-0.5">' + es(t.artist) + '</p></div>';
            }).join('');
            return '<div><h2 class="text-base font-bold mb-3">' + row.label + '</h2><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-1">' + cardsHtml + '</div></div>';
        }).join('');
        lucide.createIcons();
    },

    events() {
        var sf = gid('search-form'), si = gid('search-input'); if (!sf || !si) return;

        sf.addEventListener('submit', async function (e) {
            e.preventDefault();
            S.sq = si.value.trim();
            gid('suggestions').classList.add('hidden');
            if (!S.sq) { S.ar = []; S.sr = []; Search.show(); return; }
            var url = location.origin + '/?search=' + encodeURIComponent(S.sq);
            history.pushState({}, '', url);
            Search.show(true);
            try {
                var r = await fetch(API.search + '?query=' + encodeURIComponent(S.sq) + '&limit=40');
                var d = await r.json();
                S.ar = (d.status && d.result.items ? d.result.items : []).map(Search.mapItem);
                gid('filter-tabs').classList.remove('hidden');
                Search.apply();
            } catch (err) {
                S.ar = []; Search.show();
            }
        });

        var suggestTimer = null;
        si.addEventListener('input', function () {
            var q = this.value.trim();
            if (suggestTimer) clearTimeout(suggestTimer);
            if (!q) { gid('suggestions').classList.add('hidden'); return; }
            // debounce 250ms: dulu satu request per ketikan (boros & bikin kaget)
            suggestTimer = setTimeout(function () {
                fetch(API.suggest + '?q=' + encodeURIComponent(q))
                    .then(function (r) { return r.json(); })
                    .then(function (s) {
                        if (Array.isArray(s) && s.length > 0) {
                            gid('suggestions').innerHTML = s.map(function (sg) {
                                return '<div onclick="selectSuggestion(\'' + es(sg).replace(/'/g, "\\'") + '\')" class="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm">' + es(sg) + '</div>';
                            }).join('');
                            gid('suggestions').classList.remove('hidden');
                        } else { gid('suggestions').classList.add('hidden'); }
                    }).catch(function () { gid('suggestions').classList.add('hidden'); });
            }, 250);
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('#search-form') && !e.target.closest('#suggestions')) gid('suggestions').classList.add('hidden');
        });
    },

    show(loading) {
        var c = gid('search-results'), rc = gid('search-recs'); if (!c) return;
        if (!S.sq) { c.innerHTML = ''; if (rc) rc.style.display = ''; return; }
        if (rc) rc.style.display = 'none';

        if (loading) {
            c.innerHTML = '<div class="text-center mt-10"><div class="w-8 h-8 border-3 border-[#cfd3d8] border-t-transparent rounded-full animate-spin mx-auto"></div></div>';
            return;
        }
        if (S.sr.length === 0) {
            c.innerHTML = '<div class="text-center text-[#6b7280] mt-10"><i data-lucide="search-x" class="w-12 h-12 mx-auto mb-3 opacity-30"></i><p class="text-sm">Tidak ada hasil untuk filter ini</p></div>';
            lucide.createIcons();
            return;
        }

        c.innerHTML = S.sr.map(function (t, i) {
            var isArtist = t.type === 'artist' || t.type === 'profile';
            var isCollection = t.type === 'album' || t.type === 'single' || t.type === 'playlist';
            var label = isArtist ? 'Artis' : (t.type === 'album' ? 'Album' : (t.type === 'single' ? 'Single' : (t.type === 'playlist' ? 'Playlist' : (t.type === 'video' ? 'Video' : ''))));
            var imgCls = isArtist ? 'w-12 h-12 rounded-full object-cover' : 'w-12 h-12 rounded-lg object-cover';
            var meta = label ? '<span class="text-[#6b7280]">' + label + '</span>' : es(t.artist);
            if (!isArtist && !isCollection && t.artist) meta = es(t.artist);
            return '<div onclick="PK(\'search\',' + i + ')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer active:scale-[0.98] animate-stagger" style="animation-delay:' + (i * 30) + 'ms">' +
                '<img loading="lazy" src="' + t.cover + '" class="' + imgCls + '" onerror="this.src=\'' + FI + '\'" />' +
                '<div class="flex-1 min-w-0"><h3 class="font-medium truncate ' + (S.ct && S.ct.id === t.id ? 'text-[#cfd3d8]' : 'text-white') + '">' + es(t.title) + '</h3>' +
                '<p class="text-[#6b7280] text-sm truncate">' + meta + '</p></div>' +
                (t.duration ? '<span class="text-[#6b7280] text-xs font-mono flex-shrink-0">' + es(t.duration) + '</span>' : '') +
                (isArtist || isCollection ? '<i data-lucide="chevron-right" class="w-4 h-4 text-[#6b7280] flex-shrink-0"></i>' : '') +
                '</div>';
        }).join('');
        lucide.createIcons();
    },

    apply() {
        var f = S.filter || 'all';
        var match = { all: null, songs: ['song', 'single'], videos: ['video'], albums: ['album', 'single'], artists: ['artist', 'profile'] };
        var allow = match[f];
        // Daftar tampil = daftar yang diputar (index PK konsisten)
        S.sr = allow ? (S.ar || []).filter(function (t) { return allow.indexOf(t.type) !== -1; }) : (S.ar || []);
        Search.show();
    }
};

function selectSuggestion(t) {
    gid('suggestions').classList.add('hidden');
    gid('search-input').value = t;
    gid('search-form').dispatchEvent(new Event('submit'));
}
function setFilter(f) {
    S.filter = f;
    document.querySelectorAll('.filter-tab').forEach(function (el) {
        el.classList.remove('active', 'bg-white', 'text-black');
        el.classList.add('glass', 'text-white');
    });
    var a = gid('f-' + f);
    if (a) { a.classList.add('active', 'bg-white', 'text-black'); a.classList.remove('glass', 'text-white'); }
    Search.apply();
}

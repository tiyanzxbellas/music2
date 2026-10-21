const Artist = {
    _prev: null,   // untuk tombol "kembali" setelah membuka album

    init() {
        gid('artist-container').innerHTML = `
        <div id="artist-modal" class="fixed inset-0 bg-[#050507] flex flex-col z-[150]" style="display:none;">
            <div class="flex items-center gap-3 p-4 pt-6">
                <button id="artist-back-btn" onclick="Artist.close()" class="glass glass-hover rounded-full text-white p-3 active:scale-90"><i data-lucide="x" class="w-6 h-6"></i></button>
                <h1 id="artist-name" class="text-xl font-bold truncate">Artist</h1>
            </div>
            <div class="flex-1 overflow-y-auto hide-scrollbar pb-28" id="artist-content">
                <p class="text-center text-[#6b7280] mt-10">Memuat...</p>
            </div>
        </div>`;
        lucide.createIcons();
    },

    spinner() {
        return '<div class="flex justify-center mt-10"><div class="w-10 h-10 border-3 border-[#cfd3d8] border-t-transparent rounded-full animate-spin"></div></div>';
    },

    errorBox(msg) {
        return '<div class="text-center mt-16 px-6"><i data-lucide="wifi-off" class="w-12 h-12 mx-auto mb-3 opacity-30 text-[#6b7280]"></i>' +
            '<p class="text-[#b3b3b3] text-sm mb-4">' + es(msg || 'Gagal memuat data') + '</p>' +
            '<button onclick="Artist.retry()" class="btn-chrome px-6 py-2.5 rounded-full text-sm font-bold">Coba lagi</button></div>';
    },

    retry() { if (Artist._last) Artist.open(Artist._last.id, Artist._last.name); },

    /** Profil artis (lagu teratas, album, single, video, serupa). */
    open(id, name) {
        if (!id) { showToast('⚠️ Data artis tidak lengkap'); return; }
        Artist._prev = null;
        Artist._last = { id: id, name: name };
        gid('artist-modal').style.display = 'flex';
        gid('artist-name').innerText = name || 'Artist';
        Artist._setBack(false);
        gid('artist-content').innerHTML = Artist.spinner();
        MP.hide();

        fetch(API.artist + '?id=' + encodeURIComponent(id))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.status || !d.result) {
                    gid('artist-content').innerHTML = Artist.errorBox((d && d.message) || 'Artis tidak ditemukan');
                    lucide.createIcons();
                    return;
                }
                // Kalau server mengalihkan ke album, render sebagai album
                if (d.result.tracks) { Artist.renderAlbum(d.result); return; }
                Artist.renderProfile(d.result);
            })
            .catch(function () {
                gid('artist-content').innerHTML = Artist.errorBox('Koneksi bermasalah saat memuat artis');
                lucide.createIcons();
            });
    },

    /** Album / single / playlist -> daftar track. */
    openBrowse(id, name) {
        if (!id) { showToast('⚠️ Album tidak tersedia'); return; }
        if (!Artist._prev) {
            Artist._prev = { id: Artist._last && Artist._last.id, name: (gid('artist-name') || {}).innerText };
        }
        Artist._last = { id: id, name: name };
        gid('artist-modal').style.display = 'flex';
        gid('artist-name').innerText = name || 'Album';
        Artist._setBack(true);
        gid('artist-content').innerHTML = Artist.spinner();
        MP.hide();

        fetch(API.album + '?id=' + encodeURIComponent(id))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.status || !d.result) {
                    gid('artist-content').innerHTML = Artist.errorBox((d && d.message) || 'Album tidak ditemukan');
                    lucide.createIcons();
                    return;
                }
                Artist.renderAlbum(d.result);
            })
            .catch(function () {
                gid('artist-content').innerHTML = Artist.errorBox('Koneksi bermasalah saat memuat album');
                lucide.createIcons();
            });
    },

    _setBack(on) {
        var b = gid('artist-back-btn'); if (!b) return;
        b.setAttribute('onclick', on ? 'Artist.back()' : 'Artist.close()');
        b.innerHTML = '<i data-lucide="' + (on ? 'chevron-left' : 'x') + '" class="w-6 h-6"></i>';
        lucide.createIcons();
    },

    back() {
        if (Artist._prev && Artist._prev.id) {
            var p = Artist._prev; Artist._prev = null;
            Artist.open(p.id, p.name);
        } else { Artist.close(); }
    },

    trackRow(t, i, fallbackArtist, src) {
        var im = t.thumbnail || FI;
        return '<div onclick="Artist.playIdx(\'' + (src || 'artist') + '\',' + i + ')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer active:scale-[0.98] transition-all group">' +
            '<span class="text-[#6b7280] w-6 text-center text-sm font-medium">' + (i + 1) + '</span>' +
            '<img loading="lazy" src="' + im + '" class="w-12 h-12 rounded-lg object-cover shadow-md" onerror="this.src=\'' + FI + '\'" />' +
            '<div class="flex-1 min-w-0"><p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">' + es(t.title) + '</p>' +
            '<p class="text-[#6b7280] text-xs truncate">' + es(t.artist || fallbackArtist || '') + '</p></div>' +
            (t.duration ? '<span class="text-[#6b7280] text-xs font-mono">' + es(t.duration) + '</span>' : '') +
            '<i data-lucide="play" class="w-5 h-5 text-[#6b7280] opacity-0 group-hover:opacity-100 group-hover:text-[#cfd3d8] transition-all"></i></div>';
    },

    renderAlbum(a) {
        var cover = a.thumbnail || FI;
        var kind = a.kind ? (a.kind.charAt(0).toUpperCase() + a.kind.slice(1)) : 'Album';
        var html = '<div class="relative mb-6 pt-8">' +
            '<div class="absolute top-0 left-0 right-0 h-48 overflow-hidden rounded-b-3xl"><img src="' + cover + '" class="w-full h-full object-cover blur-3xl opacity-35 scale-150" /><div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#050507]"></div></div>' +
            '<div class="relative z-10 flex flex-col items-center">' +
            '<img src="' + cover + '" class="w-40 h-40 rounded-2xl object-cover shadow-2xl" onerror="this.src=\'' + FI + '\'" />' +
            '<h2 class="text-xl font-bold mt-4 px-6 text-center">' + es(a.title || 'Album') + '</h2>' +
            '<p class="text-[#6b7280] text-xs mt-1">' + es(kind) + (a.year ? ' • ' + es(a.year) : '') + ' • ' + (a.total || 0) + ' lagu</p>' +
            (a.artist ? '<button onclick="Artist.open(\'' + (a.artistId || '') + '\',\'' + es(a.artist).replace(/'/g, "\\'") + '\')" class="text-[#cfd3d8] text-sm font-medium mt-2 active:scale-95">' + es(a.artist) + '</button>' : '') +
            '</div></div>';

        if (!a.tracks || a.tracks.length === 0) {
            html += '<p class="text-center text-[#6b7280] text-sm mt-6">Tidak ada lagu di album ini</p>';
        } else {
            // Simpan daftar lagu album supaya next/prev/auto-next ikut jalan
            S.albumTracks = a.tracks.map(function (t) {
                return {
                    id: t.videoId, videoId: t.videoId, type: 'song',
                    title: t.title, artist: t.artist || a.artist || '',
                    artistId: t.artistId || a.artistId || '',
                    cover: t.thumbnail || a.thumbnail || FI,
                    duration: t.duration || '',
                    ytUrl: 'https://youtube.com/watch?v=' + t.videoId
                };
            });
            html += '<div class="space-y-1 px-2">' + a.tracks.map(function (t, i) { return Artist.trackRow(t, i, a.artist, 'album'); }).join('') + '</div>';
        }
        gid('artist-content').innerHTML = html;
        lucide.createIcons();
    },

    renderProfile(a) {
        var headerImg = a.thumbnails && a.thumbnails.length ? (a.thumbnails[a.thumbnails.length - 1] || {}).url : FI;
        var html = '<div class="relative mb-6 pt-8">' +
            '<div class="absolute top-0 left-0 right-0 h-48 overflow-hidden rounded-b-3xl"><img src="' + headerImg + '" class="w-full h-full object-cover blur-3xl opacity-35 scale-150" /><div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#050507]"></div></div>' +
            '<div class="relative z-10 flex flex-col items-center">' +
            '<img src="' + headerImg + '" class="artist-photo shadow-2xl" onerror="this.src=\'' + FI + '\'" />' +
            '<h2 class="text-2xl font-bold mt-4">' + es(a.name) + '</h2></div></div>';

        if (a.topSongs && a.topSongs.length > 0) {
            html += '<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">Lagu Teratas</h3><div class="space-y-1 px-2">';
            // Simpan daftar lagu teratas supaya next/prev/auto-next ikut jalan
            S.artistTracks = a.topSongs.slice(0, 10).map(function (s) {
                var th = s.thumbnails && s.thumbnails.length ? s.thumbnails[s.thumbnails.length - 1].url : FI;
                return {
                    id: s.videoId, videoId: s.videoId, type: 'song',
                    title: s.title, artist: s.artist || a.name, artistId: s.artistId || a.artistId || '',
                    cover: th, duration: s.duration || '',
                    ytUrl: 'https://youtube.com/watch?v=' + s.videoId
                };
            });
            a.topSongs.slice(0, 10).forEach(function (s, i) {
                var im = s.thumbnails && s.thumbnails[0] ? s.thumbnails[0].url : FI;
                html += '<div onclick="Artist.playIdx(\'artist\',' + i + ')" class="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer active:scale-[0.98] transition-all group">' +
                    '<span class="text-[#6b7280] w-6 text-center text-sm font-medium">' + (i + 1) + '</span>' +
                    '<img loading="lazy" src="' + im + '" class="w-12 h-12 rounded-lg object-cover shadow-md" onerror="this.src=\'' + FI + '\'" />' +
                    '<div class="flex-1 min-w-0"><p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">' + es(s.title) + '</p>' +
                    '<p class="text-[#6b7280] text-xs truncate">' + es(s.artist || a.name) + '</p></div>' +
                    '<i data-lucide="play" class="w-5 h-5 text-[#6b7280] opacity-0 group-hover:opacity-100 group-hover:text-[#cfd3d8] transition-all"></i></div>';
            });
            html += '</div></div>';
        }

        function carousel(title, list, round) {
            if (!list || list.length === 0) return '';
            var cards = list.map(function (it) {
                var im = it.thumbnails && it.thumbnails.length ? (it.thumbnails[1] || it.thumbnails[0]).url : FI;
                var click = it.videoId
                    ? 'Artist.playOne(\'' + it.videoId + '\',\'' + es(it.name).replace(/'/g, "\\'") + '\',\'' + es(it.artist || a.name).replace(/'/g, "\\'") + '\',\'' + im + '\')'
                    : 'Artist.openBrowse(\'' + (it.browseId || '') + '\',\'' + es(it.name).replace(/'/g, "\\'") + '\')';
                var sub = it.videoId ? es(it.artist || a.name) : (es(it.artist || '') || (round ? 'Artis' : 'Album'));
                return '<div onclick="' + click + '" class="flex-shrink-0 ' + (round ? 'w-28 text-center' : 'w-36') + ' cursor-pointer group">' +
                    '<div class="' + (round ? 'w-28 h-28 rounded-full ring-2 ring-transparent group-hover:ring-[#cfd3d8]/50' : 'w-36 h-36 rounded-xl') + ' overflow-hidden shadow-lg mb-2 transition-all">' +
                    '<img loading="lazy" src="' + im + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src=\'' + FI + '\'" /></div>' +
                    '<p class="font-medium text-sm truncate group-hover:text-[#cfd3d8] transition-colors">' + es(it.name) + '</p>' +
                    '<p class="text-[#6b7280] text-xs truncate">' + sub + '</p></div>';
            }).join('');
            return '<div class="mb-6"><h3 class="font-bold text-sm text-[#b3b3b3] uppercase tracking-wider mb-3 px-4">' + title + '</h3><div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">' + cards + '</div></div>';
        }

        html += carousel('Album', a.topAlbums, false);
        html += carousel('Single & EP', a.topSingles, false);
        html += carousel('Video', a.topVideos, false);
        html += carousel('Tampil Di', a.featuredOn, false);
        html += carousel('Artis Serupa', a.similarArtists, true);

        if (html.indexOf('Lagu Teratas') === -1 && !a.topAlbums.length && !a.topSingles.length && !a.topVideos.length) {
            html += '<p class="text-center text-[#6b7280] text-sm mt-6">Belum ada konten untuk artis ini</p>';
        }

        gid('artist-content').innerHTML = html;
        lucide.createIcons();
    },

    close() {
        gid('artist-modal').style.display = 'none';
        Artist._prev = null;
        MP.show();
    },

    /** Putar satu lagu lepas (kartu video / carousel) - cover ikut, tidak hilang. */
    playOne(vid, title, artist, cover) {
        if (!vid) { showToast('⚠️ Lagu tidak tersedia'); return; }
        S.ct = { id: vid, videoId: vid, title: title, artist: artist, cover: cover || FI, artistId: '', ytUrl: 'https://youtube.com/watch?v=' + vid };
        S.ps = 'queue'; S.pl = [S.ct]; S.pi = 0; UU(); MP.show(); S.il = true; UB();
        resetLyricsUI(vid);
        loadTrack(S.ct);
    },

    /** Putar dari daftar album / lagu teratas artis -> antrian + next/prev hidup. */
    playIdx(key, i) {
        var list = (key === 'album') ? (S.albumTracks || []) : (S.artistTracks || []);
        if (!list.length || !list[i]) { showToast('⚠️ Lagu tidak tersedia'); return; }
        S.ps = (key === 'album') ? 'album' : 'artist';
        S.pl = list; S.pi = i; S.ct = list[i];
        UU(); MP.show(); S.il = true; UB();
        resetLyricsUI(S.ct.videoId);
        loadTrack(S.ct);
    },

    /** Kompatibilitas pemanggil lama: Artist.play(videoId, judul, artis). */
    play(vid, title, artist, cover) { Artist.playOne(vid, title, artist, cover); }
};

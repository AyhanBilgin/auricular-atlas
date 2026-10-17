import { auth, db } from './firebase-config.js';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';



const $ = id => document.getElementById(id);

let points = [];

let selectedName = null;
const selectedNames = new Set(); // Haritada birlikte gösterilecek nokta adları

let selectedRecord = null;

let draft = null;

let admin = false;

const status = message => { $('status').textContent = message; };

const sideLabel = side => side === 'left' ? 'Sol kulak' : 'Sağ kulak';

const norm = value => (value || '').trim().toLocaleLowerCase('tr');

const pointSide = point => point.earSide || 'left'; // Eski kayıtlar sol kulakta kalır.



// David Alimi Şekil 13.6 üzerindeki okunabilen adların Türkçe karşılıkları.

// Bunlar yalnızca liste adlarıdır; koordinatlar kaynakla doğrulanıp elle girilir.

const ALIMI_ADLARI = [

    'Cosmonot', 'Omega 2', 'Başparmak', 'El', 'El bileği',

    'Kalça kas segmentleri', 'Bacak kas segmentleri', 'Ayak kas segmentleri',

    'Duyu kökleri', 'Cauda Equina', 'Dirsek', 'Omuz',

    'Böbrek', 'Rektum', 'Mesane kası', 'Hemoroidler',

    'Hipogastrik pleksus', 'Karaciğer pleksusu', 'Karaciğer / Safra kesesi',

    'Koroner kalp pleksusu', 'Kalp', 'Timus pleksusu',

    'Tiroid pleksusu', 'Sempatik gangliyonlar', 'Sempatik nokta',

    'Meme bezi', 'Böbreküstü bezi medullası', 'Böbreküstü bezi korteksi',

    'Omurga', 'Omurga kas segmentleri', 'Hipokampus',

    'Amigdala / Septum', 'Beyin sapı', 'Dil', 'Dişler',

    'Dış kulak', 'Epifiz bezi', 'Hipofiz', 'Hipotalamus',

    'Uterus / Prostat', 'Fallop tüpü / Epididim', 'Testis / Over',

    'Vajina / Skrotum / İç dudaklar', 'Glans / Klitoris / Penis',

    'Dış beyaz komissür', 'Ön beyaz komissür', 'Korpus kallozum',

    'Trigeminal sinir çekirdekleri', 'Vestibüler korteks',

    'Lokus seruleus çekirdeği', 'Rafe çekirdeği', 'Serebellum',

    'ACTH', 'FSH / LH', 'TSH', 'PMS', 'Omega'

];



function names() {

    const unique = new Map();

    for (const p of points) if (p.name && !unique.has(norm(p.name))) unique.set(norm(p.name), p.name);

    for (const name of ALIMI_ADLARI) if (!unique.has(norm(name))) unique.set(norm(name), name);

    return [...unique.values()].sort((a, b) => a.localeCompare(b, 'tr'));

}

function recordsForName(name) {

    return points.filter(p => norm(p.name) === norm(name));

}

function resetEditor(clearName = false) {

    selectedRecord = null;

    draft = null;

    $('form').reset();

    $('coordinates').textContent = 'Haritaya tıklayın';

    $('editing-side').textContent = 'Kulak seçilmedi';

    if (!clearName && selectedName) $('name').value = selectedName;

    render();

}

function selectName(name) {
    const key = norm(name);
    if (selectedNames.has(key)) {
        selectedNames.delete(key);
        if (norm(selectedName) === key) {
            selectedName = names().find(n => selectedNames.has(norm(n))) || null;
            resetEditor(true);
        } else {
            render();
        }
    } else {
        selectedNames.add(key);
        selectedName = name;
        resetEditor();
    }
    showDetail();
}

function showDetail() {
    const article = $('detail');
    article.replaceChildren();

    if (!selectedName) {
        article.textContent = 'Ayrıntıları görüntülemek için listeden bir nokta seçin.';
        return;
    }

    const entries = recordsForName(selectedName);
    const firstWith = field => entries.find(p => typeof p[field] === 'string' && p[field].trim())?.[field]?.trim();

    const header = document.createElement('div');
    header.className = 'detail-header';
    const title = document.createElement('h3');
    title.textContent = selectedName;
    header.append(title);
    const code = firstWith('code');
    if (code) {
        const chip = document.createElement('span');
        chip.className = 'detail-code';
        chip.textContent = code;
        header.append(chip);
    }
    article.append(header);

    const section = (label, content) => {
        const block = document.createElement('section');
        block.className = 'detail-section';
        const heading = document.createElement('h4');
        heading.textContent = label;
        const value = document.createElement('p');
        value.textContent = content;
        block.append(heading, value);
        article.append(block);
    };

    section('Anatomik bölge', firstWith('region') || 'Anatomik bölge henüz kaydedilmedi.');
    section('Açıklama', firstWith('description') || 'Bu nokta için henüz açıklama girilmedi.');
    const location = firstWith('locationDescription');
    const cartography = firstWith('cartography');
    const sourceTitle = firstWith('sourceTitle');
    const sourcePage = firstWith('sourcePage');
    const sourceFigure = firstWith('sourceFigure');
    if (location || cartography || sourceTitle || sourcePage || sourceFigure) {
        if (cartography) section('Kartografi', cartography);
        section('Anatomik lokasyon tarifi', location || 'Lokasyon tarifi henüz kaydedilmedi.');
        const sourceParts = [sourceTitle, sourcePage ? `s. ${sourcePage}` : '', sourceFigure ? `Şekil ${sourceFigure}` : ''].filter(Boolean);
        if (sourceParts.length) section('Kaynak', sourceParts.join(' · '));
    }

    const gridTitle = document.createElement('h4');
    gridTitle.className = 'detail-subtitle';
    gridTitle.textContent = 'Kulak konumları';
    article.append(gridTitle);

    const grid = document.createElement('div');
    grid.className = 'detail-sides';
    for (const side of ['left', 'right']) {
        const record = entries.find(p => pointSide(p) === side);
        const card = document.createElement('div');
        card.className = 'detail-side';
        const name = document.createElement('strong');
        name.textContent = sideLabel(side);
        const value = document.createElement('span');
        value.textContent = record && Number.isFinite(record.x) && Number.isFinite(record.y)
            ? `X: ${record.x.toFixed(1)}% · Y: ${record.y.toFixed(1)}%`
            : 'Konum henüz kaydedilmedi';
        card.append(name, value);
        grid.append(card);
    }
    article.append(grid);

    const urls = [...new Set(entries.flatMap(p => Array.isArray(p.images) ? p.images : []))]
        .filter(url => typeof url === 'string' && /^https:\/\//i.test(url));
    if (urls.length) {
        const galleryTitle = document.createElement('h4');
        galleryTitle.className = 'detail-subtitle';
        galleryTitle.textContent = 'Nokta görselleri';
        article.append(galleryTitle);
        const gallery = document.createElement('div');
        gallery.className = 'detail-gallery';
        for (const url of urls) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${selectedName} referans görseli`;
            img.loading = 'lazy';
            gallery.append(img);
        }
        article.append(gallery);
    }
}

// Kıvrım altı işaretleyicisinin görünümünü mevcut CSS kuralları ezmesin.
function applyUnderfoldStyle(marker) {
    const styles = {
        width: '17px',
        height: '17px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '2px dashed #7C3AED',
        borderRadius: '50%',
        boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.2)',
        opacity: '1'
    };
    for (const [property, value] of Object.entries(styles)) {
        marker.style.setProperty(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value, 'important');
    }
}

function render() {

    const list = $('points');

    list.replaceChildren();

    const search = norm($('search').value);

    let totalMatches = 0;

    for (const name of names()) {


        const entries = recordsForName(name);

        if (![name, ...entries.map(p => p.code), ...entries.map(p => p.region)].some(s => norm(s).includes(search))) continue;

        totalMatches++;

        const li = document.createElement('li');

        if (selectedNames.has(norm(name))) li.classList.add('active');
        li.setAttribute('role', 'checkbox');
        li.setAttribute('aria-checked', String(selectedNames.has(norm(name))));
        li.tabIndex = 0;

        li.textContent = name;

        const sub = document.createElement('span');

        sub.className = 'sub';

        const sides = [...new Set(entries.map(p => pointSide(p)))];

        sub.textContent = sides.length === 0 ? 'Konum bekleniyor' : sides.length === 2 ? 'Sağ + sol' : sides.map(sideLabel).join(', ');

        li.append(sub);

        li.onclick = () => selectName(name);
        li.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectName(name); } };

        list.append(li);

    }

    $('list-count').textContent = search

        ? `${totalMatches} arama sonucu · ${selectedNames.size} seçili`

        : `${totalMatches} nokta adı · ${selectedNames.size} seçili · birden fazla nokta seçebilirsiniz`;


    for (const side of ['left', 'right']) {

        const layer = $(`markers-${side}`);

        layer.replaceChildren();        const visiblePoints = points.filter(p => selectedNames.has(norm(p.name)) && pointSide(p) === side);
        const focusPoint = visiblePoints.find(p => norm(p.name) === norm(selectedName));
        $(`${side}-position`).textContent = focusPoint
            ? `Seçili nokta: ${focusPoint.name} — X: ${focusPoint.x.toFixed(1)}% · Y: ${focusPoint.y.toFixed(1)}%`
            : `${visiblePoints.length} nokta gösteriliyor`;

        for (const p of visiblePoints) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
            const marker = document.createElement('button');
            marker.type = 'button';
            marker.className = `marker selected ${p.markerType === 'underfold' ? 'underfold' : ''}`;
            if (p.markerType === 'underfold') applyUnderfoldStyle(marker);
            marker.style.left = `${p.x}%`;
            marker.style.top = `${p.y}%`;
            marker.title = `${p.name} — ${sideLabel(side)}${p.markerType === 'underfold' ? ' — kıvrım altında' : ''}`;
            marker.setAttribute('aria-label', marker.title);
            marker.onclick = event => {
                event.stopPropagation();
                selectedName = p.name;
                if (admin) editRecord(p);
                else { showDetail(); render(); }
            };
            layer.append(marker);
        }



        if (draft?.side === side) {

            const marker = document.createElement('span');

            marker.className = `marker draft ${$('markerType').value === 'underfold' ? 'underfold' : ''}`;
                if ($('markerType').value === 'underfold') applyUnderfoldStyle(marker);

            marker.style.left = `${draft.x}%`; marker.style.top = `${draft.y}%`;

            layer.append(marker);

        }

    }

}

function editRecord(p) {

    selectedName = p.name;
    selectedNames.add(norm(p.name));

    selectedRecord = p;

    draft = { side: pointSide(p), x: p.x, y: p.y };
    $('markerType').value = p.markerType === 'underfold' ? 'underfold' : 'visible';

    for (const field of ['name', 'code', 'region']) $(field).value = p[field] || '';

    $('description').value = p.description || '';
    for (const field of ['cartography', 'locationDescription', 'sourceTitle', 'sourcePage', 'sourceFigure']) {
        $(field).value = p[field] || '';
    }

    $('editing-side').textContent = `${sideLabel(draft.side)} — mevcut kayıt düzenleniyor`;

    $('coordinates').textContent = `${draft.x.toFixed(1)}%, ${draft.y.toFixed(1)}%`;

    showDetail(); render();

}

for (const side of ['left', 'right']) {

    $(`map-${side}`).onclick = event => {

        if (!admin || event.target.closest('button')) return;

        const img = $(`map-${side}`).querySelector('img');

        const rect = img.getBoundingClientRect();

        if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;

        draft = {

            side,

            x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),

            y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))

        };

        // Başka kulaktaki kaydı yanlışlıkla güncelleme.

        if (selectedRecord && pointSide(selectedRecord) !== side) selectedRecord = null;

        $('editing-side').textContent = `${sideLabel(side)} — ${selectedRecord ? 'konum güncelleniyor' : 'yeni kayıt'}`;

        $('coordinates').textContent = `${draft.x.toFixed(1)}%, ${draft.y.toFixed(1)}%`;

        if (selectedName && !$('name').value.trim()) $('name').value = selectedName;

        render();

    };

}

async function load() {

    try {

        const snap = await getDocs(collection(db, 'auricular_points'));

        points = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        render(); showDetail();

        status(`${names().length} nokta adı listelendi; ${points.length} kulak konumu kayıtlı.`);

    } catch (error) {

        console.error(error);

        status('Firestore okuma hatası: ' + error.message);

    }

}

onAuthStateChanged(auth, async user => {

    admin = false;

    if (user) {

        try { admin = (await user.getIdTokenResult(true)).claims.admin === true; }

        catch (error) { console.error('Yetki kontrolü:', error); }

    }

    $('editor').hidden = !admin;


    $('logout').hidden = !user;

    $('login').hidden = !!user;

    $('email').hidden = !!user;

    $('password').hidden = !!user;

    if (user) { await load(); }

    else { points = []; selectedName = null; selectedNames.clear(); resetEditor(true); showDetail(); status('Noktaları görmek için giriş yapın.'); }

});

$('login').onclick = async () => {

    try { status('Giriş yapılıyor...'); await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); }

    catch (error) { console.error(error); status('Giriş hatası: ' + error.message); }

};

$('logout').onclick = async () => {

    try { await signOut(auth); } catch (error) { status('Çıkış hatası: ' + error.message); }

};

$('search').oninput = render;
$('markerType').onchange = render;

$('clear').onclick = () => resetEditor();

$('form').onsubmit = async event => {

    event.preventDefault();

    if (!admin) return status('Yönetici yetkisi gerekli.');

    if (!draft) return status('Önce sağ veya sol kulak üzerinde konum seçin.');

    const name = $('name').value.trim();

    if (!name) return status('Nokta adı gerekli.');

    const record = { name, code: $('code').value.trim(), region: $('region').value.trim(), description: $('description').value.trim(), x: draft.x, y: draft.y, cartography: $('cartography').value.trim(), locationDescription: $('locationDescription').value.trim(), sourceTitle: $('sourceTitle').value.trim(), sourcePage: $('sourcePage').value.trim(), sourceFigure: $('sourceFigure').value.trim(), images: selectedRecord?.images || [], earSide: draft.side, markerType: $('markerType').value };

    // Aynı ad ve aynı kulak için birden fazla kayıt oluşmasını önle.

    const duplicate = points.find(p => norm(p.name) === norm(name) && pointSide(p) === draft.side && p.id !== selectedRecord?.id);

    if (duplicate) return status(`${sideLabel(draft.side)} için bu isimde kayıt zaten var. Önce mevcut noktayı seçip düzenleyin.`);

    try {

        if (selectedRecord) await updateDoc(doc(db, 'auricular_points', selectedRecord.id), record);

        else await addDoc(collection(db, 'auricular_points'), record);

        selectedName = name; selectedNames.add(norm(name)); resetEditor(); await load(); status('Nokta kaydedildi.');

    } catch (error) { console.error(error); status('Kayıt hatası: ' + error.message); }

};

$('delete').onclick = async () => {

    if (!admin || !selectedRecord) return status('Silmek için önce mevcut bir işaretleyiciye tıklayın.');

    if (!confirm(`${selectedRecord.name} (${sideLabel(pointSide(selectedRecord))}) silinsin mi?`)) return;

    try { await deleteDoc(doc(db, 'auricular_points', selectedRecord.id)); resetEditor(); await load(); status('Seçili kulak kaydı silindi.'); }

    catch (error) { console.error(error); status('Silme hatası: ' + error.message); }

};

render();



// Liste odaktayken yukarı/aşağı oklarla kaydırma (fare tekerleği de çalışır).

$('points').addEventListener('keydown', event => {

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {

        event.preventDefault();

        $('points').scrollBy({ top: event.key === 'ArrowDown' ? 46 : -46, behavior: 'smooth' });

    }

});

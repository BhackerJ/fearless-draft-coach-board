const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
const teams = ['Blue', 'Red'];
const catalog = [
    'Ornn Renekton Gwen Gnar Fiora Camille Sion Poppy Malphite Shen Kennen Aatrox',
    'Vi Wukong Graves Sejuani Jarvan Nocturne Viego XinZhao Kindred Lillia Maokai Skarner',
    'Ahri Orianna Viktor Azir Syndra Taliyah Akali Sylas Galio Ryze Cassiopeia Veigar',
    'Jinx Xayah Ezreal Ashe Caitlyn Sivir Varus Draven Jhin Lucian Twitch Kalista',
    'Nautilus Rakan Leona Braum Rell Lulu Thresh Alistar Nami Janna Milio Soraka'
].map(group => group.split(' '));
const names = catalog.flat();
const engage = new Set('Ornn Vi Wukong Nautilus Rakan Gnar Sejuani Ashe Leona Rell Malphite Kennen Jarvan Nocturne Maokai Skarner Alistar'.split(' '));
const emptySlots = () => teams.map(() => Array(5).fill(''));
const blankGame = () => ({pick: emptySlots(), ban: emptySlots()});
let series = [
    {
        pick: [['Ornn', 'Vi', 'Ahri', 'Jinx', 'Nautilus'], ['Renekton', 'Wukong', 'Orianna', 'Xayah', 'Rakan']],
        ban: emptySlots()
    },
    {pick: [['Gwen', 'Graves', 'Viktor', 'Ezreal', ''], ['Gnar', 'Sejuani', 'Azir', 'Ashe', '']], ban: emptySlots()},
    blankGame()
];
series[0].ban[0][0] = 'Leona';
let game = 0, lockedCount = 0;
let target = {kind: 'pick', team: 0, slot: 0};
const el = id => document.getElementById(id);
el('role').innerHTML = ['All positions', ...roles].map(r => '<option>' + r + '</option>').join('');
function standings() {
    const wins = [0, 0];
    const needed = Math.ceil(series.length / 2);
    let frontier = 0;
    for (const draft of series.slice(0, lockedCount)) {
        if (![0, 1].includes(draft.winner)) break;
        if (++wins[draft.winner] === needed) return {wins, frontier, champion: draft.winner};
        frontier++;
    }
    return {wins, frontier, champion: null};
}
const editable = () => game === lockedCount && game === standings().frontier;
const previous = () => series.slice(0, game).flatMap(draft => draft.pick.flat());

let playerPools = Array.from({length: 10}, () => []);
el('player').innerHTML = teams.flatMap(team => roles.map(role =>
    `<option>${team} · ${role}</option>`)).join('');

const storageKey = 'fearless-draft.series.v1';

function saveSeries() {
    try {
        localStorage.setItem(storageKey, JSON.stringify({
            series, game, lockedCount, target, playerPools, watched: el('player').selectedIndex, gapOnly: el('gap-only').checked,
            role: el('role').selectedIndex, tag: el('tag').selectedIndex
        }));
        el('save-status').textContent = 'Saved on this device';
    } catch {
        el('save-status').textContent = 'Autosave unavailable in this browser';
    }
}

function restoreSeries() {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const validGrid = grid => Array.isArray(grid) && grid.length === 2 &&
            grid.every(row => Array.isArray(row) && row.length === 5 &&
                row.every(name => name === '' || names.includes(name)));
        const legacy = saved.series?.length === 2 && typeof saved.locked === 'boolean';
        const count = legacy ? Number(saved.locked) : saved.lockedCount;
        if (!Array.isArray(saved.series) || (!legacy && ![3, 5].includes(saved.series.length)) ||
            !saved.series.every(g => validGrid(g.pick) && validGrid(g.ban)) ||
            !Number.isInteger(count) || count < 0 || count > saved.series.length ||
            !Number.isInteger(saved.game) || saved.game < 0 || saved.game >= saved.series.length ||
            saved.game > count) throw Error('Invalid series');
        series = saved.series;
        if (legacy) series.push(blankGame());
        game = saved.game;
        lockedCount = count;
        game = Math.min(game, standings().frontier);
        const t = saved.target;
        if (t && ['pick', 'ban'].includes(t.kind) && [0, 1].includes(t.team) &&
            Number.isInteger(t.slot) && t.slot >= 0 && t.slot < 5) selectSlot(t.kind, t.team, t.slot);
        if (Number.isInteger(saved.role) && saved.role >= 0 && saved.role <= 5) el('role').selectedIndex = saved.role;
        if ([0, 1].includes(saved.tag)) el('tag').selectedIndex = saved.tag;
        if (Array.isArray(saved.playerPools) && saved.playerPools.length === 10 &&
            saved.playerPools.every(list => Array.isArray(list) && list.every(n => names.includes(n)))) {
            playerPools = saved.playerPools;
        }
        if (Number.isInteger(saved.watched) && saved.watched >= 0 && saved.watched < 10)
            el('player').selectedIndex = saved.watched;
        if (typeof saved.gapOnly === 'boolean') el('gap-only').checked = saved.gapOnly;
        el('save-status').textContent = 'Restored on this device';
    } catch {
        el('save-status').textContent = 'Could not restore saved series';
    }
}

function pool() {
    const used = new Set([...previous(), ...series[game].pick.flat(), ...series[game].ban.flat()]);
    return names.filter(name => !used.has(name));
}

function selectSlot(kind, team, slot) {
    target = {kind, team, slot};
    if (kind === 'pick') el('player').selectedIndex = team * roles.length + slot;
    el('role').selectedIndex = kind === 'pick' ? slot + 1 : 0;
    el('tag').selectedIndex = 0;
}

function slotControl(kind, team, slot) {
    const name = series[game][kind][team][slot];
    if (!editable()) return name || '—';
    const active = target.kind === kind && target.team === team && target.slot === slot;
    const label = teams[team] + ' ' + (kind === 'ban' ? 'ban ' + (slot + 1) : roles[slot]);
    return `<button data-slot="${slot}" data-kind="${kind}" data-team="${team}" aria-label="${label}: ${name || 'empty'}" aria-pressed="${active}">${name || '+ ' + (kind === 'ban' ? 'Ban' : 'Pick')}</button>`;
}

function renderPlayerPool() {
    const index = el('player').selectedIndex;
    const team = Math.floor(index / roles.length);
    const slot = index % roles.length;
    const coveredByOthers = series[game].pick[team].some((name,i) => i !== slot && engage.has(name));
    const limited = el('gap-only').checked;
    const available = pool().filter(name => playerPools[index].includes(name) &&
        (!limited || (!coveredByOthers && engage.has(name))));
    const selected = series[game].pick[team][slot];
    el('player-note').textContent = selected && !coveredByOthers && engage.has(selected) && limited
        ? `${selected} provides engage. Other available replacements appear below.`
        : !playerPools[index].length ? 'Set this player’s comfort picks to see candidates.' :
        limited && coveredByOthers ? 'Another position already covers engage. Uncheck the filter to see available comfort picks.' :
        limited ? 'Reliable initiators available for this position, accounting for the other four picks.' :
        'All available comfort picks for this player.';
    el('recommendations').innerHTML = available.map(name =>
        `<button data-recommend="${name}" ${editable() ? '' : 'disabled'}>Pick ${name}</button>`).join(' ') ||
        (playerPools[index].length && !(limited && coveredByOthers) ? (selected ? 'No matching replacements.' : 'No matching comfort picks available.') : '');
}

function render() {
    const {pick} = series[game];
    const redBans = series[game].ban[1];
    const bannedLeona = redBans.includes('Leona');
    const canBanLeona = redBans.includes('') && pool().includes('Leona') && pool().includes('Rell');
    el('sample-tip').hidden = !(game === 1 && editable() && el('player').selectedIndex === 4 &&
        playerPools[4].includes('Rell') && playerPools[4].includes('Leona') && (canBanLeona || bannedLeona));
    el('scenario-ban').disabled = bannedLeona;
    el('scenario-ban').textContent = bannedLeona ? 'Red banned Leona' : 'Ban Leona for Red';
    renderPlayerPool();
    const {wins, frontier, champion} = standings();
    el('score').textContent = `Blue ${wins[0]} – ${wins[1]} Red` +
        (champion === null ? '' : ` · ${teams[champion]} wins the series`);
    el('format').textContent = 'BO' + series.length;
    el('games').innerHTML = series.map((_, n) => `<button data-game="${n}" aria-pressed="${game === n}" ${n > frontier ? 'disabled' : ''}>Game 0${n + 1}</button>`).join('');
    el('lineups').innerHTML = '<table><thead><tr><th>Position</th><th>Blue side</th><th>Red side</th></tr></thead><tbody>' + roles.map((r, i) => `<tr><td>${r}</td><td>${slotControl('pick', 0, i)}</td><td>${slotControl('pick', 1, i)}</td></tr>`).join('') + '</tbody></table>';
    el('bans').innerHTML = teams.map((team, t) => `<div class="banrow"><small>${team}</small>${series[game].ban[t].map((_, i) => slotControl('ban', t, i)).join(' ')}</div>`).join('');
    const complete = pick.flat().every(Boolean);
    if (editable()) {
        el('action').innerHTML = `<button id="lock" class="primary" ${complete ? '' : 'disabled'}>Lock game ${game+1} draft</button>${complete ? '' : ' <small>Fill all ten picks to lock.</small>'}`;
    } else if (series[game].winner == null) {
        el('action').innerHTML = '<p>Draft locked · Record game winner</p>' +
            teams.map((team,t) => `<button data-winner="${t}">${team} won</button>`).join(' ');
    } else {
        el('action').textContent = `Game ${game+1} winner · ${teams[series[game].winner]}`;
    }
    el('gaps').innerHTML = teams.map((team, t) => {
        const sources = pick[t].filter(n => engage.has(n));
        const missing = roles.filter((_, i) => !pick[t][i]);
        return `<article><small>${team.toUpperCase()} SIDE</small><h3 class="${sources.length ? 'ok' : 'warn'}">${sources.length ? 'Engage covered' : 'Missing engage'}</h3><div>${sources.join(' · ') || 'Add a reliable initiator.'}</div><small>${missing.length ? 'Open positions · ' + missing.join(', ') : 'All positions filled'}</small></article>`;
    }).join('');
    const {kind, team, slot} = target;
    const current = series[game][kind][team][slot];
    el('target').innerHTML = editable() ? `Editing <strong>${teams[team]} · ${kind === 'ban' ? 'Ban ' + (slot + 1) : roles[slot]}</strong> · ${current || 'Empty'} <button id="clear" ${current ? '' : 'disabled'}>Clear slot</button>` : `Game ${game + 1} locked`;
    const pos = el('role').selectedIndex - 1;
    const options = pool().filter(n => (pos < 0 || catalog[pos].includes(n)) && (!el('tag').selectedIndex || engage.has(n)));
    el('count').textContent = options.length;
    el('pool').innerHTML = options.map(n => editable() ? `<button data-name="${n}">${n} ＋</button>` : `<span>${n}</span>`).join('') || 'No matching champions. Try another filter.';
    el('history').innerHTML = series.slice(0, game).flatMap((draft, index) =>
        draft.pick.flatMap((row, t) => row.map((name, i) =>
            `<details><summary>${name}</summary>Game ${index + 1} · ${teams[t]} · ${roles[i]}</details>`
        ))).join('') || 'No earlier games in this series.';

}

document.addEventListener('click', event => {
    const b = event.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (b.id === 'edit-player') {
        const index = el('player').selectedIndex;
        el('editor-title').textContent = el('player').selectedOptions[0].text + ' · Comfort picks';
        el('champion-checklist').innerHTML = catalog.map((group,i) => `<fieldset><legend>${roles[i]}</legend>${group.map(name =>
            `<label><input type="checkbox" value="${name}" ${playerPools[index].includes(name)?'checked':''}> ${name}</label>`).join('')}</fieldset>`).join('');
        el('player-editor').returnValue = '';
        el('player-editor').showModal();
        return;
    }
    if (b.id === 'scenario-ban' && editable() && pool().includes('Leona')) {
        const slot = series[game].ban[1].indexOf('');
        if (slot < 0) return;
        selectSlot('ban',1,slot);
        series[game].ban[1][slot] = 'Leona';
    } else if (b.id === 'new-series') {
        el('setup').returnValue = '';
        el('setup').showModal();
        return;
    } else if (b.closest('dialog')) {
        return;
    } else if (b.id === 'lock' && editable() && series[game].pick.flat().every(Boolean)) {
        lockedCount++;
    } else if (d.winner !== undefined && game < lockedCount && game === standings().frontier &&
        series[game].winner == null && ['0','1'].includes(d.winner)) {
        series[game].winner = Number(d.winner);
        if (standings().champion === null) {
            game++;
            const used = new Set(previous());
            for (const row of series[game].pick) row.forEach((name, i) => {
                if (used.has(name)) row[i] = '';
            });
            selectSlot('pick', 0, Math.max(0, series[game].pick[0].indexOf('')));
        }
    } else if (d.game !== undefined && Number(d.game) <= standings().frontier) {
        game = Number(d.game);
        selectSlot('pick', 0, game === 1 ? 4 : 0);
    } else if (editable()) {
        if (d.recommend && pool().includes(d.recommend)) {
            const watched = el('player').selectedIndex;
            selectSlot('pick', Math.floor(watched / roles.length), watched % roles.length);
            series[game].pick[target.team][target.slot] = d.recommend;
        }
        if (d.kind) selectSlot(d.kind, Number(d.team), Number(d.slot));
        if (b.id === 'clear' || (d.name && pool().includes(d.name))) {
            series[game][target.kind][target.team][target.slot] = d.name || '';
        }
    }
    saveSeries();
    render();
});
el('setup').addEventListener('close', () => {
    if (el('setup').returnValue !== 'create') return;
    series = Array.from({length: Number(el('length').value)}, blankGame);
    game = 0;
    lockedCount = 0;
    selectSlot('pick', 0, 0);
    saveSeries();
    render();
});

function changeFilter() {
    saveSeries();
    render();
}

el('player-editor').addEventListener('close', () => {
    if (el('player-editor').returnValue !== 'save') return;
    playerPools[el('player').selectedIndex] = Array.from(
        el('champion-checklist').querySelectorAll('input:checked'), input => input.value);
    saveSeries();
    renderPlayerPool();
});
el('player').onchange = changeFilter;
el('gap-only').onchange = changeFilter;
el('role').onchange = changeFilter;
el('tag').onchange = changeFilter;
// Start first-time visitors at the decision point; existing drafts take precedence.
series[0].winner = 0;
lockedCount = 1;
game = 1;
playerPools[4] = ['Nautilus', 'Leona', 'Rell', 'Lulu'];
selectSlot('pick', 0, 4);
restoreSeries();
render();

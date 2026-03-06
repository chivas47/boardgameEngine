/**
 * Realm's Edge — Fantasy Adventure Board Game
 * Players move around a circular map, fight monsters, collect gold.
 * First to 100 gold wins.
 *
 * Tile types: START, MONSTER, TREASURE, TAVERN, CURSED, EVENT, QUEST, TOWN
 * Classes: Warrior, Rogue, Mage, Ranger
 * Dice: 2d6 movement, d6 combat
 */

const RealmsEdge = (() => {

  // ── Constants ───────────────────────────────────────────────────────────────
  const N = 24;
  const WIN_GOLD = 100;
  const CX = 400, CY = 385, R = 270; // SVG board center + radius
  const SVG_W = 800, SVG_H = 760;

  // ── Hero Classes ─────────────────────────────────────────────────────────────
  const CLASSES = {
    warrior: { name: 'Warrior', icon: '⚔️', hp: 12, attack: 2, color: '#e74c3c', desc: 'High HP, strong fighter', special: '+2 ATK, 12 HP' },
    rogue:   { name: 'Rogue',   icon: '🗡️', hp: 8,  attack: 1, color: '#9b59b6', desc: 'Earns extra gold on Treasure tiles', special: '+5g on Treasure' },
    mage:    { name: 'Mage',    icon: '🔮', hp: 8,  attack: 3, color: '#3498db', desc: 'Can reroll once per combat', special: 'Combat Reroll' },
    ranger:  { name: 'Ranger',  icon: '🏹', hp: 10, attack: 2, color: '#27ae60', desc: 'Flees on 3+ instead of 4+', special: 'Better Flee' },
  };

  // ── Board layout (24 tiles clockwise from top) ────────────────────────────
  const BOARD = [
    { type: 'START',    name: 'Heartstone Village', icon: '🏰', color: '#f39c12' },
    { type: 'TREASURE', name: 'Ancient Chest',       icon: '💰', color: '#f1c40f', gold: [8,18] },
    { type: 'MONSTER',  name: 'Dark Forest',         icon: '🌲', color: '#1e8449', monster: { name:'Goblin',      hp:3, atk:1, reward:12, icon:'👺' } },
    { type: 'EVENT',    name: 'Crossroads',          icon: '🔀', color: '#8e44ad' },
    { type: 'TAVERN',   name: 'The Muddy Boot',      icon: '🍺', color: '#d35400' },
    { type: 'CURSED',   name: 'Haunted Graveyard',   icon: '💀', color: '#2c3e50' },
    { type: 'MONSTER',  name: 'Misty Moors',         icon: '🌫️', color: '#5d6d7e', monster: { name:'Wolf',       hp:4, atk:2, reward:16, icon:'🐺' } },
    { type: 'TREASURE', name: 'Sunken Ruins',        icon: '🏛️', color: '#f1c40f', gold: [10,22] },
    { type: 'QUEST',    name: 'Ancient Temple',      icon: '🗿', color: '#cb4335' },
    { type: 'MONSTER',  name: 'Rocky Pass',          icon: '⛰️', color: '#717d7e', monster: { name:'Orc',        hp:5, atk:2, reward:20, icon:'👹' } },
    { type: 'TOWN',     name: 'Iron Market',         icon: '🏪', color: '#2980b9' },
    { type: 'CURSED',   name: "Witch's Swamp",       icon: '🧙', color: '#2c3e50' },
    { type: 'TREASURE', name: "Dragon's Hoard",      icon: '🐲', color: '#f1c40f', gold: [15,30] },
    { type: 'MONSTER',  name: 'Underground Cave',    icon: '🕳️', color: '#717d7e', monster: { name:'Troll',      hp:6, atk:3, reward:26, icon:'🧌' } },
    { type: 'EVENT',    name: 'Merchant Caravan',    icon: '🐪', color: '#8e44ad' },
    { type: 'TAVERN',   name: 'The Golden Goblet',   icon: '🏨', color: '#d35400' },
    { type: 'MONSTER',  name: 'Dark Fortress',       icon: '🏯', color: '#cb4335', monster: { name:'Dark Knight',hp:6, atk:3, reward:30, icon:'🦹' } },
    { type: 'CURSED',   name: 'Cursed Battlefield',  icon: '☠️', color: '#2c3e50' },
    { type: 'TREASURE', name: "Wizard's Tower",      icon: '🔮', color: '#f1c40f', gold: [12,25] },
    { type: 'QUEST',    name: 'Dragon Lair',         icon: '🐉', color: '#cb4335' },
    { type: 'MONSTER',  name: 'Shadow Realm',        icon: '🌑', color: '#1c2833', monster: { name:'Shadow Demon',hp:7, atk:4, reward:36, icon:'👁️' } },
    { type: 'EVENT',    name: 'Mystic Crossroads',   icon: '✨', color: '#8e44ad' },
    { type: 'TOWN',     name: "King's Gate",         icon: '👑', color: '#2980b9' },
    { type: 'CURSED',   name: "Realm's Edge",        icon: '🌀', color: '#2c3e50' },
  ];

  // ── Event cards ─────────────────────────────────────────────────────────────
  const EVENTS = [
    { name:'Ancient Map',      icon:'🗺️',  desc:'You find a treasure map!',              effect:'gold',   value: 15 },
    { name:'Divine Blessing',  icon:'✨',  desc:'A spirit heals your wounds.',            effect:'heal',   value: 4  },
    { name:'Tax Collector',    icon:'📜',  desc:"The king's men demand their share!",     effect:'gold',   value:-12 },
    { name:'Guild Contract',   icon:'📋',  desc:'Quick work for the Adventurers Guild.',  effect:'gold',   value: 20 },
    { name:'Cursed Artifact',  icon:'💀',  desc:'A relic drains your life force.',        effect:'hp',     value:-3  },
    { name:'Lucky Windfall',   icon:'🍀',  desc:'Fortune smiles upon you!',               effect:'gold',   value: 10 },
    { name:'Wandering Plague', icon:'🦠',  desc:'A plague weakens all heroes.',           effect:'hp_all', value:-2  },
    { name:'Hidden Cache',     icon:'🧭',  desc:'Your sharp eyes spot hidden riches.',    effect:'gold',   value: 8  },
    { name:'Rival Hero',       icon:'⚔️',  desc:'A rival picks your pocket!',            effect:'gold',   value:-8  },
    { name:'Mystic Portal',    icon:'🌀',  desc:'A portal whisks you 3 tiles forward!',  effect:'move',   value: 3  },
  ];

  // ── Helper: tile position on SVG circle ─────────────────────────────────────
  function tilePos(i) {
    const a = (2 * Math.PI * i / N) - Math.PI / 2;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  }

  function d6() { return Math.floor(Math.random() * 6) + 1; }

  const PCOLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

  // Animation state — survives between renders so we can diff and drive effects
  const _anim = { prevPos: {}, prevGold: {}, prevHp: {} };

  // ────────────────────────────────────────────────────────────────────────────
  return {
    name: "Realm's Edge",
    description: 'Fantasy adventure around the realm. Collect 100 gold to win!',
    icon: '🐉',
    minPlayers: 2,
    maxPlayers: 4,

    // ── Initial state ──────────────────────────────────────────────────────────
    createInitialState(players) {
      return {
        phase: 'CLASS_SELECT',
        classSelectIndex: 0,
        currentPlayer: players[0].id,
        players: players.map((p, i) => ({
          ...p,
          color: PCOLORS[i],
          position: 0,
          gold: 0,
          hp: 10, maxHp: 10,
          attack: 1,
          class: null, classIcon: '❓',
          mageRerollUsed: false,
        })),
        encounter: null,
        lastRoll: null,
        log: ["🐉 Realm's Edge begins! Each hero, choose your class…"],
        turnNumber: 1,
        winGold: WIN_GOLD,
      };
    },

    // ── Process action ─────────────────────────────────────────────────────────
    processAction(state, action) {
      if (state.phase === 'GAME_OVER') return { valid: false, reason: 'Game over' };
      const { type } = action;
      switch (type) {
        case 'SELECT_CLASS':   return this._selectClass(state, action);
        case 'ROLL_DICE':      return this._rollDice(state, action);
        case 'FIGHT':          return this._fight(state, action);
        case 'MAGE_REROLL':    return this._mageReroll(state, action);
        case 'FLEE':           return this._flee(state, action);
        case 'HEAL_FULL':      return this._tavernAct(state, action, 'full');
        case 'HEAL_PARTIAL':   return this._tavernAct(state, action, 'partial');
        case 'BUY_ATTACK':     return this._townBuy(state, action, 'attack');
        case 'BUY_HP':         return this._townBuy(state, action, 'hp');
        case 'LEAVE':          return this._leave(state, action);
        case 'ROLL_QUEST':     return this._rollQuest(state, action);
        default: return { valid: false, reason: `Unknown action: ${type}` };
      }
    },

    _p(state, id) { return state.players.find(p => p.id === id); },

    _log(state, msg) { state.log.push(msg); },

    _endTurn(state) {
      const alive = state.players;
      const idx = alive.findIndex(p => p.id === state.currentPlayer);
      const next = alive[(idx + 1) % alive.length];
      state.currentPlayer = next.id;
      state.phase = 'ROLL';
      state.encounter = null;
      next.mageRerollUsed = false;
      if (next.id === state.players[0].id) state.turnNumber++;
      return state;
    },

    // ── Class selection ────────────────────────────────────────────────────────
    _selectClass(state, { classKey }) {
      const p = state.players[state.classSelectIndex];
      if (!p) return { valid: false, reason: 'No player to select' };
      const cls = CLASSES[classKey];
      if (!cls) return { valid: false, reason: 'Invalid class' };

      p.class = classKey;
      p.classIcon = cls.icon;
      p.hp = cls.hp; p.maxHp = cls.hp;
      p.attack = cls.attack;

      this._log(state, `${cls.icon} ${p.name} chose ${cls.name}!`);
      state.classSelectIndex++;

      if (state.classSelectIndex >= state.players.length) {
        state.phase = 'ROLL';
        state.currentPlayer = state.players[0].id;
        this._log(state, '🗡️ All heroes chosen — the adventure begins!');
      } else {
        state.currentPlayer = state.players[state.classSelectIndex].id;
      }
      return { valid: true, newState: state };
    },

    // ── Roll dice & move ───────────────────────────────────────────────────────
    _rollDice(state, { playerId }) {
      if (state.phase !== 'ROLL') return { valid: false, reason: 'Not roll phase' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      const die1 = d6(), die2 = d6(), total = die1 + die2;
      state.lastRoll = { die1, die2, total };

      const oldPos = p.position;
      p.position = (p.position + total) % N;

      // Passed START bonus
      if (p.position < oldPos || oldPos + total >= N) {
        p.gold += 10;
        this._log(state, `🏰 ${p.name} lapped the board! +10 gold`);
      }

      const tile = BOARD[p.position];
      this._log(state, `${p.classIcon} ${p.name} rolls [${die1}+${die2}=${total}] → ${tile.icon} ${tile.name}`);

      return this._resolveTile(state, p, tile);
    },

    _resolveTile(state, p, tile) {
      switch (tile.type) {

        case 'START': {
          p.gold += 5;
          p.hp = Math.min(p.maxHp, p.hp + 3);
          this._log(state, `🏰 Village: +5 gold, +3 HP`);
          return { valid: true, newState: this._endTurn(state) };
        }

        case 'TREASURE': {
          const [lo, hi] = tile.gold;
          let g = lo + Math.floor(Math.random() * (hi - lo + 1));
          if (p.class === 'rogue') { g += 5; }
          p.gold += g;
          this._log(state, `💰 Treasure: +${g} gold!${p.class==='rogue' ? ' (Rogue bonus!)' : ''}`);
          return { valid: true, newState: this._endTurn(state) };
        }

        case 'MONSTER': {
          state.phase = 'COMBAT';
          state.encounter = { ...tile.monster, currentHp: tile.monster.hp, lastCombat: null };
          this._log(state, `⚔️ ${tile.monster.icon} ${tile.monster.name} attacks! Fight or flee?`);
          return { valid: true, newState: state };
        }

        case 'EVENT': {
          const card = EVENTS[Math.floor(Math.random() * EVENTS.length)];
          this._applyEvent(state, p, card);
          this._log(state, `${card.icon} ${card.name}: ${card.desc}`);
          return { valid: true, newState: this._endTurn(state) };
        }

        case 'TAVERN': {
          state.phase = 'TAVERN';
          this._log(state, `🍺 Welcome to the tavern!`);
          return { valid: true, newState: state };
        }

        case 'CURSED': {
          const r = d6();
          if (r <= 3) {
            const lost = 8 + d6() + d6();
            p.gold = Math.max(0, p.gold - lost);
            this._log(state, `☠️ Cursed! Lost ${lost} gold!`);
          } else {
            const lost = 2 + d6();
            p.hp = Math.max(1, p.hp - lost);
            this._log(state, `☠️ Cursed! Lost ${lost} HP!`);
          }
          return { valid: true, newState: this._endTurn(state) };
        }

        case 'QUEST': {
          state.phase = 'QUEST';
          const reward = 28 + d6() * 3;
          state.encounter = { target: 4, reward, penalty: 10 };
          this._log(state, `🗿 Ancient quest! Roll 4+ to earn ${reward} gold.`);
          return { valid: true, newState: state };
        }

        case 'TOWN': {
          state.phase = 'TOWN';
          this._log(state, `🏪 Welcome to the market!`);
          return { valid: true, newState: state };
        }

        default:
          return { valid: true, newState: this._endTurn(state) };
      }
    },

    _applyEvent(state, p, card) {
      switch (card.effect) {
        case 'gold':   p.gold = Math.max(0, p.gold + card.value); break;
        case 'heal':   p.hp = Math.min(p.maxHp, p.hp + card.value); break;
        case 'hp':     p.hp = Math.max(1, p.hp + card.value); break;
        case 'hp_all': state.players.forEach(pl => { pl.hp = Math.max(1, pl.hp + card.value); }); break;
        case 'move':   p.position = (p.position + card.value) % N; break;
      }
    },

    // ── Combat ─────────────────────────────────────────────────────────────────
    _fight(state, { playerId }) {
      if (state.phase !== 'COMBAT') return { valid: false, reason: 'Not in combat' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      const m = state.encounter;

      const pr = d6(), mr = d6();
      const pt = pr + p.attack, mt = mr + m.atk;
      state.encounter.lastCombat = { pr, mr, pt, mt };

      if (pt >= mt) {
        p.gold += m.reward;
        p.mageRerollUsed = false;
        this._log(state, `🏆 ${p.classIcon} ${p.name} [${pr}+${p.attack}=${pt}] defeats ${m.icon} ${m.name} [${mr}+${m.atk}=${mt}]! +${m.reward}g`);
        state.encounter = null;
        return { valid: true, newState: this._endTurn(state) };
      } else {
        const lost = 1 + d6() % 3;
        p.hp -= lost;
        this._log(state, `💔 ${p.classIcon} ${p.name} [${pr}+${p.attack}=${pt}] vs ${m.icon} ${m.name} [${mr}+${m.atk}=${mt}] — lost ${lost} HP`);
        if (p.hp <= 0) {
          p.hp = Math.ceil(p.maxHp / 2);
          p.position = 0;
          this._log(state, `😵 ${p.name} is defeated! Retreats to village with ${p.hp} HP.`);
          state.encounter = null;
          return { valid: true, newState: this._endTurn(state) };
        }
        return { valid: true, newState: state };
      }
    },

    _mageReroll(state, { playerId }) {
      if (state.phase !== 'COMBAT') return { valid: false, reason: 'Not in combat' };
      const p = this._p(state, playerId);
      if (p.class !== 'mage') return { valid: false, reason: 'Only mages can reroll' };
      if (p.mageRerollUsed) return { valid: false, reason: 'Reroll already used' };
      p.mageRerollUsed = true;
      this._log(state, `🔮 ${p.name} channels arcane power and rerolls!`);
      return this._fight(state, { playerId });
    },

    _flee(state, { playerId }) {
      if (state.phase !== 'COMBAT') return { valid: false, reason: 'Not in combat' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      const r = d6();
      const threshold = p.class === 'ranger' ? 3 : 4;

      if (r >= threshold) {
        this._log(state, `🏃 ${p.name} flees! [rolled ${r}]`);
        state.encounter = null;
        return { valid: true, newState: this._endTurn(state) };
      } else {
        const lost = d6() % 3 + 1;
        p.hp = Math.max(1, p.hp - lost);
        this._log(state, `💨 ${p.name} failed to flee [rolled ${r}]! -${lost} HP`);
        return { valid: true, newState: state };
      }
    },

    // ── Tavern ──────────────────────────────────────────────────────────────────
    _tavernAct(state, { playerId }, mode) {
      if (state.phase !== 'TAVERN') return { valid: false, reason: 'Not in tavern' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      if (mode === 'full') {
        if (p.gold < 10) return { valid: false, reason: 'Need 10 gold' };
        const healed = p.maxHp - p.hp;
        p.gold -= 10; p.hp = p.maxHp;
        this._log(state, `🍺 ${p.name} pays 10g for full rest. +${healed} HP`);
      } else {
        const healed = Math.min(3, p.maxHp - p.hp);
        p.hp = Math.min(p.maxHp, p.hp + 3);
        this._log(state, `🍺 ${p.name} rests briefly. +${healed} HP`);
      }
      return { valid: true, newState: this._endTurn(state) };
    },

    // ── Town ────────────────────────────────────────────────────────────────────
    _townBuy(state, { playerId }, item) {
      if (state.phase !== 'TOWN') return { valid: false, reason: 'Not in town' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      if (item === 'attack') {
        if (p.gold < 20) return { valid: false, reason: 'Need 20 gold' };
        p.gold -= 20; p.attack++;
        this._log(state, `🗡️ ${p.name} upgrades weapon! ATK now ${p.attack}`);
      } else {
        if (p.gold < 15) return { valid: false, reason: 'Need 15 gold' };
        p.gold -= 15; p.maxHp += 3; p.hp += 3;
        this._log(state, `🛡️ ${p.name} upgrades armor! Max HP now ${p.maxHp}`);
      }
      return { valid: true, newState: this._endTurn(state) };
    },

    _leave(state, { playerId }) {
      if (!['TAVERN','TOWN'].includes(state.phase)) return { valid: false, reason: 'Nothing to leave' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };
      const p = this._p(state, playerId);
      this._log(state, `${p.classIcon} ${p.name} continues the journey.`);
      return { valid: true, newState: this._endTurn(state) };
    },

    // ── Quest ───────────────────────────────────────────────────────────────────
    _rollQuest(state, { playerId }) {
      if (state.phase !== 'QUEST') return { valid: false, reason: 'Not in quest' };
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };

      const p = this._p(state, playerId);
      const q = state.encounter;
      const r = d6();

      if (r >= q.target) {
        p.gold += q.reward;
        this._log(state, `🗿 Quest success! [rolled ${r}] +${q.reward} gold!`);
      } else {
        p.gold = Math.max(0, p.gold - q.penalty);
        this._log(state, `🗿 Quest failed [rolled ${r}]. -${q.penalty} gold.`);
      }
      state.encounter = null;
      return { valid: true, newState: this._endTurn(state) };
    },

    // ── Win condition ────────────────────────────────────────────────────────────
    checkWinCondition(state) {
      if (state.phase === 'CLASS_SELECT') return null;
      return state.players.find(p => p.gold >= WIN_GOLD) || null;
    },

    // ════════════════════════════════════════════════════════════════════════════
    //  RENDERER
    // ════════════════════════════════════════════════════════════════════════════
    render(state, container, engine) {
      this._injectCSS();

      // Diff previous state to drive animations
      const posChanges = [], goldChanges = [], hpChanges = [];
      state.players.forEach(p => {
        if (_anim.prevPos[p.id]  !== undefined && _anim.prevPos[p.id]  !== p.position)
          posChanges.push({ player: p, from: _anim.prevPos[p.id] });
        if (_anim.prevGold[p.id] !== undefined && _anim.prevGold[p.id] !== p.gold)
          goldChanges.push({ player: p, diff: p.gold - _anim.prevGold[p.id] });
        if (_anim.prevHp[p.id]   !== undefined && _anim.prevHp[p.id]   !== p.hp)
          hpChanges.push({ player: p, diff: p.hp - _anim.prevHp[p.id] });
        _anim.prevPos[p.id]  = p.position;
        _anim.prevGold[p.id] = p.gold;
        _anim.prevHp[p.id]   = p.hp;
      });

      container.innerHTML = '';
      container.style.position = 'relative';
      const isMyTurn = engine.playerId === state.currentPlayer;
      const me  = state.players.find(p => p.id === engine.playerId);
      const cur = state.players.find(p => p.id === state.currentPlayer);

      const wrap = document.createElement('div');
      wrap.className = 're-wrap';
      wrap.innerHTML = `
        <div class="re-layout">
          <div class="re-board-col">${this._svgBoard(state, engine)}</div>
          <div class="re-side-col">
            ${this._renderPlayers(state, engine)}
            ${this._renderAction(state, engine, isMyTurn, me, cur)}
            ${this._renderLog(state)}
          </div>
        </div>
      `;
      container.appendChild(wrap);
      this._bindButtons(wrap, state, engine);

      // Fire animations after the DOM is painted
      setTimeout(() => {
        const svg = container.querySelector('svg');
        if (svg) posChanges.forEach(({ player, from }) =>
          this._animateToken(svg, player, from, player.position));
        goldChanges.forEach(({ player, diff }) =>
          this._floatText(container, player.position,
            diff > 0 ? `+${diff}g` : `${diff}g`, diff > 0 ? '#c9a227' : '#e74c3c'));
        hpChanges.forEach(({ player, diff }) => {
          if (diff !== 0)
            this._floatText(container, player.position,
              diff > 0 ? `+${diff} HP` : `${diff} HP`, diff > 0 ? '#27ae60' : '#e74c3c');
          if (diff < 0) {
            const card = container.querySelector(`[data-pid="${player.id}"]`);
            if (card) { card.classList.add('re-hp-flash'); setTimeout(() => card.classList.remove('re-hp-flash'), 700); }
          }
        });
      }, 0);

      if (state.phase === 'GAME_OVER') {
        const ov = document.createElement('div');
        ov.className = 'gameover-overlay';
        ov.innerHTML = `<div class="gameover-box"><div class="gameover-crown">👑</div>
          <h2>${state.winner?.classIcon} ${state.winner?.name}</h2>
          <p>Collected ${state.winner?.gold} gold and conquered the realm!</p></div>`;
        container.appendChild(ov);
      }
    },

    // ── CSS (injected once) ───────────────────────────────────────────────────────
    _injectCSS() {
      if (document.getElementById('re-anim-css')) return;
      const s = document.createElement('style');
      s.id = 're-anim-css';
      s.textContent = `
        @keyframes re-float { from{transform:translateY(0);opacity:1} to{transform:translateY(-60px);opacity:0} }
        @keyframes re-hp-flash { 0%,100%{box-shadow:none} 45%{box-shadow:0 0 16px #e74c3c,inset 0 0 10px #e74c3c55} }
        .re-float-txt { position:absolute;pointer-events:none;z-index:999;
          font-family:'Cinzel',serif;font-weight:bold;font-size:1rem;
          text-shadow:0 1px 5px #000a;animation:re-float 1.3s ease-out forwards; }
        .re-hp-flash  { animation:re-hp-flash 0.7s ease-out !important; }
        .re-btn { display:block;width:100%;padding:9px 14px;margin-bottom:7px;border:none;
          border-radius:6px;cursor:pointer;font-family:'Cinzel',serif;font-size:0.78rem;
          font-weight:600;letter-spacing:.04em;transition:filter .15s,transform .1s; }
        .re-btn:hover:not(:disabled)  { filter:brightness(1.25);transform:translateY(-2px); }
        .re-btn:active:not(:disabled) { transform:translateY(0); }
        .re-btn:disabled { opacity:.4;cursor:not-allowed; }
        .re-btn.pri    { background:linear-gradient(135deg,#b8860b,#d4a820);color:#1a1208; }
        .re-btn.danger { background:linear-gradient(135deg,#922b21,#e74c3c);color:#fff; }
        .re-btn.sec    { background:linear-gradient(135deg,#1a3a2a,#2a5a3a);color:#7ec8a0;border:1px solid #2a5a3a; }
        .re-btn.ghost  { background:transparent;color:var(--text-dim);border:1px solid #3d2e18; }
        .re-btn.magic  { background:linear-gradient(135deg,#1a0a2a,#2a6090);color:#a0c8ff;border:1px solid #3498db55; }
        .re-class-btn  { background:#1a1208;border:1px solid #3d2e18;border-radius:8px;padding:10px 8px;
          cursor:pointer;color:#e8d5a3;transition:all .2s;text-align:center;min-width:80px; }
        .re-class-btn:hover { border-color:#c9a227;background:#2a1e08;transform:translateY(-3px);
          box-shadow:0 5px 14px #c9a22755; }
        .re-barfill { transition: width 0.5s ease; }
      `;
      document.head.appendChild(s);
    },

    // ── Token move animation (step-by-step along the ring) ───────────────────────
    _animateToken(svg, player, fromPos, toPos) {
      const steps = [];
      let p = fromPos;
      while (p !== toPos) { p = (p + 1) % N; steps.push(tilePos(p)); }
      if (!steps.length) return;

      const startPt = tilePos(fromPos);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = `
        <circle r="11" fill="${player.color}" stroke="white" stroke-width="2.5"/>
        <text y="4" text-anchor="middle" font-size="9" fill="white"
          font-family="Cinzel,serif" font-weight="bold">${player.name[0]}</text>`;
      g.style.cssText = `
        transform: translate(${startPt.x}px, ${startPt.y + 24}px);
        filter: drop-shadow(0 0 8px ${player.color});
        transition: transform 75ms linear;
        will-change: transform;`;
      svg.appendChild(g);
      void g.getBoundingClientRect(); // flush layout so first transition fires

      let idx = 0;
      const nextStep = () => {
        if (idx >= steps.length) { setTimeout(() => g.remove(), 90); return; }
        const pt = steps[idx++];
        g.style.transform = `translate(${pt.x}px, ${pt.y + 24}px)`;
        setTimeout(nextStep, 82);
      };
      setTimeout(nextStep, 0);
    },

    // ── Floating feedback text ────────────────────────────────────────────────────
    _floatText(container, tileIdx, text, color) {
      const svg = container.querySelector('svg');
      if (!svg) return;
      const pt  = tilePos(tileIdx);
      const sr  = svg.getBoundingClientRect();
      const cr  = container.getBoundingClientRect();
      const vb  = svg.viewBox.baseVal;
      const el  = document.createElement('div');
      el.className  = 're-float-txt';
      el.textContent = text;
      el.style.color = color || '#c9a227';
      el.style.left  = (sr.left - cr.left + pt.x * (sr.width  / vb.width)  - 20) + 'px';
      el.style.top   = (sr.top  - cr.top  + pt.y * (sr.height / vb.height) - 32) + 'px';
      container.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    },

    // ── SVG Board ────────────────────────────────────────────────────────────────
    _svgBoard(state, engine) {
      const W = SVG_W, H = SVG_H;
      const positions = Array.from({ length: N }, (_, i) => tilePos(i));
      const byPos = {};
      state.players.forEach(p => { (byPos[p.position] = byPos[p.position] || []).push(p); });

      const pathPts = positions.map((pos, i) => `${i ? 'L' : 'M'}${pos.x} ${pos.y}`).join(' ') + 'Z';
      const sz = 44;

      const tiles = positions.map((pos, i) => {
        const tile = BOARD[i];
        const players = byPos[i] || [];
        const isActiveTile = players.some(p => p.id === state.currentPlayer);

        const tokens = players.map((p, pi) => {
          const ox = (pi - (players.length - 1) / 2) * 17;
          return `
            <circle cx="${pos.x+ox}" cy="${pos.y+26}" r="9" fill="${p.color}"
              stroke="white" stroke-width="1.5" style="filter:drop-shadow(0 0 4px ${p.color})"/>
            <text x="${pos.x+ox}" y="${pos.y+30}" text-anchor="middle"
              font-size="8.5" fill="white" font-family="Cinzel,serif" font-weight="bold">${p.name[0]}</text>`;
        }).join('');

        const glow = isActiveTile ? `
          <circle cx="${pos.x}" cy="${pos.y}" r="${sz/2+10}" fill="none"
            stroke="#f0c040" stroke-width="2" stroke-dasharray="5,3" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate"
              from="0 ${pos.x} ${pos.y}" to="360 ${pos.x} ${pos.y}" dur="7s" repeatCount="indefinite"/>
          </circle>` : '';

        return `<g class="re-tile">
          ${glow}
          <rect x="${pos.x-sz/2}" y="${pos.y-sz/2}" width="${sz}" height="${sz}" rx="9"
            fill="${tile.color}22" stroke="${tile.color}" stroke-width="${i===0?2.8:1.8}"/>
          <text x="${pos.x}" y="${pos.y+8}" text-anchor="middle" font-size="20">${tile.icon}</text>
          ${tokens}
        </g>`;
      }).join('');

      const center = this._svgCenter(state, W, H);

      return `<div class="re-board-svg-wrap"><svg viewBox="0 0 ${W} ${H}"
        xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:660px">
        <defs>
          <radialGradient id="reBg" cx="50%" cy="50%">
            <stop offset="0%"   stop-color="#143d25" stop-opacity="0.97"/>
            <stop offset="100%" stop-color="#081a10"/>
          </radialGradient>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#reBg)" rx="16"/>
        <path d="${pathPts}" fill="none" stroke="#2a4a30" stroke-width="3" stroke-dasharray="8,5"/>
        ${tiles}${center}
      </svg></div>`;
    },

    _svgCenter(state, W, H) {
      const x = CX, y = CY - 10;
      const bw = 270, bh = 200;
      const bx = x - bw/2, by = y - bh/2;
      let inner = '';

      if (state.phase === 'CLASS_SELECT') {
        const selName = state.players[state.classSelectIndex]?.name || '';
        inner = `
          <text x="${x}" y="${by+32}" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#c9a227">Choose Your Hero</text>
          <text x="${x}" y="${by+56}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">${selName}'s turn to pick</text>
          <text x="${x}" y="${y+16}" text-anchor="middle" font-size="36">⚔️🗡️🔮🏹</text>`;
      } else if (state.phase === 'COMBAT' && state.encounter) {
        const m = state.encounter, lc = m.lastCombat;
        inner = `
          <text x="${x}" y="${by+30}" text-anchor="middle" font-family="Cinzel,serif" font-size="13" fill="#e74c3c">⚔ COMBAT</text>
          <text x="${x}" y="${by+60}" text-anchor="middle" font-size="34">${m.icon}</text>
          <text x="${x}" y="${by+92}" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#e8d5a3">${m.name}</text>
          <text x="${x}" y="${by+112}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">HP ${m.hp} · ATK ${m.atk} · ${m.reward}g</text>
          ${lc ? `<text x="${x}" y="${by+140}" text-anchor="middle" font-family="Cinzel,serif" font-size="13" fill="${lc.pt>=lc.mt?'#27ae60':'#e74c3c'}">You ${lc.pt} vs ${lc.mt} ${lc.pt>=lc.mt?'✓ Win':'✗ Hit'}</text>` : ''}`;
      } else if (state.phase === 'ROLL' && state.lastRoll) {
        const r = state.lastRoll;
        inner = `
          <text x="${x}" y="${by+30}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">LAST ROLL</text>
          <text x="${x-28}" y="${y+12}" text-anchor="middle" font-size="30">🎲</text>
          <text x="${x+28}" y="${y+12}" text-anchor="middle" font-size="30">🎲</text>
          <text x="${x-28}" y="${y+40}" text-anchor="middle" font-family="Cinzel,serif" font-size="24" fill="#f0c040" font-weight="bold">${r.die1}</text>
          <text x="${x+28}" y="${y+40}" text-anchor="middle" font-family="Cinzel,serif" font-size="24" fill="#f0c040" font-weight="bold">${r.die2}</text>
          <text x="${x}" y="${y+64}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">= ${r.total} steps</text>`;
      } else if (state.phase === 'TAVERN') {
        inner = `
          <text x="${x}" y="${by+40}" text-anchor="middle" font-size="34">🍺</text>
          <text x="${x}" y="${by+78}" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#c9a227">Tavern</text>
          <text x="${x}" y="${by+100}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">Rest and recover</text>`;
      } else if (state.phase === 'TOWN') {
        inner = `
          <text x="${x}" y="${by+40}" text-anchor="middle" font-size="34">🏪</text>
          <text x="${x}" y="${by+78}" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#c9a227">Market</text>
          <text x="${x}" y="${by+100}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#7a6218">Buy upgrades</text>`;
      } else if (state.phase === 'QUEST' && state.encounter) {
        inner = `
          <text x="${x}" y="${by+40}" text-anchor="middle" font-size="32">🗿</text>
          <text x="${x}" y="${by+76}" text-anchor="middle" font-family="Cinzel,serif" font-size="13" fill="#c9a227">Ancient Quest</text>
          <text x="${x}" y="${by+100}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#27ae60">Win: +${state.encounter.reward}g (roll 4+)</text>
          <text x="${x}" y="${by+122}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#e74c3c">Fail: -${state.encounter.penalty}g</text>`;
      } else {
        inner = `
          <text x="${x}" y="${y-6}" text-anchor="middle" font-size="42">🐉</text>
          <text x="${x}" y="${y+34}" text-anchor="middle" font-family="Cinzel,serif" font-size="15" fill="#c9a227" letter-spacing="2">REALM'S EDGE</text>
          <text x="${x}" y="${y+56}" text-anchor="middle" font-family="Cinzel,serif" font-size="10" fill="#5a4a30">First to ${WIN_GOLD} gold wins</text>`;
      }

      return `<g>
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14"
          fill="#1a1208ee" stroke="#3d2e18" stroke-width="1.5"/>
        ${inner}
      </g>`;
    },

    // ── Player cards ─────────────────────────────────────────────────────────────
    _renderPlayers(state, engine) {
      return `<div class="re-players">
        ${state.players.map(p => {
          const isMe  = p.id === engine.playerId;
          const isCur = p.id === state.currentPlayer;
          const hpPct = Math.round((p.hp / p.maxHp) * 100);
          const gPct  = Math.min(100, Math.round((p.gold / WIN_GOLD) * 100));
          const hpCol = hpPct > 50 ? '#27ae60' : hpPct > 25 ? '#f39c12' : '#e74c3c';
          return `<div class="re-pcard ${isCur?'cur':''}" data-pid="${p.id}"
              style="border-color:${p.color}${isCur?'':'55'}">
            <div class="re-pcard-head">
              <span class="re-icon">${p.classIcon||'❓'}</span>
              <span style="color:${p.color};font-family:'Cinzel',serif;font-size:0.82rem;font-weight:600">
                ${p.name}${isMe?' (you)':''}</span>
              ${isCur?`<span class="re-live-dot" style="background:${p.color}"></span>`:''}
            </div>
            <div class="re-pclass">${p.class ? CLASSES[p.class]?.name : 'Choosing…'}</div>
            <div class="re-bar-row">
              <span class="re-bl">❤️</span>
              <div class="re-barbg"><div class="re-barfill" style="width:${hpPct}%;background:${hpCol}"></div></div>
              <span class="re-bv">${p.hp}/${p.maxHp}</span>
            </div>
            <div class="re-bar-row">
              <span class="re-bl">💰</span>
              <div class="re-barbg"><div class="re-barfill" style="width:${gPct}%;background:#c9a227"></div></div>
              <span class="re-bv">${p.gold}/${WIN_GOLD}</span>
            </div>
            <div class="re-pmini">⚔ ${p.attack} &nbsp;·&nbsp; 📍 Tile ${p.position}</div>
          </div>`;
        }).join('')}
      </div>`;
    },

    // ── Action panel ─────────────────────────────────────────────────────────────
    _renderAction(state, engine, isMyTurn, me, cur) {
      if (state.phase === 'CLASS_SELECT') {
        const pickingMe = state.players[state.classSelectIndex]?.id === engine.playerId;
        if (!pickingMe) return `<div class="re-actions"><p class="re-wait">⏳ Waiting for ${state.players[state.classSelectIndex]?.name} to choose…</p></div>`;
        return `<div class="re-actions">
          <h3>Choose Your Class</h3>
          <div class="re-class-grid">
            ${Object.entries(CLASSES).map(([k, c]) => `
              <button class="re-class-btn" data-action="SELECT_CLASS" data-class="${k}">
                <div style="font-size:1.6rem">${c.icon}</div>
                <div style="font-family:'Cinzel',serif;font-size:0.75rem;color:#c9a227;margin:3px 0">${c.name}</div>
                <div style="font-size:0.68rem;color:#7a6218">${c.special}</div>
              </button>`).join('')}
          </div>
        </div>`;
      }

      if (!isMyTurn) return `<div class="re-actions"><p class="re-wait">⏳ ${cur?.name}'s turn…</p></div>`;

      switch (state.phase) {
        case 'ROLL':
          return `<div class="re-actions"><h3>Your Turn</h3>
            <button class="re-btn pri" data-action="ROLL_DICE">🎲 Roll the Dice</button></div>`;
        case 'COMBAT': {
          const canReroll = me?.class === 'mage' && !me?.mageRerollUsed;
          return `<div class="re-actions">
            <h3>⚔️ Combat</h3>
            <button class="re-btn danger" data-action="FIGHT">⚔️ Fight!</button>
            ${canReroll ? `<button class="re-btn magic" data-action="MAGE_REROLL">🔮 Arcane Reroll</button>` : ''}
            <button class="re-btn sec" data-action="FLEE">🏃 Flee ${me?.class==='ranger'?'(3+)':'(4+)'}</button>
          </div>`;
        }
        case 'TAVERN': {
          const canFull = me?.gold >= 10;
          return `<div class="re-actions">
            <h3>🍺 Tavern</h3>
            <button class="re-btn pri" data-action="HEAL_FULL" ${!canFull?'disabled':''}>Full Rest (10g) — ${me?.maxHp} HP${!canFull?' ✗':''}</button>
            <button class="re-btn sec" data-action="HEAL_PARTIAL">Free Rest (+3 HP)</button>
            <button class="re-btn ghost" data-action="LEAVE">Continue →</button>
          </div>`;
        }
        case 'TOWN': {
          const canA = me?.gold >= 20, canH = me?.gold >= 15;
          return `<div class="re-actions">
            <h3>🏪 Market</h3>
            <button class="re-btn pri" data-action="BUY_ATTACK" ${!canA?'disabled':''}>🗡️ Upgrade Weapon (20g) +1 ATK${!canA?' ✗':''}</button>
            <button class="re-btn pri" data-action="BUY_HP" ${!canH?'disabled':''}>🛡️ Better Armor (15g) +3 MaxHP${!canH?' ✗':''}</button>
            <button class="re-btn ghost" data-action="LEAVE">Continue →</button>
          </div>`;
        }
        case 'QUEST':
          return `<div class="re-actions">
            <h3>🗿 Ancient Quest</h3>
            <p style="font-size:0.82rem;color:var(--text-dim);margin-bottom:10px">Roll a d6. Need 4+ to claim the reward!</p>
            <button class="re-btn danger" data-action="ROLL_QUEST">🎲 Accept the Quest</button>
          </div>`;
        default:
          return `<div class="re-actions"><p class="re-wait">…</p></div>`;
      }
    },

    // ── Game log ─────────────────────────────────────────────────────────────────
    _renderLog(state) {
      return `<div class="re-log">
        <div class="re-log-hd">📜 Chronicle</div>
        ${(state.log || []).slice(-8).reverse().map(l => `<div class="re-log-ln">${l}</div>`).join('')}
      </div>`;
    },

    // ── Button bindings ──────────────────────────────────────────────────────────
    _bindButtons(wrap, state, engine) {
      wrap.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.action, ck = btn.dataset.class;
          if (t === 'SELECT_CLASS') engine.submitAction({ type: t, classKey: ck });
          else engine.submitAction({ type: t });
        });
      });
    }
  };

})();

window.GAMES = window.GAMES || {};
window.GAMES['realms-edge'] = RealmsEdge;

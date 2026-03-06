/**
 * Territory Wars — Demo game for the BoardGameEngine
 * A simplified Risk-inspired territory control game.
 * 
 * Mechanics: Map control, Dice rolls, Resource management (armies)
 * Players: 2–4
 * Win: Control all territories
 */

const TerritoryWars = (() => {

  // ── Map Definition ────────────────────────────────────────────────────────

  const TERRITORIES = [
    { id: 'north',     name: 'North Peak',    x: 340, y: 80,  neighbors: ['west', 'east', 'center'] },
    { id: 'west',      name: 'West Vale',     x: 120, y: 220, neighbors: ['north', 'center', 'southwest'] },
    { id: 'east',      name: 'East Ridge',    x: 560, y: 220, neighbors: ['north', 'center', 'southeast'] },
    { id: 'center',    name: 'Heartland',     x: 340, y: 260, neighbors: ['north', 'west', 'east', 'southwest', 'southeast'] },
    { id: 'southwest', name: 'South-West Bay',x: 150, y: 400, neighbors: ['west', 'center', 'south'] },
    { id: 'southeast', name: 'South-East Mts',x: 530, y: 400, neighbors: ['east', 'center', 'south'] },
    { id: 'south',     name: 'Southern Isle', x: 340, y: 480, neighbors: ['southwest', 'southeast'] },
  ];

  const TERRITORY_MAP = Object.fromEntries(TERRITORIES.map(t => [t.id, t]));

  const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
  const PLAYER_COLORS_LIGHT = ['#ff8a80', '#80d8ff', '#b9f6ca', '#ffe082'];

  // ── Game API ──────────────────────────────────────────────────────────────

  return {
    name: 'Territory Wars',
    description: 'Conquer all territories to win. Attack neighbors with dice rolls!',
    minPlayers: 2,
    maxPlayers: 4,
    icon: '⚔️',

    // ── Initial State ───────────────────────────────────────────────────────

    createInitialState(players) {
      // Distribute territories evenly
      const territories = {};
      const shuffled = [...TERRITORIES].sort(() => Math.random() - 0.5);

      players.forEach((p, i) => {
        territories; // init below
      });

      shuffled.forEach((t, i) => {
        const playerIndex = i % players.length;
        territories[t.id] = {
          owner: players[playerIndex].id,
          armies: 2
        };
      });

      // Give each player starting armies bonus based on territories
      const playerArmies = {};
      players.forEach(p => {
        const owned = Object.values(territories).filter(t => t.owner === p.id).length;
        playerArmies[p.id] = owned + 2; // bonus armies to place
      });

      return {
        phase: 'REINFORCE', // REINFORCE → ATTACK → FORTIFY → (next player REINFORCE)
        turn: 0,
        currentPlayer: players[0].id,
        players: players.map((p, i) => ({
          ...p,
          color: PLAYER_COLORS[i],
          colorLight: PLAYER_COLORS_LIGHT[i],
          alive: true,
          armiesToPlace: playerArmies[p.id]
        })),
        territories,
        selectedTerritory: null,
        attackSource: null,
        lastDiceRoll: null,
        log: ['⚔️ Territory Wars begins!'],
        turnNumber: 1
      };
    },

    // ── Process Action ──────────────────────────────────────────────────────

    processAction(state, action) {
      const { type, playerId } = action;

      if (state.phase === 'GAME_OVER') {
        return { valid: false, newState: state, reason: 'Game is over' };
      }

      if (playerId !== state.currentPlayer && type !== 'SELECT_TERRITORY') {
        return { valid: false, newState: state, reason: 'Not your turn' };
      }

      switch (type) {
        case 'PLACE_ARMY': return this._placeArmy(state, action);
        case 'SELECT_TERRITORY': return this._selectTerritory(state, action);
        case 'ATTACK': return this._attack(state, action);
        case 'END_ATTACK': return this._endPhase(state, action, 'FORTIFY');
        case 'FORTIFY': return this._fortify(state, action);
        case 'END_TURN': return this._endTurn(state, action);
        default:
          return { valid: false, newState: state, reason: `Unknown action: ${type}` };
      }
    },

    _placeArmy(state, { playerId, territoryId }) {
      const player = state.players.find(p => p.id === playerId);
      if (state.phase !== 'REINFORCE') return { valid: false, reason: 'Not reinforce phase' };
      if (!player || player.armiesToPlace <= 0) return { valid: false, reason: 'No armies to place' };
      if (state.territories[territoryId]?.owner !== playerId) return { valid: false, reason: 'Not your territory' };

      state.territories[territoryId].armies++;
      player.armiesToPlace--;

      const log = `${player.name} reinforces ${TERRITORY_MAP[territoryId].name}`;
      if (player.armiesToPlace === 0) state.phase = 'ATTACK';

      return { valid: true, newState: state, log };
    },

    _selectTerritory(state, { playerId, territoryId }) {
      state.selectedTerritory = territoryId;
      if (state.phase === 'ATTACK' && state.territories[territoryId]?.owner === playerId) {
        state.attackSource = territoryId;
      }
      return { valid: true, newState: state };
    },

    _attack(state, { playerId, fromId, toId }) {
      if (state.phase !== 'ATTACK') return { valid: false, reason: 'Not attack phase' };
      
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const fromInfo = TERRITORY_MAP[fromId];
      const toInfo = TERRITORY_MAP[toId];

      if (!from || !to) return { valid: false, reason: 'Invalid territory' };
      if (from.owner !== playerId) return { valid: false, reason: 'Not your territory' };
      if (to.owner === playerId) return { valid: false, reason: 'Cannot attack yourself' };
      if (!fromInfo.neighbors.includes(toId)) return { valid: false, reason: 'Not a neighbor' };
      if (from.armies < 2) return { valid: false, reason: 'Need at least 2 armies to attack' };

      // Roll dice: attacker up to 3, defender up to 2
      const atkCount = Math.min(from.armies - 1, 3);
      const defCount = Math.min(to.armies, 2);
      const atkDice = Array.from({ length: atkCount }, () => Math.floor(Math.random() * 6) + 1).sort((a,b) => b-a);
      const defDice = Array.from({ length: defCount }, () => Math.floor(Math.random() * 6) + 1).sort((a,b) => b-a);

      let atkLoss = 0, defLoss = 0;
      const pairs = Math.min(atkDice.length, defDice.length);
      for (let i = 0; i < pairs; i++) {
        if (atkDice[i] > defDice[i]) defLoss++;
        else atkLoss++;
      }

      from.armies -= atkLoss;
      to.armies -= defLoss;

      const attacker = state.players.find(p => p.id === playerId);
      const defender = state.players.find(p => p.id === to.owner);

      let log = `${attacker.name} attacks ${toInfo.name} from ${fromInfo.name}! `;
      log += `🎲 Atk [${atkDice.join(',')}] vs Def [${defDice.join(',')}] — `;

      let conquered = false;
      if (to.armies <= 0) {
        // Territory captured!
        to.owner = playerId;
        to.armies = atkCount - atkLoss;
        from.armies -= (atkCount - atkLoss);
        if (from.armies < 1) from.armies = 1;
        to.armies = Math.max(to.armies, 1);
        log += `${attacker.name} captures ${toInfo.name}!`;
        conquered = true;

        // Check if defender is eliminated
        const defTerritories = Object.values(state.territories).filter(t => t.owner === defender?.id);
        if (defender && defTerritories.length === 0) {
          defender.alive = false;
          log += ` ${defender.name} is eliminated!`;
        }
      } else {
        log += `Atk loses ${atkLoss}, Def loses ${defLoss}`;
      }

      state.lastDiceRoll = { atkDice, defDice, atkLoss, defLoss, conquered };
      state.selectedTerritory = null;
      state.attackSource = null;

      return { valid: true, newState: state, log };
    },

    _endPhase(state, { playerId }, nextPhase) {
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };
      state.phase = nextPhase;
      state.selectedTerritory = null;
      state.attackSource = null;
      return { valid: true, newState: state, log: `${state.players.find(p=>p.id===playerId)?.name} moves to ${nextPhase} phase` };
    },

    _fortify(state, { playerId, fromId, toId, armies }) {
      if (state.phase !== 'FORTIFY') return { valid: false, reason: 'Not fortify phase' };
      const from = state.territories[fromId];
      const to = state.territories[toId];
      if (from?.owner !== playerId || to?.owner !== playerId) return { valid: false, reason: 'Both must be yours' };
      if (from.armies <= armies) return { valid: false, reason: 'Not enough armies' };
      if (!TERRITORY_MAP[fromId].neighbors.includes(toId)) return { valid: false, reason: 'Must be neighbors' };

      from.armies -= armies;
      to.armies += armies;
      const player = state.players.find(p => p.id === playerId);
      return { 
        valid: true, 
        newState: state, 
        log: `${player.name} fortifies ${TERRITORY_MAP[toId].name} with ${armies} armies`
      };
    },

    _endTurn(state, { playerId }) {
      if (state.currentPlayer !== playerId) return { valid: false, reason: 'Not your turn' };
      
      // Find next alive player
      const alivePlayers = state.players.filter(p => p.alive);
      const currentIdx = alivePlayers.findIndex(p => p.id === playerId);
      const nextPlayer = alivePlayers[(currentIdx + 1) % alivePlayers.length];
      
      // Calculate reinforcements for next player
      const owned = Object.values(state.territories).filter(t => t.owner === nextPlayer.id).length;
      nextPlayer.armiesToPlace = Math.max(3, Math.floor(owned / 3));

      state.currentPlayer = nextPlayer.id;
      state.phase = 'REINFORCE';
      state.turn++;
      if (nextPlayer.id === state.players[0].id) state.turnNumber++;
      state.lastDiceRoll = null;
      state.selectedTerritory = null;
      state.attackSource = null;

      return { 
        valid: true, 
        newState: state, 
        log: `🔄 ${nextPlayer.name}'s turn — place ${nextPlayer.armiesToPlace} armies`
      };
    },

    // ── Win Condition ───────────────────────────────────────────────────────

    checkWinCondition(state) {
      const alive = state.players.filter(p => p.alive);
      if (alive.length === 1) return alive[0];

      const owners = new Set(Object.values(state.territories).map(t => t.owner));
      if (owners.size === 1) {
        return state.players.find(p => p.id === [...owners][0]);
      }
      return null;
    },

    // ── Render ──────────────────────────────────────────────────────────────

    render(state, container, engine) {
      container.innerHTML = '';

      const currentPlayer = state.players.find(p => p.id === state.currentPlayer);
      const myPlayer = state.players.find(p => p.id === engine.playerId);
      const isMyTurn = engine.playerId === state.currentPlayer;

      // ── Layout
      const wrap = document.createElement('div');
      wrap.className = 'game-wrap';
      wrap.innerHTML = `
        <div class="game-top-bar">
          <div class="turn-info">
            <span class="turn-badge" style="background:${currentPlayer?.color}20; border-color:${currentPlayer?.color}; color:${currentPlayer?.color}">
              ${isMyTurn ? '⭐ YOUR TURN' : `${currentPlayer?.name}'s Turn`}
            </span>
            <span class="phase-badge">${state.phase.replace('_', ' ')}</span>
            ${myPlayer?.armiesToPlace > 0 && isMyTurn ? `<span class="armies-badge">Place ${myPlayer.armiesToPlace} armies</span>` : ''}
          </div>
          <div class="player-list-mini">
            ${state.players.map(p => `
              <div class="player-chip ${p.alive ? '' : 'dead'}" style="border-color:${p.color}; color:${p.color}">
                <span class="chip-dot" style="background:${p.color}"></span>
                ${p.name}
                <span class="chip-count">${Object.values(state.territories).filter(t=>t.owner===p.id).length}🏰</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="game-main">
          <div class="map-container">
            <svg id="game-map" viewBox="0 0 680 560" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
              </defs>
              <!-- Edges -->
              ${TERRITORIES.flatMap(t =>
                t.neighbors.filter(n => n > t.id).map(n => {
                  const nt = TERRITORY_MAP[n];
                  return `<line x1="${t.x}" y1="${t.y}" x2="${nt.x}" y2="${nt.y}" class="map-edge"/>`;
                })
              ).join('')}
              <!-- Territories -->
              ${TERRITORIES.map(t => {
                const terr = state.territories[t.id];
                const owner = state.players.find(p => p.id === terr?.owner);
                const isSelected = state.selectedTerritory === t.id;
                const isSource = state.attackSource === t.id;
                const canAttack = state.phase === 'ATTACK' && isMyTurn && isSource && owner?.id !== engine.playerId;
                const isNeighborOfSource = state.attackSource && TERRITORY_MAP[state.attackSource]?.neighbors.includes(t.id) && terr?.owner !== engine.playerId;

                return `
                  <g class="territory ${isSelected ? 'selected' : ''} ${isNeighborOfSource ? 'attackable' : ''}" 
                     data-id="${t.id}" 
                     style="cursor:pointer">
                    <circle cx="${t.x}" cy="${t.y}" r="38" 
                      fill="${owner ? owner.color + '33' : '#333'}" 
                      stroke="${owner ? owner.color : '#555'}" 
                      stroke-width="${isSelected || isSource ? 3.5 : 1.5}"
                      filter="${isSelected ? 'url(#glow)' : ''}"
                    />
                    ${isNeighborOfSource ? `<circle cx="${t.x}" cy="${t.y}" r="40" fill="none" stroke="#ff4444" stroke-width="2" stroke-dasharray="5,3" opacity="0.8"/>` : ''}
                    <text x="${t.x}" y="${t.y - 10}" text-anchor="middle" class="terr-name">${t.name.split(' ').map((w,i)=> `<tspan x="${t.x}" dy="${i===0?0:13}">${w}</tspan>`).join('')}</text>
                    <text x="${t.x}" y="${t.y + 20}" text-anchor="middle" class="terr-armies">⚔ ${terr?.armies || 0}</text>
                  </g>
                `;
              }).join('')}
            </svg>
          </div>

          <div class="side-panel">
            ${this._renderControls(state, engine, isMyTurn, myPlayer)}
            ${this._renderDiceResult(state)}
            ${this._renderLog(state)}
          </div>
        </div>
      `;

      container.appendChild(wrap);

      // ── Click handlers
      wrap.querySelectorAll('.territory').forEach(el => {
        el.addEventListener('click', () => {
          const tid = el.dataset.id;
          const terr = state.territories[tid];

          if (!isMyTurn) return;

          if (state.phase === 'REINFORCE') {
            if (terr.owner === engine.playerId && myPlayer.armiesToPlace > 0) {
              engine.submitAction({ type: 'PLACE_ARMY', territoryId: tid });
            }
          } else if (state.phase === 'ATTACK') {
            if (terr.owner === engine.playerId && terr.armies > 1) {
              engine.submitAction({ type: 'SELECT_TERRITORY', territoryId: tid });
            } else if (state.attackSource && TERRITORY_MAP[state.attackSource].neighbors.includes(tid) && terr.owner !== engine.playerId) {
              engine.submitAction({ type: 'ATTACK', fromId: state.attackSource, toId: tid });
            }
          } else if (state.phase === 'FORTIFY') {
            if (!state.selectedTerritory && terr.owner === engine.playerId && terr.armies > 1) {
              engine.submitAction({ type: 'SELECT_TERRITORY', territoryId: tid });
            } else if (state.selectedTerritory && terr.owner === engine.playerId && tid !== state.selectedTerritory) {
              engine.submitAction({ type: 'FORTIFY', fromId: state.selectedTerritory, toId: tid, armies: 1 });
            }
          }
        });
      });

      // Control buttons
      wrap.querySelector('#btn-end-attack')?.addEventListener('click', () => {
        engine.submitAction({ type: 'END_ATTACK' });
      });
      wrap.querySelector('#btn-end-turn')?.addEventListener('click', () => {
        engine.submitAction({ type: 'END_TURN' });
      });

      // GAME OVER
      if (state.phase === 'GAME_OVER') {
        const overlay = document.createElement('div');
        overlay.className = 'gameover-overlay';
        overlay.innerHTML = `
          <div class="gameover-box">
            <div class="gameover-crown">👑</div>
            <h2>${state.winner?.name}</h2>
            <p>Conquers all of Territory Wars!</p>
          </div>
        `;
        container.appendChild(overlay);
      }
    },

    _renderControls(state, engine, isMyTurn, myPlayer) {
      if (!isMyTurn) return `<div class="controls-panel"><p class="waiting-text">⏳ Waiting for opponent…</p></div>`;

      let html = `<div class="controls-panel"><h3>Your Turn</h3>`;

      if (state.phase === 'REINFORCE') {
        html += `<p class="hint">Click your territories to place ${myPlayer?.armiesToPlace} armies</p>`;
      } else if (state.phase === 'ATTACK') {
        html += `<p class="hint">Click your territory (2+ armies) to select attacker, then click enemy neighbor</p>`;
        html += `<button id="btn-end-attack" class="ctrl-btn secondary">End Attacks →</button>`;
      } else if (state.phase === 'FORTIFY') {
        html += `<p class="hint">Move armies between two neighboring territories (optional)</p>`;
        html += `<button id="btn-end-turn" class="ctrl-btn primary">End Turn →</button>`;
      }

      html += `</div>`;
      return html;
    },

    _renderDiceResult(state) {
      if (!state.lastDiceRoll) return '';
      const { atkDice, defDice, atkLoss, defLoss, conquered } = state.lastDiceRoll;
      return `
        <div class="dice-result">
          <div class="dice-row"><span class="dice-label">⚔ Atk</span>${atkDice.map(d => `<span class="die atk">${d}</span>`).join('')}</div>
          <div class="dice-row"><span class="dice-label">🛡 Def</span>${defDice.map(d => `<span class="die def">${d}</span>`).join('')}</div>
          <div class="dice-outcome">${conquered ? '🏳 Territory Captured!' : `Atk -${atkLoss} | Def -${defLoss}`}</div>
        </div>
      `;
    },

    _renderLog(state) {
      const recent = (state.log || []).slice(-6).reverse();
      return `
        <div class="game-log">
          <h4>Game Log</h4>
          ${recent.map(l => `<div class="log-line">${l}</div>`).join('')}
        </div>
      `;
    }
  };
})();

window.GAMES = window.GAMES || {};
window.GAMES['territory-wars'] = TerritoryWars;

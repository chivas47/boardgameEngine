/**
 * BoardGameEngine — Generic Multiplayer Board Game Engine
 * Works with any game that follows the Game Definition API.
 * State is managed by the host; guests send actions and receive state updates.
 */

class BoardGameEngine {
  constructor({ game, network, container, playerId, isHost }) {
    this.game = game;
    this.network = network;
    this.container = container;
    this.playerId = playerId;
    this.isHost = isHost;
    this.state = null;
    this._listeners = {};
    this._log = [];

    this.network.onMessage = (msg, fromId) => this._handleNetworkMessage(msg, fromId);
  }

  // ── Event system ──────────────────────────────────────────────────────────

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  addLog(msg) {
    const entry = { time: Date.now(), msg };
    this._log.push(entry);
    this._emit('log', entry);
  }

  // ── Host: start game ──────────────────────────────────────────────────────

  startGame(players) {
    if (!this.isHost) return;
    this.state = this.game.createInitialState(players);
    this.addLog(`Game started with ${players.length} players.`);
    this._broadcastState();
    this._render();
  }

  // ── Any player: submit an action ──────────────────────────────────────────

  submitAction(action) {
    const fullAction = { ...action, playerId: this.playerId };
    if (this.isHost) {
      this._processAction(fullAction);
    } else {
      this.network.sendToHost({ type: 'ACTION', action: fullAction });
    }
  }

  // ── Host: validate & apply action ─────────────────────────────────────────

  _processAction(action) {
    if (!this.isHost) return;
    try {
      const result = this.game.processAction(
        JSON.parse(JSON.stringify(this.state)), // deep clone for safety
        action
      );
      if (result.valid) {
        this.state = result.newState;
        if (result.log) this.addLog(result.log);
        const winner = this.game.checkWinCondition(this.state);
        if (winner) {
          this.state.phase = 'GAME_OVER';
          this.state.winner = winner;
          this.addLog(`🏆 ${winner.name} wins!`);
          this._broadcastFull({ type: 'GAME_OVER', state: this.state, winner });
        } else {
          this._broadcastState();
        }
        this._render();
      } else {
        this.addLog(`❌ Invalid action: ${result.reason || 'unknown reason'}`);
        this._emit('invalid-action', result);
      }
    } catch (e) {
      console.error('Engine error processing action:', e);
    }
  }

  // ── Networking ────────────────────────────────────────────────────────────

  _broadcastState() {
    const msg = { type: 'STATE_UPDATE', state: this.state };
    this.network.broadcast(msg);
  }

  _broadcastFull(msg) {
    this.network.broadcast(msg);
  }

  _handleNetworkMessage(msg, fromId) {
    switch (msg.type) {
      case 'ACTION':
        if (this.isHost) this._processAction(msg.action);
        break;

      case 'STATE_UPDATE':
        this.state = msg.state;
        this._render();
        break;

      case 'GAME_OVER':
        this.state = msg.state;
        this._render();
        this._emit('gameover', msg.winner);
        break;

      case 'PLAYER_JOINED':
        this._emit('player-joined', msg.player);
        break;

      case 'CHAT':
        this._emit('chat', msg);
        break;

      case 'REQUEST_STATE':
        // Guest just connected, send them full state
        if (this.isHost && this.state) {
          this.network.sendTo(fromId, { type: 'STATE_UPDATE', state: this.state });
        }
        break;
    }
  }

  // ── Helpers exposed to game modules ──────────────────────────────────────

  rollDice(sides = 6, count = 1) {
    return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  }

  shuffleDeck(cards) {
    const deck = [...cards];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    if (!this.state) return;
    try {
      this.game.render(this.state, this.container, this);
    } catch (e) {
      console.error('Render error:', e);
    }
  }

  forceRender() {
    this._render();
  }
}

// Utility: deep clone
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

window.BoardGameEngine = BoardGameEngine;
window.deepClone = deepClone;

/**
 * P2PNetwork — WebRTC peer-to-peer networking via PeerJS
 * Host creates room and gets a shareable Room ID.
 * Guests connect using that Room ID.
 * Host is the authoritative source of truth (validates all actions).
 */

class P2PNetwork {
  constructor() {
    this.peer = null;
    this.roomId = null;
    this.myId = null;
    this.isHost = false;

    // Host only: map of peerId → connection
    this._connections = {};

    // Guest only: connection to host
    this._hostConn = null;

    // Callback set by engine
    this.onMessage = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onConnected = null;
    this.onError = null;
  }

  // ── Host ──────────────────────────────────────────────────────────────────

  createRoom(playerName, customId = undefined) {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.peer = new Peer(customId, { debug: 1 });

      this.peer.on('open', id => {
        this.myId = id;
        this.roomId = id;
        this._setupHostListeners(playerName);
        resolve(id);
      });

      this.peer.on('error', err => {
        console.error('PeerJS error:', err);
        reject(err);
        this.onError?.(err);
      });
    });
  }

  _setupHostListeners(playerName) {
    this.peer.on('connection', conn => {
      console.log('Guest connecting:', conn.peer);

      conn.on('open', () => {
        this._connections[conn.peer] = conn;

        // Tell the engine a new guest joined
        this.onPlayerJoined?.({ peerId: conn.peer, name: conn.metadata?.name || 'Guest' });

        // Ask engine to send state to this guest
        this.onMessage?.({ type: 'REQUEST_STATE' }, conn.peer);

        conn.on('data', data => {
          this.onMessage?.(data, conn.peer);
        });

        conn.on('close', () => {
          delete this._connections[conn.peer];
          this.onPlayerLeft?.({ peerId: conn.peer });
        });

        conn.on('error', err => console.warn('Guest conn error:', err));
      });
    });
  }

  // ── Guest ─────────────────────────────────────────────────────────────────

  joinRoom(roomId, playerName) {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomId = roomId;
      this.peer = new Peer(undefined, { debug: 1 });

      this.peer.on('open', myId => {
        this.myId = myId;
        const conn = this.peer.connect(roomId, {
          metadata: { name: playerName },
          reliable: true
        });
        this._hostConn = conn;

        conn.on('open', () => {
          conn.on('data', data => {
            this.onMessage?.(data, roomId);
          });
          conn.on('close', () => {
            this.onPlayerLeft?.({ peerId: roomId, isHost: true });
          });
          this.onConnected?.();
          resolve(myId);
        });

        conn.on('error', err => {
          console.error('Host conn error:', err);
          reject(err);
          this.onError?.(err);
        });
      });

      this.peer.on('error', err => {
        console.error('PeerJS error:', err);
        reject(err);
        this.onError?.(err);
      });

      // Timeout
      setTimeout(() => reject(new Error('Connection timed out')), 15000);
    });
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  /** Host broadcasts to all guests */
  broadcast(message) {
    if (!this.isHost) return;
    Object.values(this._connections).forEach(conn => {
      try { conn.send(message); } catch (e) { console.warn('Broadcast error', e); }
    });
  }

  /** Host sends to one specific guest */
  sendTo(peerId, message) {
    const conn = this._connections[peerId];
    if (conn) {
      try { conn.send(message); } catch (e) { console.warn('SendTo error', e); }
    }
  }

  /** Guest sends to host */
  sendToHost(message) {
    if (this._hostConn?.open) {
      try { this._hostConn.send(message); } catch (e) { console.warn('SendToHost error', e); }
    }
  }

  /** Send chat message */
  sendChat(text, senderName) {
    const msg = { type: 'CHAT', text, senderName, time: Date.now() };
    if (this.isHost) {
      this.broadcast(msg);
      this.onMessage?.(msg, this.myId); // echo locally
    } else {
      this.sendToHost(msg);
    }
  }

  getConnectedCount() {
    return this.isHost ? Object.keys(this._connections).length : (this._hostConn?.open ? 1 : 0);
  }

  destroy() {
    this.peer?.destroy();
  }
}

window.P2PNetwork = P2PNetwork;

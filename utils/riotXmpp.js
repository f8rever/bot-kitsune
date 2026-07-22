const tls = require('tls');
const { parseStringPromise } = require('xml2js');

class RiotChatClient {
    constructor(chatUri, chatDom, port = 5223, timeout = 5000) {
        this.chatUri = chatUri;
        this.chatDom = chatDom;
        this.port = port;
        this.timeout = timeout;
        this.socket = null;
        this.chatConnected = false;
        this.accountStatus = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = tls.connect(this.port, this.chatUri, { rejectUnauthorized: false }, () => {
                resolve();
            });
            this.socket.on('error', (err) => reject(err));
            this.socket.setTimeout(this.timeout);
        });
    }

    receiveResponse() {
        return new Promise((resolve) => {
            const onData = (data) => {
                this.socket.removeListener('data', onData);
                this.socket.removeListener('error', onError);
                this.socket.removeListener('timeout', onTimeout);
                resolve(data.toString());
            };
            const onError = () => resolve(null);
            const onTimeout = () => resolve(null);
            
            this.socket.once('data', onData);
            this.socket.once('error', onError);
            this.socket.once('timeout', onTimeout);
        });
    }

    async sendRaw(xmlString) {
        if (!this.socket) return null;
        this.socket.write(xmlString);
        let resp = '';
        try {
            resp = await this.receiveResponse();
        } catch(e) {}
        return resp;
    }

    async initializeChat(riotToken, geopasToken) {
        if (this.chatConnected) return true;
        await this.connect();

        const connectionXml = [
            `<?xml version="1.0"?><stream:stream to="${this.chatDom}.pvp.net" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`,
            `<auth mechanism="X-Riot-RSO-PAS" xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><rso_token>${riotToken}</rso_token><pas_token>${geopasToken}</pas_token></auth>`,
            `<?xml version="1.0"?><stream:stream to="${this.chatDom}.pvp.net" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`,
            `<iq id="_xmpp_bind1" type="set"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><puuid-mode enabled="true"/><resource>RC-397159864</resource></bind></iq>`,
            `<iq id="_xmpp_session1" type="set"><session xmlns="urn:ietf:params:xml:ns:xmpp-session"/></iq>`
        ];

        let finalResponse = null;
        for (const piece of connectionXml) {
            const res = await this.sendRaw(piece);
            if (res) finalResponse = res;
            if (res && res.includes('account-disabled')) {
                this.accountStatus = 'account-disabled';
                return false;
            }
        }
        
        if (this.accountStatus === 'account-disabled') return false;
        this.chatConnected = true;
        return true;
    }

    async getFriendList() {
        if (!this.chatConnected) return null;
        const req = `<iq type="get" id="2"><query xmlns="jabber:iq:riotgames:roster" last_state="true" /></iq>`;
        const response = await this.sendRaw(req);
        if (!response) return [];
        
        try {
            const data = await parseStringPromise(response);
            const items = data?.iq?.query?.[0]?.item || [];
            return items.map(item => ({
                puuid: item.$.puuid,
                name: item.$.name,
                status: item.$.subscription
            }));
        } catch(e) {
            console.error("XML Parse error", e);
            return [];
        }
    }

    async sendFriendRequest(name, tag) {
        if (!this.chatConnected) return null;
        const xml = `<iq id='roster_add_11' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription='pending_out'><id name='${name}' tagline='${tag}'/></item></query></iq>`;
        const response = await this.sendRaw(xml);
        if (response && response.includes('item-not-found')) return "User not found";
        if (response && response.includes('max_roster_size_receiver')) return "User's friend list is full";
        return "Request sent successfully";
    }

    async acceptFriendRequest(puuid) {
        if (!this.chatConnected) return null;
        const xml = `<iq id='roster_add_11' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription="pending_out" puuid='${puuid}'/></query></iq>`;
        await this.sendRaw(xml);
        return "Friend accepted";
    }

    async removeFriend(puuid) {
        if (!this.chatConnected) return null;
        const xml = `<iq id='roster_remove_1' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription='remove' puuid='${puuid}'/></query></iq>`;
        await this.sendRaw(xml);
        return "Friend removed";
    }

    async sendMessage(puuid, message) {
        if (!this.chatConnected) return null;
        const xml = `<message type="chat" to="${puuid}@${this.chatDom}.pvp.net"><body>${message}</body></message>`;
        await this.sendRaw(xml);
        return "Message sent";
    }

    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.chatConnected = false;
    }
}

module.exports = { RiotChatClient };

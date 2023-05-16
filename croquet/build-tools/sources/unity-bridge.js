// Worldcore with Unity
//
// Croquet Corporation, 2023

import { v3_equals, q_identity, q_equals, ViewService, GetViewService, StartWorldcore, ViewRoot } from "@croquet/worldcore-kernel";

globalThis.timedLog = msg => {
    const toLog = `${(globalThis.CroquetViewDate || Date).now() % 100000}: ${msg}`;
    performance.mark(toLog);
    console.log(toLog);
};

// globalThis.WC_Left = true; // NB: this can affect behaviour of both models and views
globalThis.CROQUET_NODE = typeof window === 'undefined';

let theGameInputManager;

class BridgeToUnity {
    constructor() {
        this.bridgeIsConnected = false;
        this.startWS();
        this.readyP = new Promise(resolve => this.setReady = resolve);
        this.measureIndex = 0;
    }

    // @@ for now, we assume that a given C4U app only uses one type of
    // message communication between the Croquet and Unity instances
    setCommandHandler(handler) {
        this.commandHandler = handler;
    }

    resetMessageStats() {
        this.msgStats = { outMessageCount: 0, outBundleCount: 0, inBundleCount: 0, inMessageCount: 0, inBundleDelayMS: 0, inProcessingTimeMS: 0, lastMessageDiagnostics: Date.now() };
    }

    startWS() {
        globalThis.timedLog('starting socket client');
        const portStr = (!globalThis.CROQUET_NODE
            ? window.location.port
            : process.argv[2])
            || '5555';
console.log(`PORT ${portStr}`);
        const sock = this.socket = new WebSocket(`ws://127.0.0.1:${portStr}/Bridge`);
        sock.onopen = _evt => {
            // @@ uncomment following line to send all console logs through the websocket to Unity
            // console.log = console.warn = console.error = (...args) => sock.send(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            globalThis.timedLog('opened socket');
            this.bridgeIsConnected = true;
            this.resetMessageStats();
            sock.onmessage = event => {
                const msg = event.data;
                this.handleUnityMessageOrBundle(msg);
            };
        };
        sock.onclose = _evt => {
            globalThis.timedLog('bridge websocket closed');
            this.bridgeIsConnected = false;
            session.leave();
            if (globalThis.CROQUET_NODE) process.exit(); // if on node, bail out
        };
    }

    sendCommand(...args) {
        const msg = [...args].join('\x01');
        this.sendToUnity(msg);

        this.msgStats.outMessageCount++; // @@ stats don't really expect non-bundled messages
    }

    sendBundleToUnity(messages) {
        // prepend the current time
        messages.unshift(String(Date.now()));
        const multiMsg = messages.join('\x02');
        this.sendToUnity(multiMsg);

        const { msgStats } = this;
        msgStats.outBundleCount++;
        msgStats.outMessageCount += messages.length;

        return multiMsg.length;
    }

    sendToUnity(msg) {
        if (!this.socket) return; // @@ need to do better than just silently dropping
        // console.log('sending to Unity', msg);
        this.socket.send(msg);
    }

    handleUnityMessageOrBundle(msg) {
        // handle a single or multiple message from Unity
        const start = performance.now();
        const { msgStats } = this;
        const msgs = msg.split('\x02');
        if (msgs.length > 1) {
            msgStats.inBundleCount++;
            const sendTime = Number(msgs.shift());
            const diff = Date.now() - sendTime;
            msgStats.inBundleDelayMS += diff;
        }
        msgs.forEach(m => {
            const strings = m.split('\x01');
            const command = strings[0];
            const args = strings.slice(1);
            this.handleUnityCommand(command, args);
            msgStats.inMessageCount++;
        });
        msgStats.inProcessingTimeMS += performance.now() - start;
    }

    handleUnityCommand(command, args) {
        // console.log('command from Unity: ', { command, args });
        switch (command) {
            case 'readyForSession': {
                // args are [apiKey, appId, sessionName ]
                const [apiKey, appId, sessionName ] = args;
                globalThis.timedLog(`starting session of ${appId} with key ${apiKey}`);
                this.apiKey = apiKey;
                this.appId = appId;
                this.sessionName = sessionName;
                this.setReady();
                break;
            }
            case 'event': {
                // args[0] is event type (currently screenTap, screenDouble)
                if (theGameInputManager) theGameInputManager.handleEvent(args);
                break;
            }
            case 'unityPong':
                // args[0] is Date.now() when sent
                globalThis.timedLog(`PONG after ${Date.now() - Number(args[0])}ms`);
                break;
            case 'log':
                // args[0] is loggable string
                globalThis.timedLog(`[Unity] ${args[0]}`);
                break;
            case 'measure': {
                // args are [name, startDateNow, durationMS[, annotation]
                const [markName, startDateNow, durationMS, annotation] = args;
                const startPerf = performance.now() - Date.now() + Number(startDateNow);
                const index = ++this.measureIndex;
                const measureText = `U:${markName}${index} ${annotation || ""}`;
                performance.measure(measureText, { start: startPerf, end: startPerf + Number(durationMS) });
                break;
            }
            case 'shutdown':
                // @@ not sure this will ever make sense
                globalThis.timedLog('shutdown event received');
                session.leave();
                if (globalThis.CROQUET_NODE) process.exit();
                break;
            default:
                if (this.commandHandler) this.commandHandler(command, args);
                else globalThis.timedLog(`unknown Unity command: ${command}`);
        }
    }

    updateWithTeatime(teatime) {
        // sent by the PawnManager on each update()
        const now = Date.now();
        if (now - (this.lastTeatimeAnnouncement || 0) >= 1000) {
            this.announceTeatime(teatime);
            this.lastTeatimeAnnouncement = now;
        }

        if (now - this.msgStats.lastMessageDiagnostics > 1000) {
            const { inMessageCount, inBundleCount, inBundleDelayMS, inProcessingTimeMS, _outMessageCount, _outBundleCount } = this.msgStats;
            if (inMessageCount || inBundleCount) {
                globalThis.timedLog(`from Unity: ${inMessageCount} messages with ${inBundleCount} bundles (${Math.round(inBundleDelayMS/inBundleCount)}ms avg delay) handled in ${Math.round(inProcessingTimeMS)}ms");`);
            }
            // globalThis.timedLog(`to Unity: ${outMessageCount} messages with ${outBundleCount} bundles`);
            this.resetMessageStats();
        }
    }

    announceTeatime(teatime) {
        this.sendCommand('_teatime', String(Math.floor(teatime)));
    }

showSetupStats() {
    // pawns keep stats on how long they took to set up.  if this isn't called, the stats will keep building up (but basically harmless).
    console.log(`build: ${Object.entries(buildStats).map(([k, v]) => `${k}:${v}`).join(' ')} total: ${Object.entries(setupStats).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    buildStats.length = setupStats.length = 0;
}
}
export const theGameEngineBridge = new BridgeToUnity();

export const GameEnginePawnManager = class extends ViewService {
    constructor(name) {
        super(name || "GameEnginePawnManager");

        this.pawnsById = {}; // id => pawn
        this.deferredMessagesById = new Map(); // id => [msgs], iterable in the order the ids are mentioned
        this.deferredGeometriesById = {}; // id => msg; order not important
        this.unityMessageThrottle = 45; // ms (every two updates at 26ms)
        this.unityGeometryThrottle = 90; // ms (every four updates at 26ms)
        this.lastMessageFlush = 0;
        this.lastGeometryFlush = 0;

        this.reservedGameHandles = {
            camera: 1
        };
        this.lastGameHandle = 99; // 0-99 are reserved
        this.tellUnityReservedHandles();

        theGameEngineBridge.setCommandHandler(this.handleUnityCommand.bind(this));
    }

    tellUnityReservedHandles() {
        const argStrings = [];
        for (const [alias, id] of Object.entries(this.reservedGameHandles)) {
            argStrings.push(alias, String(id));
        }
        theGameEngineBridge.sendCommand('setReservedIds', argStrings.join(','));
    }

    destroy() {
        if (theGameEngineBridge.bridgeIsConnected) theGameEngineBridge.sendCommand('croquetSessionDisconnected');
        theGameEngineBridge.setCommandHandler(null);
    }

    nextGameHandle() {
        return ++this.lastGameHandle;
    }

    unityId(id) {
        return this.reservedGameHandles[id] || id;
    }

    getPawn(id) {
        return this.pawnsById[id] || null;
    }

    handleUnityCommand(command, args) {
        // console.log('command from Unity: ', { command, args });
        let pawn;
        switch (command) {
            case 'objectCreated': {
                // args[0] is id
                // args[1] is time when Unity created the pawn
                const [id, timeStr] = args;
                pawn = this.pawnsById[id];
                if (pawn) pawn.unityViewReady(Number(timeStr));
                break;
            }
            case 'objectMoved': {
                // args[0] is pawnId
                // remaining args are taken in pairs <property, value>
                // where property is one of "s", "r", "p" for scale, rot, pos
                // followed by a comma-separated list of values for the property
                // i.e., 3 or 4 floats
                pawn = this.pawnsById[args[0]];
                if (pawn && pawn.geometryUpdateFromUnity) {
                    try {
                        const update = {};
                        let pos = 1;
                        while (pos < args.length) {
                            const prop = args[pos++];
                            let geomProp;
                            switch (prop) {
                                case 's': geomProp = 'scale'; break;
                                case 'r': geomProp = 'rotation'; break;
                                case 'p': geomProp = 'translation'; break;
                                default:
                            }
                            if (geomProp) {
                                update[geomProp] = args[pos++].split(',').map(Number);
                            }
                        }
                        if (Object.keys(update).length) pawn.geometryUpdateFromUnity(update);

                    } catch (e) {
                        console.error(e);
                    }
                }
                break;
            }
            default:
                globalThis.timedLog(`unknown Unity command: ${command}`);
        }
    }

    makeObject(pawn, unityViewSpec) {
        const { id } = unityViewSpec;
        if (pawn) this.registerPawn(pawn, id);
        this.sendDeferred(id, 'makeObject', JSON.stringify(unityViewSpec));
        // any time a new object is created, we ensure that there is minimal delay in
        // servicing the deferred messages and updating objects' geometries.
        this.expediteMessageFlush();
        this.expediteGeometryFlush();
        return id;
    }

    destroyObject(id) {
        this.unregisterPawn(id); // will also remove any pending messages for the id
        this.sendDeferred(id, 'destroyObject', this.unityId(id));
    }

    registerPawn(pawn, id) {
        this.pawnsById[id] = pawn;
    }

    unregisterPawn(id) {
        delete this.pawnsById[id];
        this.deferredMessagesById.delete(id); // if any
    }

    addChild(parentId, childId) {
        this.sendDeferred(childId, 'setParent', this.unityId(childId), this.unityId(parentId));
    }

    unparent(childId) {
        this.sendDeferred(childId, 'unparent', this.unityId(childId));
    }

    updateGeometry(id, updateSpec) {
        // opportunistic updates to object geometries (only of non-pawn objects... which for
        // now means just the camera).
        // we keep a record of these updates independently from general deferred messages,
        // gathering and sending them as part of the next geometry flush.
        const previousSpec = this.deferredGeometriesById[id];
        if (!previousSpec) this.deferredGeometriesById[id] = updateSpec; // end of story
        else {
            // each of prev and latest can have updates to scale, translation,
            // rotation (or their snap variants).  overwrite previousSpec with any
            // new updates.
            const incompatibles = {
                scale: 'scaleSnap',
                scaleSnap: 'scale',
                rotation: 'rotationSnap',
                rotationSnap: 'rotation',
                translation: 'translationSnap',
                translationSnap: 'translation'
            };
            for (const [prop, value] of Object.entries(updateSpec)) {
                previousSpec[prop] = value;
                delete previousSpec[incompatibles[prop]]; // in case one was there
            }
        }
    }

    sendDeferred(id, command, ...args) {
        let deferredForSame = this.deferredMessagesById.get(id);
        if (!deferredForSame) {
            deferredForSame = [];
            this.deferredMessagesById.set(id, deferredForSame);
        }
        deferredForSame.push({ command, args });
    }

    // NOT USED
    sendDeferredWithMerge(id, command, mergeHandler, ...args) {
        const deferredForSame = this.deferredMessagesById.get(id);
        if (!deferredForSame) this.sendDeferred(id, command, ...args); // end of story
        else {
            const previous = deferredForSame.find(spec => spec.command === command);
            if (previous) mergeHandler(previous.args, args);
            else deferredForSame.push({ command, args });
        }
    }

    sendDeferredFromPawn(id, command, ...args) {
        // for every command from a pawn, prepend its unity id as the first arg
        this.sendDeferred(id, command, this.unityId(id), ...args);
    }

    update(time, delta) {
        super.update(time, delta);

        // announce teatime (if it's time to) before potentially dispatching a
        // load of other messages
        theGameEngineBridge.updateWithTeatime(this.extrapolatedNow());

        const now = Date.now();
        if (now - (this.lastMessageFlush || 0) >= this.unityMessageThrottle) {
            this.lastMessageFlush = now;
            this.flushDeferredMessages();
        }

        if (now - (this.lastGeometryFlush || 0) >= this.unityGeometryThrottle) {
            this.lastGeometryFlush = now;
            this.flushGeometries();
        }
    }

    expediteMessageFlush() {
        // guarantee that messages will flush on next update
        delete this.lastMessageFlush;
    }

    expediteGeometryFlush() {
        // guarantee that geometries will flush on next update
        delete this.lastGeometryFlush;
    }

    flushDeferredMessages() {
const pNow = performance.now();

        // now that opportunistic updateGeometry is handled separately, there are
        // currently no commands that need special treatment.  but we may as
        // well keep the option available.
        const transformers = {
            default: args => {
                // currently just used to convert arrays to comma-separated strings
                const strings = [];
                args.forEach(arg => {
                    strings.push(Array.isArray(arg)
                        ? arg.map(String).join(',')
                        : arg);
                });
                return strings;
            }
        };

        const messages = [];
        this.deferredMessagesById.forEach(msgSpecs => {
            msgSpecs.forEach(spec => {
                const { command } = spec;
                let { args } = spec;
                if (args.length) {
                    const transformer = transformers[command] || transformers.default;
                    args = transformer(args);
                }
                messages.push([command, ...args].join('\x01'));
            });
        });

        this.deferredMessagesById.clear();

        const numMessages = messages.length; // before sendBundle messes with it
        if (numMessages > 1) {
            const batchLen = theGameEngineBridge.sendBundleToUnity(messages);
this.msgBatch = (this.msgBatch || 0) + 1;
performance.measure(`to U (batch ${this.msgBatch}): ${numMessages} msgs in ${batchLen} chars`, { start: pNow, end: performance.now() });
        } else if (numMessages) {
            theGameEngineBridge.sendToUnity(messages[0]);
        }
    }

    flushGeometries() {
        const toBeMerged = [];

        // it's possible that some pawns will have an explicit deferred update
        // in addition to some changes since then that they now want to propagate.
        // in that situation, we send the explicit update first.
        for (const [id, update] of Object.entries(this.deferredGeometriesById)) {
            toBeMerged.push([this.unityId(id), update]);
        }
        this.deferredGeometriesById = {};

        for (const [id, pawn] of Object.entries(this.pawnsById)) {
            const update = pawn.geometryUpdateIfNeeded();
            if (update) toBeMerged.push([this.unityId(id), update]);
            const camUpdate = pawn.cameraUpdateIfNeeded?.();
            if (camUpdate) toBeMerged.push([this.unityId('camera'), camUpdate]);
        }

        if (!toBeMerged.length) return;

        const array = new Float32Array(toBeMerged.length * 11); // maximum length needed
        const intArray = new Uint32Array(array.buffer); // integer view into same data

        let pos = 0;
        const writeVector = vec => vec.forEach(val => array[pos++] = val);
        toBeMerged.forEach(([id, spec]) => {
            const { scale, scaleSnap, translation, translationSnap, rotation, rotationSnap } = spec;
            // first number encodes object id and (in bits 0 to 5) whether there is an
            // update to each of scale, rotation, translation, and for each one whether
            // it should be snapped.
            const idPos = pos++; // once we know the value
            let encodedId = id << 6;
            if (scale || scaleSnap) {
                writeVector(scale || scaleSnap);
                encodedId += 32;
                if (scaleSnap) encodedId += 16;
            }
            if (rotation || rotationSnap) {
                writeVector(rotation || rotationSnap);
                encodedId += 8;
                if (rotationSnap) encodedId += 4;
            }
            if (translation || translationSnap) {
                writeVector(translation || translationSnap);
                encodedId += 2;
                if (translationSnap) encodedId += 1;
            }
            intArray[idPos] = encodedId;
        });

        // send as a single binary-bodied message
        const buffer = array.buffer;
        const filledBytes = pos * 4;
        const command = 'updateGeometry';
        const cmdPrefix = `${String(Date.now())}\x02${command}\x03`;
        const message = new Uint8Array(cmdPrefix.length + filledBytes);
        for (let i = 0; i < cmdPrefix.length; i++) message[i] = cmdPrefix.charCodeAt(i);
        message.set(new Uint8Array(buffer).subarray(0, filledBytes), cmdPrefix.length);
        theGameEngineBridge.sendToUnity(message.buffer);
    }
};

const buildStats = [], setupStats = [];

export const PM_GameWorldPawn = superclass => class extends superclass {
    constructor(...args) {
        super(...args);

        this.pawnManager = GetViewService('GameEnginePawnManager');
    }

    gameSubscribe(eventType, callback) {
        this.pawnManager.addEventSubscription(eventType, callback);
    }
};

export const PM_GameRendered = superclass => class extends superclass {
    // getters for pawnManager and gameHandle allow them to be accessed even from super constructor
    get pawnManager() { return this._pawnManager || (this._pawnManager = GetViewService('GameEnginePawnManager' ))}
    get gameHandle() { return this._gameHandle || (this._gameHandle = this.pawnManager.nextGameHandle()) }

    constructor(...args) {
        super(...args);

        this.throttleFromUnity = 100; // ms
        this.messagesAwaitingCreation = []; // removed once creation is requested
        this.isViewReady = false;
    }

    setGameObject(viewSpec) {
        // analogue of setRenderObject in mixins for THREE.js rendering

        // because pawn creation is asynchronous, it's possible that the
        // actor has already been destroyed by the time we get here.  in
        // that case, don't bother creating the unity gameobject at all.
        if (this.actor.doomed) return;

        if (!viewSpec.confirmCreation) this.isViewReady = true; // not going to wait

        // no need to send full-precision values.  scale is the one that can legitimately
        // vary enormously (e.g., to be applied to very large/very small models),
        // so for that we pass small values as-is.
        const roundVal = (val, scaler) => Math.round(val * scaler) / scaler;
        const scale = this.actor.scale.map(val => Math.abs(val) < 0.1 ? val : roundVal(val, 10000));
        const rotation = this.actor.rotation.map(val => roundVal(val, 100000));
        const translation = this.actor.translation.map(val => roundVal(val, 10000));

        this.unityViewP = new Promise(resolve => this.setReady = resolve);
        const unityViewSpec = {
            id: String(this.gameHandle),
            cN: this.actor.id,
            cC: !!viewSpec.confirmCreation,
            wTA: !!viewSpec.waitToActivate,
            type: viewSpec.type,
            cs: viewSpec.extraComponents || "",
            c: viewSpec.color || [1,0,0],
            a: viewSpec.alpha === undefined ? 1 : viewSpec.alpha,
            iLA: !!this.isMyAvatar, // if no getter, always false
            s: scale,
            r: rotation,
            t: translation
        };
// every pawn tracks the delay between its creation on the Croquet
// side and receipt of a message from Unity confirming the corresponding
// gameObject's construction.
this.setupTime = Date.now();
// additionally, every hundredth pawn logs this round trip
if (this.gameHandle % 100 === 0) {
    globalThis.timedLog(`pawn ${this.gameHandle} created`);
}

        this.pawnManager.makeObject(this, unityViewSpec);
        this.messagesAwaitingCreation.forEach(cmdAndArgs => {
            this.pawnManager.sendDeferredFromPawn(...[this.gameHandle, ...cmdAndArgs]);
        });
        delete this.messagesAwaitingCreation;
    }

    unityViewReady(estimatedReadyTime) {
        // unity side has told us that the object is ready for use
        // console.log(`unityViewReady for ${this.gameHandle}`);
        this.isViewReady = true;
        this.setReady();
if (this.gameHandle % 100 === 0) {
    globalThis.timedLog(`pawn ${this.gameHandle} ready`);
}
const buildDelay = Date.now() - estimatedReadyTime;
const buildBucket = Math.round(buildDelay / 20) * 20;
buildStats[buildBucket] = (buildStats[buildBucket] || 0) + 1;
const totalDelay = Date.now() - this.setupTime;
const bucket = Math.round(totalDelay / 20) * 20;
setupStats[bucket] = (setupStats[bucket] || 0) + 1;
    }

    addChild(pawn) {
        super.addChild(pawn);
        this.pawnManager.addChild(this.gameHandle, pawn.gameHandle);
    }

    removeChild(pawn) {
        super.removeChild(pawn);
        this.pawnManager.unparent(pawn.gameHandle);
    }

    sendToUnity(command, ...args) {
        if (this.messagesAwaitingCreation) {
            this.messagesAwaitingCreation.push([command, ...args]);
        } else {
            this.pawnManager.sendDeferredFromPawn(this.gameHandle, command, ...args);
        }
    }

    gameSubscribe(eventType, callback) {
        this.pawnManager.addEventSubscription(eventType, callback);
    }

    destroy() {
        // console.log(`pawn ${this.gameHandle} destroyed`);
        this.pawnManager.destroyObject(this.gameHandle);
        super.destroy();
    }

    useInstance(name) {
        // @@ temporary mechanism - just expects a named prefab on the Unity side
        this.setGameObject({ type: name });
    }

    makeClickable(layers = "") {
        this.sendToUnity('makeClickable', layers);
    }
};

export const PM_GameSpatial = superclass => class extends superclass {

    constructor(...args) {
        super(...args);

        this.resetGeometrySnapState();
    }

    get scale() { return this.actor.scale }
    get translation() { return this.actor.translation }
    get rotation() { return this.actor.rotation }
    get local() { return this.actor.local }
    get global() { return this.actor.global }
    get lookGlobal() { return this.global } // Allows objects to have an offset camera position -- obsolete?

    get forward() { return this.actor.forward }
    get up() { return this.actor.up }

    geometryUpdateIfNeeded() {
        if (this.driving || this.rigidBodyType === 'static' || !this.isViewReady || this.doomed) return null;

        const updates = {};
        const { scale, rotation, translation } = this; // NB: the actor's direct property values
        // use smallest scale value as a guide to the scale magnitude, triggering on
        // changes > 1%
        const scaleMag = Math.min(...scale.map(Math.abs));
        if (!this.lastSentScale || !v3_equals(this.lastSentScale, scale, scaleMag * 0.01)) {
            const scaleCopy = scale.slice();
            this.lastSentScale = scaleCopy;
            updates[this._scaleSnapped ? 'scaleSnap' : 'scale'] = scaleCopy;
        }
        if (!this.lastSentRotation || !q_equals(this.lastSentRotation, rotation, 0.0001)) {
            const rotationCopy = rotation.slice();
            this.lastSentRotation = rotationCopy;
            updates[this._rotationSnapped ? 'rotationSnap' : 'rotation'] = rotationCopy;
        }
        if (!this.lastSentTranslation || !v3_equals(this.lastSentTranslation, translation, 0.01)) {
            const translationCopy = translation.slice();
            this.lastSentTranslation = translationCopy;
            updates[this._translationSnapped ? 'translationSnap' : 'translation'] = translationCopy;
        }

        this.resetGeometrySnapState();

        return Object.keys(updates).length ? updates : null;
    }

    resetGeometrySnapState() {
        this._scaleSnapped = this._rotationSnapped = this._translationSnapped = true;
    }

    geometryUpdateFromUnity(update) {
        this.set(update, this.throttleFromUnity);
    }

};

export const PM_GameSmoothed = superclass => class extends PM_GameSpatial(superclass) {

    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        this.throttle = 100; //ms

        this.listenOnce("scaleSnap", this.onScaleSnap);
        this.listenOnce("rotationSnap", this.onRotationSnap);
        this.listenOnce("translationSnap", this.onTranslationSnap);
    }

    // $$$ should send the tug value across the bridge, and update when it changes
    set tug(t) { this._tug = t }
    get tug() { return this._tug }

    scaleTo(v) {
        this.say("setScale", v, this.throttle);
    }

    rotateTo(q) {
        this.say("setRotation", q, this.throttle);
    }

    translateTo(v) {
        this.say("setTranslation", v, this.throttle);
    }

    positionTo(v, q) {
        this.say("setPosition", [v, q], this.throttle);
    }

    onScaleSnap() {
        this._scaleSnapped = true;
    }

    onRotationSnap() {
        this._rotationSnapped = true;
    }

    onTranslationSnap() {
        this._translationSnapped = true;
    }

    get local() {
        console.warn("attempt to get .local");
        return null;
    }

    get global() {
        console.warn("attempt to get .global");
        return null;
    }

    resetGeometrySnapState() {
        this._scaleSnapped = this._rotationSnapped = this._translationSnapped = false;
    }
};

export const PM_GameAvatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        this.onDriverSet();
        this.listenOnce("driverSet", this.onDriverSet);
    }

    get isMyAvatar() {
        return this.actor.driver === this.viewId;
    }

    onDriverSet() {
        // on creation, this method is sending a message to Unity that precedes
        // the makeObject message itself.  however, it will automatically be held
        // back until immediately after makeObject has been sent.
        if (this.isMyAvatar) {
            this.driving = true;
            this.drive();
            this.sendToUnity('registerAsAvatar');
        } else {
            this.driving = false;
            this.park();
            this.sendToUnity('unregisterAsAvatar');
        }
    }

    park() { }
    drive() { }

};

export const PM_GameCamera = superclass => class extends superclass {

    constructor(...args) {
        super(...args);

        this.cameraTranslation = [0, 0, 0]; // position of the camera relative to the pawn
        this.cameraRotation = q_identity();
        this.hasGrabbedCamera = false;
    }

    grabCamera() {
        const rot = this.lastSentCameraRotation = this.cameraRotation.slice();
        const pos = this.lastSentCameraTranslation = this.cameraTranslation.slice();
        this.sendToUnity('grabCamera', rot, pos);
        this.hasGrabbedCamera = true;
    }

    releaseCamera() {
        this.hasGrabbedCamera = false;
        this.sendToUnity('releaseCamera');
    }

    cameraUpdateIfNeeded() {
        if (!this.isViewReady || this.doomed || !this.hasGrabbedCamera) return null;

        const updates = {};
        const { cameraRotation, cameraTranslation } = this;
        if (!this.lastSentCameraRotation || !q_equals(this.lastSentCameraRotation, cameraRotation, 0.0001)) {
            updates.rotation = cameraRotation.slice();
            updates.rotationSnapped = !this.lastSentCameraRotation;
            this.lastSentCameraRotation = cameraRotation.slice();
        }
        if (!this.lastSentCameraTranslation || !v3_equals(this.lastSentCameraTranslation, cameraTranslation, 0.01)) {
            updates.translation = cameraTranslation.slice();
            updates.translationSnapped = !this.lastSentCameraTranslation;
            this.lastSentCameraTranslation = cameraTranslation.slice();
        }

        return Object.keys(updates).length ? updates : null;
    }

};

export class GameViewRoot extends ViewRoot {

    static viewServices() {
        return [GameEnginePawnManager];
    }

    constructor(model) {
        super(model);

        // we treat the construction of the view as a signal that the session is
        // ready to talk across the bridge
        theGameEngineBridge.sendCommand('croquetSessionReady');
        globalThis.timedLog("session ready");
    }

}

export class GameInputManager extends ViewService {
    get pawnManager() { return this._pawnManager || (this._pawnManager = GetViewService('GameEnginePawnManager')) }

    constructor(name) {
        super(name || "GameInputManager");

        this.customEventHandlers = {};

        theGameInputManager = this;
    }

    addEventHandlers(handlers) {
        Object.assign(this.customEventHandlers, handlers);
    }

    handleEvent(args) {
        const event = args[0];

        const custom = this.customEventHandlers[event];
        if (custom) {
            custom(args);
            return;
        }

        switch (event) {
            case 'keyDown': {
                const keyCode = args[1];
                this.publish('input', `${keyCode.toLowerCase()}Down`);
                this.publish('input', 'keyDown', { key: keyCode });
                break;
            }
            case 'keyUp': {
                const keyCode = args[1];
                this.publish('input', `${keyCode.toLowerCase()}Up`);
                this.publish('input', 'keyUp', { key: keyCode });
                break;
            }
            case 'pointerDown': {
                const button = Number(args[1]);
                this.publish('input', 'pointerDown', { button });
                break;
            }
            case 'pointerUp': {
                const button = Number(args[1]);
                this.publish('input', 'pointerUp', { button });
                break;
            }
            case 'pointerHit': {
                // each argument starting at 1 is a comma-separated list defining
                // a hit on a single Croquet-registered game object.  its fields are:
                //   id
                //   hitPoint x
                //   hitPoint y
                //   hitPoint z
                //   [layer 1]
                //   [layer 2]
                //   etc
                const hitList = [];
                for (let i = 1; i < args.length; i++) {
                    const parsedArg = args[i].split(',');
                    const [id, x, y, z, ...layers] = parsedArg;
                    const pawn = this.pawnManager.getPawn(id);
                    if (pawn) {
                        const xyz = [x, y, z].map(Number);
                        hitList.push({ pawn, xyz, layers});
                    }
                }
                if (hitList.length) this.publish('input', 'pointerHit', { hits: hitList });
                break;
            }
            default:
        }
    }
}

// simplified interval handling for game-engine apps

export const TimerClient = class {
    constructor() {
        this.timeouts = {};
        // https://stackoverflow.com/questions/69148796/how-to-load-webworker-from-local-in-wkwebview
        this.timerWorker = new Worker(window.URL.createObjectURL(
            new Blob([document.getElementById("timerWorker").textContent], {
                type: "application/javascript",
            })
        ));
        // this.timerWorker = new Worker(new URL('timer-worker.js', import.meta.url));
        this.timerIntervalSubscribers = {};
        this.timerWorker.onmessage = ({ data: intervalOrId }) => {
            if (intervalOrId === 'interval') {
                Object.values(this.timerIntervalSubscribers).forEach(fn => fn());
            } else {
                const record = this.timeouts[intervalOrId];
                if (record) {
                    const { callback } = record;
                    if (callback) callback();
                    delete this.timeouts[intervalOrId];
                }
            }
        };
    }
    setTimeout(callback, duration) {
        const id = Math.random().toString();
        this.timeouts[id] = { callback };
        this.timerWorker.postMessage({ id, duration });
        return id;
    }
    clearTimeout(id) {
        delete this.timeouts[id];
    }
    setInterval(callback, interval, name = 'interval') {
        // NB: for now, the worker only runs a single interval timer.  all subscribed clients must be happy being triggered with the same period.
        this.timerIntervalSubscribers[name] = callback;
        this.timerWorker.postMessage({ interval });
    }
    clearInterval(name = 'interval') {
        delete this.timerIntervalSubscribers[name];
    }
};

const timerClient = globalThis.CROQUET_NODE ? globalThis : new TimerClient();
if (globalThis.CROQUET_NODE) {
    // until we figure out how to use them on Node.js, disable measure and mark so we
    // don't build up unprocessed measurement records.
    // note: attempting basic reassignment
    //    performance.mark = performance.measure = () => { };
    // raises an error on Node.js v18
    Object.defineProperty(performance, "mark", {
        value: () => { },
        configurable: true,
        writable: true
    });
    Object.defineProperty(performance, "measure", {
        value: () => { },
        configurable: true,
        writable: true
    });
}

let session;
export async function StartSession(model, view) {
    // console.profile();
    // setTimeout(() => console.profileEnd(), 10000);
    await theGameEngineBridge.readyP;
    globalThis.timedLog("bridge ready");
    const { apiKey, appId, sessionName } = theGameEngineBridge;
    const name = `${sessionName}`;
    const password = 'password';
    session = await StartWorldcore({
        appId,
        apiKey,
        name,
        password,
        step: 'manual',
        tps: 20,
        autoSleep: false,
        expectedSimFPS: 0, // 0 => don't attempt to load-balance simulation
        flags: ['unity'],
        debug: globalThis.CROQUET_NODE ? ['session'] : ['session', 'messages'],
        model,
        view,
        progressReporter: ratio => {
            globalThis.timedLog(`join progress: ${ratio}`);
            theGameEngineBridge.sendCommand('joinProgress', String(ratio));
        }
    });

    const STEP_DELAY = 26; // aiming to ensure that there will be a new 50ms physics update on every other step
    let stepHandler = null;
    let stepCount = 0;
    timerClient.setInterval(() => {
        performance.mark(`STEP${++stepCount}`);
        if (stepHandler) stepHandler();
    }, STEP_DELAY);

    let lastStep = 0;
    stepHandler = () => {
        if (!session.view) return; // don't try stepping after leaving session (including during a rejoin)

        const now = Date.now();
        // don't try to service ticks that have bunched up
        if (now - lastStep < STEP_DELAY / 2) return;
        lastStep = now;
        session.step(now);
    };
    theGameEngineBridge.announceTeatime(session.view.realm.vm.time);

}

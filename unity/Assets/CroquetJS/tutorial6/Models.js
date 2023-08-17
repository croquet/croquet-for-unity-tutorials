// Tutorial 6 Models

import { Actor, mix, AM_Spatial, AM_Behavioral } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-unresolved
import { GameModelRoot } from "@croquet/game-models"; // eslint-disable-line import/no-unresolved

//------------------------------------------------------------------------------------------
// -- BaseActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added a ground plane called BaseActor. It listens for a message telling it to spawn
// a new TestActor at xyz coordinates. The actors it creates use a special pawn
// so we can recognize them and click on them.

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get gamePawnType() { return "groundPlane" }

    init(options) {
        super.init(options);
        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        console.log(e.hits);
        // e has a list of hits { actor, xyz, layers }
        const { actor, xyz } = e.hits[0];
        if (actor === this) {
            this.doSpawn(xyz);
        } else {
            this.publish(actor.id, "kill");
        }
    }

    doSpawn(xyz) {
        TestActor.create({gamePawnType: "interactableCube", parent: this, translation: xyz});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- TestActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Test actors now listen for their pawns to say "kill". If they receive a kill event they
// destroy themselves.
//
// Note that events said by a pawn go through the reflector. So if any pawn on any client
// says "kill", the actor will destroy itself for all clients.

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return this._gamePawnType || "woodCube" }

    init(options) {
        super.init(options);
        console.log(`init TestActor of type ${this.gamePawnType}`);
        this.listen("kill", this.destroy);
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "colorableCube" }

    get color() { return this._color || [0.5,0.5,0.5] }

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends GameModelRoot {

    init(options) {
        super.init(options);
        console.log("Starting model root!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({parent: this.parent, translation:[0,0,-2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,-1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

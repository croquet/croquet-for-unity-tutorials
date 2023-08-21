// Tutorial 9 Models

import { Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, v3_add, v3_sub, v3_normalize, UserManager, User, AM_Avatar, q_axisAngle, toRad } from "@croquet/worldcore-kernel";
import { GameModelRoot } from "@croquet/game-models";

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get gamePawnType() { return "groundPlane" }

    init(options) {
        super.init(options);
        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        // e has a list of hits { actor, xyz, layers }
        const { actor, xyz } = e.hits[0];
        if (actor === this) this.doSpawn(xyz);
    }

    doSpawn(xyz) {
        const translation = [...xyz];
        ClickableActor.create({parent: this, translation});
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//--TestActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "woodCube" }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//--ClickableActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ClickableActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "woodCube" }

    init(options) {
        super.init(options);
        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        // e has a list of hits { actor, xyz, layers }
        const { actor } = e.hits[0];
        if (actor === this) this.doKill();
    }

    doKill() {
        if (this.dying) return; // Prevent an actor from being killed twice
        this.dying = true;
        const translation = v3_add(this.translation, [0, 2, 0]);
        this.set({ translation });
        this.behavior.start({ name: "RiseBehavior", height: 4, speed: 2 });
        this.behavior.start({ name: "SpinBehavior", axis: sphericalRandom(), speed: 0.4 });
        this.behavior.start({
            name: "SequenceBehavior", behaviors: [
                { name: "InflateBehavior", size: 3, speed: 0.4 },
                "DestroyBehavior"
            ]
        });
    }
}
ClickableActor.register('ClickableActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
    get gamePawnType() { return "woodCube" }

    get color() { return this._color || [-1, 0, 0] } // our Material System treats r = -1 as "don't recolour"

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- AvatarActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// AvatarActor includes the AM_Avatar mixin.  Avatars have a driver property that holds the viewId of the user controlling them.

class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {
    get gamePawnType() { return "tutorial9Avatar" }

    get color() { return this._color || [-1, 0, 0] }

    init(options) {
        super.init(options);
        this.subscribe("input", "pointerHit", this.doPointerHit);
    }

    doPointerHit(e) {
        const originatingView = e.viewId;
        if (this.driver !== originatingView) return; // not this avatar's responsibility

        const { actor, layers } = e.hits[0];
        if (layers.includes('avatar') && actor !== this) {
            const away = v3_normalize(v3_sub(actor.translation, this.translation));
            actor.beShoved(away);
        }
    }

    beShoved(v) {
        const translation = v3_add(this.translation, v);
        if (this.driver) {
            this.snap({ translation });
        } else {
            this.set({ translation });
        }
    }

}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() { return MyUser }
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        const base = this.wellKnownModel("ModelRoot").base;
        this.color = [this.random(), this.random(), this.random()];
        this.avatar = AvatarActor.create({
            parent: base,
            driver: this.userId,
            translation: [0, 1, -10]
        });
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }

}
MyUser.register('MyUser');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We add two spare avatars to the world. These avatars have no drivers, so they're available
// for anyone to shove; they also change color when anyone presses "c".

export class MyModelRoot extends GameModelRoot {

    static modelServices() {
        return [MyUserManager, ...super.modelServices()];
    }

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({parent: this.base, translation: [0, 1, 0]});
        this.child = ColorActor.create({parent: this.parent, translation: [0, 0, -2]});

        this.parent.behavior.start({ name: "SpinBehavior", axis: [0, -1, 0], tickRate: 500 });
        this.child.behavior.start({ name: "SpinBehavior", axis: [0, 0, 1], speed: 3 });

        this.spare0 = AvatarActor.create({
            parent: this.base,
            driver: null,
            translation: [-2, 1, 10],
            rotation: q_axisAngle([0, 1, 0], toRad(-170))
        });

        this.spare1 = AvatarActor.create({
            parent: this.base,
            driver: null,
            translation: [2, 1, 10],
            rotation: q_axisAngle([0, 1, 0], toRad(170))
        });

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({ color });
        this.spare0.set({ color });
        this.spare1.set({ color });
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// -- Behaviors ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class InflateBehavior extends Behavior {

    get size() { return this._size || 3 }
    get speed() { return this._speed || 0.5 }

    onStart() {
        this.scale = this.actor.scale[0];
    }

    do(delta) { // Increases the actor's scale until it reaches a target size
        this.scale += this.speed * delta / 1000;
        this.actor.set({ scale: [this.scale, this.scale, this.scale] });
        if (this.scale > this.size) this.succeed();
    }

}
InflateBehavior.register('InflateBehavior');

class RiseBehavior extends Behavior {

    get height() { return this._height || 3 }
    get speed() { return this._speed || 0.5 }

    onStart() {
        this.top = this.actor.translation[1] + this.height;
    }

    do(delta) { // Moves the actor up until it reaches the top
        const y = this.speed * delta / 1000;
        const translation = v3_add(this.actor.translation, [0, y, 0]);
        this.actor.set({ translation });
        if (translation[1] > this.top) this.succeed();
    }

}
RiseBehavior.register('RiseBehavior');

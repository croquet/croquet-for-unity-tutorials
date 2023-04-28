// Tutorial 9 Models

import { ModelRoot, Actor, mix, AM_Spatial, AM_Behavioral, Behavior, sphericalRandom, v3_add, UserManager, User, AM_Avatar, q_axisAngle, toRad } from "@croquet/worldcore-kernel"; // eslint-disable-line import/no-extraneous-dependencies

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The BaseActor is given the task of deciding whether a client (identified by its viewId)
// is able to start driving a given avatar actor: it can only do so if the actor doesn't
// already have a driver. This eliminates the potential for a race condition in which two
// clients try to grab the same avatar at the same time: only the first will succeed.

class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
        this.listen("spawn", this.doSpawn);
        this.subscribe("app", "askToDrive", this.askToDrive);
    }

    doSpawn(xyz) {
        const translation = [...xyz];
        TestActor.create({pawn:"ClickPawn", parent: this, translation});
    }

    askToDrive(data) {
        const { actor, viewId } = data;
        if (actor.driver) return; // not available (must have been beaten to it)

        actor.set({ driver: viewId });
        this.publish("app", "avatarAssigned", { actor, viewId });
    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//--TestActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.listen("kill", this.doKill);
    }

    doKill() {
        if (this.dying) return; // Prevent an actor from being killed twice
        this.dying = true;
        const translation = v3_add(this.translation, [0,2,0]);
        this.set({translation});
        this.behavior.start({name: "RiseBehavior", height: 5, speed: 1});
        this.behavior.start({name: "SpinBehavior", axis: sphericalRandom(), speed: 0.2});
        this.behavior.start({name: "SequenceBehavior", behaviors:[
            {name: "InflateBehavior", size: 4, speed: 0.2},
            "DestroyBehavior"
        ]});
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- ColorActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We add the AM_Avatar mixin to the ColorActor. This lets us use a ColorActor as an
// avatar. Avatars have a driver property that holds the viewId of the user controlling
// them.
//
// We add a subscription to the session-level "view-exit" event, so that when a client
// leaves the session every avatar is informed. The avatar that was being driven by that
// client sets its driver to null, freeing it to be grabbed by someone else.

class ColorActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Avatar) {

    get color() { return this._color || [0.5,0.5,0.5] }

    init(options) {
        super.init(options);

        this.subscribe(this.sessionId, "view-exit", this.viewExit);
    }

    viewExit(viewId) {
        if (this.driver === viewId) this.set({ driver: null });
    }

}
ColorActor.register('ColorActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyUserManager extends UserManager {
    get defaultUser() {return MyUser}
}
MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        const base = this.wellKnownModel("ModelRoot").base;
        this.color = [this.random(), this.random(), this.random()];
        this.avatar = ColorActor.create({
            pawn: "AvatarPawn",
            parent: base,
            driver: this.userId,
            color: this.color,
            translation: [0, 1, -10] // y offset set view-side in three.js version
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
// for anyone to drive, and they also change color when anyone presses "c".

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        console.log("Start model root!");
        this.base = BaseActor.create();
        this.parent = TestActor.create({pawn: "TestPawn", parent: this.base, translation:[0,1,0]});
        this.child = ColorActor.create({pawn: "ColorPawn", parent: this.parent, translation:[0,0,-2]});

        this.parent.behavior.start({name: "SpinBehavior", axis: [0,-1,0], tickRate:500});
        this.child.behavior.start({name: "SpinBehavior", axis: [0,0,1], speed: 3});

        this.spare0 = ColorActor.create({
            pawn: "AvatarPawn",
            parent: this.base,
            driver: null,
            translation: [-2,1,10],
            rotation: q_axisAngle([0,1,0], toRad(-170))
        });

        this.spare1 = ColorActor.create({
            pawn: "AvatarPawn",
            parent: this.base,
            driver: null,
            translation: [2,1,10],
            rotation: q_axisAngle([0,1,0], toRad(170))
        });

        this.subscribe("input", "cDown", this.colorChange);
    }

    colorChange() {
        const color = [this.random(), this.random(), this.random()];
        this.child.set({color});
        this.spare0.set({color});
        this.spare1.set({color});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// -- Behaviors ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class InflateBehavior extends Behavior {

    get size() { return this._size || 3}
    get speed() { return this._speed || 0.5}

    onStart() {
        this.scale = this.actor.scale[0];
    }

    do(delta) { // Increases the actor's scale until it reaches a target size
        this.scale += this.speed * delta/1000;
        this.actor.set({scale:[this.scale,this.scale,this.scale]});
        if (this.scale > this.size) this.succeed();
    }

}
InflateBehavior.register('InflateBehavior');

class RiseBehavior extends Behavior {

    get height() { return this._height || 3}
    get speed() { return this._speed || 0.5}

    onStart() {
        this.top = this.actor.translation[1] + this.height;
    }

    do(delta) { // Moves the actor up until it reaches the top
        const y = this.speed * delta/1000;
        const translation = v3_add(this.actor.translation, [0,y,0]);
        this.actor.set({translation});
        if (translation[1] > this.top) this.succeed();
    }

}
RiseBehavior.register('RiseBehavior');
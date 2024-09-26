# Introduction to M4U Advanced


![](images/image17.gif)

This is Guardians - which will be covered in a later section of this document. It has up to 1000 perfectly synchronized bots, missiles, and avatar tanks. You can try the web version of the game right now here: [https://multisynq.io/examples#Guardians](https://multisynq.io/examples#Guardians)

Multisynq for Unity was designed to enable complex multiplayer capabilities within Unity without the need to set up servers or write any netcode. It uses the Multisynq bit-identical synchronized computation platform written in JavaScript, and a bridge to the Unity application which uses C#. This is a relatively seamless system, though of course it does require you to have a working knowledge of JavaScript and will require some additional setup.

There are ten tutorials that cover the fundamentals of creating a multiplayer game in Multisynq for Unity, as well as a fully working game called Guardians that provides an example of an end-to-end application.

# Why JavaScript?

Multisynq depends on a guarantee of deterministic computation across multiple platforms, as well as the ability to take a snapshot of the full program state, and dynamically recreate that state from a snapshot on a different machine. The object-oriented synchronous subset [\[1\]](#ftnt1)  of JavaScript provides these guarantees and is the most widely available language across platforms. JavaScript is single threaded, which further eliminates race conditions which can also cause divergence in computations. Even so, certain operations like transcendental functions (e.g. sine , cosine , etc.) do not guarantee that the low-order bits on different systems are identical. The Multisynq system patches these operations to ensure that they are. Finally, Multisynq also provides a deterministic Math.random() function to again ensure identical calculations.

# Basic Operation

**Worldcore** is a framework built on top of the Croquet kernel. It makes it particularly easy to create and animate objects within Croquet worlds. Worldcore utilizes a **model-view** design pattern. In this case, the **model** is the synchronized computation that is guaranteed to run bit identically on all participating users’ systems. In the case of Multisynq for Unity, this is the JavaScript part of the system. The view provides the visual representation of the model as well as the interface (this is often referred to as model/view/controller). Croquet guarantees that the model will run identically on any system - including Windows, Macintosh, Android and iOS. This means that any game created with Multisynq for Unity enables multiplayer between phones, tablets, computers and potentially console devices. This is particularly useful for Unity applications, as Unity can target many different systems. It does mean that the programmer will need to build part of their application in JavaScript.

The elements that make up the model are called **actors**. Actors are JavaScript objects that are the basis of the shared simulated state. The Unity view side is made of Unity game objects that we will refer to as **pawns**. Pawns are instantiated and destroyed on demand as Croquet Worldcore actors come in and out of existence. When you join a session that is currently in progress, or has been run at some time in the past, pawns will be created for all the actors in the active session, and be kept in sync from then on.

## Simulation and animation: future messages

Croquet provides a shared clock for all participants in a multiplayer game. It can be accessed as `this.now()`. All model computation is driven by this shared clock. The `future()` message is the key to multiplayer simulations and animations. It specifies that the function `doSomething()` will be called in a certain number of milliseconds in the future. This allows you to specify an action at regular intervals - for example, having the bots move through the world at a regular pace.

A particularly useful pattern is to have a message called via a future message call itself in another future message. Thus, we might have something like this:

```js
doSomething() {
    // do something here
    this.future(100).doSomething();
}
```

This means that `doSomething()` will be called every 100 milliseconds. But more importantly, the `doSomething()` function is placed in a message queue within the Croquet model. Thus, when we take a snapshot of the state of the Croquet model, the queue is included. When a new user joins that same session, this future message queue is included - so even the animations and simulations pick up exactly where it is on the other players systems.

*Note that even complex behaviors (like physics objects, intelligent bots, etc) produce zero networking overhead, because everything is deterministically driven off the shared Croquet clock.*

## Publish/Subscribe

The Croquet model and Unity view communicate using the **publish/subscribe** pattern. There is no direct communication between players (views on different machines), they all communicate only with the shared model.

A publish **from the Croquet model to the Unity view** goes directly across the Multisynq bridge, so is received immediately. This is to inform the Unity pawns that something in an actor changed, and used to update the animations from simulations being performed within the model. Since it is local, bandwidth is not much of a problem.

A publish of user-generated events **from a Unity view to a Croquet model** is the only valid non-deterministic input to the system, and will be replicated to all users. This is how your game can react to multi-user input while still producing exactly the same end result on every machine. The published event is sent via a Croquet reflector which attaches a timestamp and forwards the event to all participants in the same session.

The syntax of the publish function is:

```js
this.publish(scope, event, data);
```

Both `scope` and `event` can be arbitrary strings. Typically, the scope would select the object (or groups of objects) to respond to the event, and the event name would select which operation to perform.

A commonly used scope is `this.id` (in a model) and `model.id` (in a view) to establish a communication channel between a model and its corresponding view.

You can use any literal string as a global scope.

The syntax of the subscribe function is:

```js
this.subscribe(scope, event, handler);
```

The handler in the Croquet model must be a method of this, e.g. `subscribe("scope", "event", this.methodName)` which will schedule the invocation of `this.methodName(data)` whenever `publish("scope", "event", data)` is executed.

If `data` was passed to the publish call, it will be passed as an argument to the `subscribe` handler method. You can have at most one argument. To pass multiple values, pass an `Object` or `Array` containing those values. Views can only pass serializable data to models, because those events are routed via a reflector server.

*Note that unlike in traditional multiplayer approaches, with Croquet you do not have to publish anything to keep model properties in sync across different machines. Croquet synchronizes computation itself, so your objects will already be up-to-date as the clock ticks.*

## Say/Listen
The say/listen pattern is a simplified version of publish/subscribe that is used to communicate between a specific Croquet model and the associated Unity view. This enables you to send an event from your pawn to that pawn's specific actor on the model side, and vice versa. Under the covers, these are publish and subscribe invocations where the “scope” is set to the actor's model ID.

## Level Building with Unity Editor
If you build out a level in Unity using objects that have a manifest, Multisynq will gather up the critical information for a level and handle distributing that information to other players.

# Setting Up
The [readme](https://github.com/multisynq/m4u-tutorials) in the Github Repository is the best way to get started. This covers installation and successfully running your application. These tutorials are arranged as a set of scenes. Each scene builds upon the previous scene enabling more complex behaviors.

![](images/image22.png)

# Unity Scenes, Systems and Prefabs
Once you have set up Multisynq for Unity as described in the repository's readme (not forgetting to ensure that **Build JS on Play** is selected on the editor's **Multisynq** menu) , you are ready to run the tutorials. Each tutorial has its own scene within the Unity project; double click on the scene you wish to run, and hit play.

![](images/image6.png)

We now describe briefly the main pieces needed on the Unity side to run a Multisynq for Unity app.

Every scene must include a GameObject that includes the components for setting up and managing communication with a Croquet JavaScript session. Here is a screenshot of that object in the scene for Tutorial 1 .

![](images/image2.png)

*An inspector on the Multisynq object in the Tutorial 1 scene.*

The **Multisynq Bridge** component specifies where to find the JavaScript code that this scene is designed to run with (the **App Name** is used to locate the code under the project's `Assets/MultisynqJS/`  folder). Once the Croquet session is running, the Bridge handles all communication with it.

The **Mq_Runner** is responsible for actually launching the Croquet session, using either an invisible WebView or an external browser (if **Debug Using External Session** is checked) or – especially on Windows, where WebView is not currently supported – using Node.js.

In addition, every scene must include at least the **Mq_Entity_System** , which manages the creation and destruction of Unity pawns under instructions from Multisynq. Any scene with pawns that are placed in 3D (in other words, any interesting scene) needs the **Mq_Spatial_System** to manage that placement. Other such "systems" are introduced below.

Unity pawns are instantiated from prefabs, and use components that are specifically designed to work with the Croquet actors. Each prefab included in the Unity project has a **Mq_ActorManifest** where we define the features expected of any actor using this prefab (strictly, of the Worldcore view-side proxy for that actor, which handles communication between the actor and its Unity pawn).

Below is an inspector on the basicCube prefab. Because Worldcore classes make use of mixins to define their functionality, the principal property of the manifest is the **Mixins** list. In this case it contains just **Spatial** , which is responsible for ensuring that the actor constantly communicates to Unity its translation (referred to in Unity as position), rotation, and scale. When this prefab is instantiated, the presence of Spatial also results in attachment of a **Mq_Spatial_Comp** to the game object.

![](images/image1.png)

The following are all the mixins used in these tutorials:

**Spatial**: a pawn that instantly snaps to its actor's placement at all times

**Smoothed**: a pawn that moves smoothly to track the actor's placement

**Material**: to track material settings (currently just color)

**Interactable**: to detect user interactions on the pawn (currently pointer clicks)

**Drivable**: can be moved instantly by the local user, while announcing every move so that other users can see (with a small latency) the same changes

Both **Spatial** and **Smoothed** introduce a **Mq_Spatial_Comp** , which requires the presence of a **Mq_Spatial_System** in the scene. The other three come with their own component/system pairs (e.g., **Mq_Drivable_Comp** , **Mq_Drivable_System** ).

Here are the various prefabs used throughout the tutorials, along with their included mixins and the tutorials they are used in:

| Prefab Name       | Mixin                          | Tutorials |
|-------------------|--------------------------------|-----------|
| basicCube         | Spatial                        | 1,2       |
| colorableCube     | Smoothed, Material             | 5,6       |
| groundPlane       | Spatial, Interactable          | 6,7,8,9   |
| interactableCube  | Smoothed, Interactable         | 6,7       |
| smoothedCube      | Smoothed                       | 2,3,4,5   |
| tutorial8Avatar   | Smoothed, Material, Drivable     | 8         |
| tutorial9Avatar   | Smoothed, Material, Interactable, Drivable | 9 |
| woodCube          | Smoothed, Material, Interactable | 7,8,9   |

**NOTE**: Prefabs for use by scenes will only be found if they have been added to the Default Local Group in Unity's Addressables manager. Each prefab must be tagged with labels naming all the scenes that are expected to use it, or the label "default" to mean that the prefab is available for all scenes. When a scene starts up, the prefabs available for that scene are listed in the Unity console.







# Appendix 1: Worldcore Vector Package
Croquet Worldcore includes a simple vector package. All vectors, colors, quaternions and matrices used within the model are simple JavaScript arrays. It also includes other useful functions.

The full package is included with Multisynq for Unity, but can be viewed here:

[https://github.com/croquet/worldcore/blob/main/packages/kernel/src/Vector.js](https://github.com/croquet/worldcore/blob/main/packages/kernel/src/Vector.js)

[\[1\]](#ftnt_ref1) Certain features of JavaScript violate these assumptions and cannot be used. In particular, closures (functions that “close over” variables) cannot be snapshotted and restored, which also prevents direct use of callbacks or async/await. Croquet provides alternatives to these language features.
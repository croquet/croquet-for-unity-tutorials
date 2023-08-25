# Croquet for Unity Tutorials

This repository contains Croquet for Unity (C4U) ports of Brian Upton's introductory tutorials for Worldcore. The Tutorial Documentation explaining each of the examples is available in Google Docs here: [Croquet for Unity Tutorials](https://docs.google.com/document/d/1XXBRe3H6pRdbKw7pfVStnIfaOzQd3d1A7DseA7kEobI/edit?usp=sharing). Anyone may comment on this document (for now). Please be respectful.

The most important directories are the following:
* `unity/` - a loadable Unity project, from which you can run apps in the editor or build standalone apps for deployment on iOS and Android.
* `unity/Assets/Scenes/` - the scenes for running and deploying the nine tutorial examples.
* `unity/Assets/CroquetJS/{tutorial1..tutorial9}` - JavaScript source for building the Croquet side of the tutorial scenes.  You can edit the code under this directory to change the tutorials' behavior.

# Questions
Please feel free to ask questions on our [discord](https://croquet.io/discord).

# Setup

## 1.0 Node Installation
Node is a prerequisite for installing JavaScript libraries like Croquet and Worldcore, as well as facilitating webpack builds.

Install node.js and the node package manager (npm) for your platform here (LTS Recommended): https://nodejs.org/en/download


## 2.0 Clone the Repo
Install git from https://git-scm.com/downloads

```
git clone https://github.com/croquet/croquet-for-unity-tutorials.git
```

Note: this repository's large size is predominantly due to our including a specific version of NodeJS for Windows.  On Windows we normally use NodeJS to run the JavaScript side of a C4U session, since Unity on Windows is currently unable to use the WebView mechanism that Croquet prefers.  On MacOS we use the WebView by default, but if a project has the necessary entry point for NodeJS execution (as the tutorials all do), NodeJS can be used on Mac as well.

## 3.0 Load the Unity Project
Make sure you have the Unity Hub installed from
https://unity.com/download

 > **NOTE:** For now, we **strongly recommend** using _exactly_ Unity Editor Version `2021.3.19f1` for C4U projects

2021.3.19f1 can be downloaded by pasting the following in your browser: `unityhub://2021.3.19f1/c9714fde33b6`  This deeplink to the Unity Hub should open an installation dialog for the correct version.

In the `Unity Hub` app, select `Open => Add project from disk`, then navigate to the `croquet-for-unity-tutorials/unity` folder and hit `Add Project`.

## 4.0 Set up your Croquet Developer Credentials

In the Project Navigator (typically at bottom left), go to `Assets/Settings` and click `CroquetSettings.asset`.  The main field that you need to set up is the **Api Key**.

The API Key is a token of around 40 characters that you can create for yourself at https://croquet.io/account.  It provides access to the Croquet infrastructure.

The App Prefix is the way of identifying with your organization the Croquet apps that you develop and run.  The combination of this prefix and the App Name provided on the Croquet Bridge component in each scene is a full App ID - for example, `io.croquet.worldcore.tutorial1`.  For running the tutorials it is fine to leave this prefix as is, but when you develop your own apps you must change the prefix so that the App ID is a globally unique identifier.  The ID must follow the Android reverse domain naming convention - i.e., each dot-separated segment must start with a letter, and only letters, digits, and underscores are allowed.

**For MacOS only:** Find the Path to your Node executable, by going to a terminal and running
```
which node
```
On the Settings asset, fill in the **Path to Node** field with the path.



## 5.0 Run the Tutorials
In the Project Navigator, go to `Assets/Scenes` and double-click any of the `tutorial<n>.unity` scenes.  If a "TMP importer" dialog comes up at this point, hit the top button ("Import TMP Essentials") then close the dialog.

In the editor's top menu, go to the `Croquet` drop-down and ensure that `Build JS on Play` has a check-mark next to it.

Press the play button.  The first time you do so after installation, C4U will notice that you have not yet installed the JavaScript build tools from the package.  It will copy them across, and also run an `npm install` that fetches all Croquet and other dependencies that are needed.  Depending on network conditions, this could take some tens of seconds - during which, because of Unity's scheduling mechanisms, you won't see anything in the console.  Please wait for it to complete.

In addition, because of the `Build JS on Play` setting, C4U will run a full webpack build of the JavaScript code - eventually adding webpack's output to the console, each line prefixed with "JS builder".  The first build for each app (i.e., each tutorial) will take the longest; on subsequent runs the build process should be faster.

Eventually you should see the console output for startup of the app - ending with "Croquet scene for tutorial running", at which point the app's objects will appear.

# Debugging Techniques
## Using a Web Browser to Debug the JavaScript Code

On both MacOS and Windows, you can choose to use an external browser such as Chrome to run the JavaScript code.  For debugging, this is more convenient than letting the C4U bridge start up an invisible WebView or Node JS process.

In a tutorial scene (while play is stopped), select the `Croquet` object in the scene hierarchy, then in that object's `Croquet Runner` component select the **Debug Using External Session** checkbox.

Now whenever you press play, the console output will include a line of the form "ready for browser to load from http://localhost:...".  Copy that address (if you click on the line, it will appear as selectable text in the view below the console) then use it to launch a new browser tab.  This should complete the startup of the app. All the JS developer tools (console, breakpoints etc) offered by the browser are available for working with the code.

When you stop play in the Unity editor, the browser tab will automatically leave the Croquet session.  If you restart play, you will need to reload the tab to join the session again.

## Viewing JS Log Output in Unity
The `Croquet Bridge` component's **JS Log Forwarding** property has checkboxes that let you select which categories of console output in the JavaScript session will be transferred across the bridge and appear in the Unity console.  By default, the "warn" and "error" categories are sent.

# Making Sharable Builds
Before building the app to deploy for a chosen platform (e.g., Windows or MacOS standalone, or iOS or Android), there are some settings that you need to pay attention to:

* there must be an **Api Key** present in `CroquetSettings.asset`
* on `Croquet Bridge` the **Debug Force Scene Rebuild** checkbox _must_ be cleared
* on `Croquet Runner` the **Debug Using External Session** checkbox _must_ be cleared
* on `Croquet Runner` the **Force To Use Node JS** checkbox _must_ be cleared for anything other than a Windows build
* on `Croquet Runner` the **Run Offline** checkbox _must_ be cleared
* ensuring that all checkboxes are cleared under **Debug Logging Flags** and **JS Log Forwarding** will reduce possibly resource-hungry logging

Hit **Build**!  If any of the obligatory conditions listed above are not met, the build will be halted.  Fix the conditions and try again.

## Supplementary information for sharing MacOS builds

We have found that distributing a standalone MacOS build (`.app` file) requires some care to ensure that recipients can open it without being blocked by MacOS's security checks. One approach that we have found to work - there are doubtless others - is as follows:

1. Make the build - arriving at, say, a file `build.app`
2. In a terminal, execute the following command to replace the app's code signature
    `codesign --deep -s - -f /path/to/build.app`
3. Also use a terminal command (rather than the Finder) to zip the file, to ensure that the full directory structure is captured
    `tar -czf build.tgz /path/to/build.app`
4. Distribute the resulting `.tgz` file, **along with the following instructions to recipients**

    a. download this `.tgz` file

    b. double-click the `.tgz` to unpack the `.app` file

    c. **IMPORTANT: right-click (_not_ double-click)** the `.app` file and choose "Open"

    d. in the security dialog that appears, again choose "Open"

    e. if prompted to give permission for the app to access the network, agree.


# Contribution
Contributions to the project are welcome as these projects are open source and we encourage community involvement.

1. Base your `feature/my-feature-name` branch off of `develop` branch
2. Make your changes
3. Open a PR against the `develop` branch
4. Discuss and Review the PR with the team

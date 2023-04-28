using UnityEngine;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using System;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

class CroquetBuildPreprocess : IPreprocessBuildWithReport
{
    public int callbackOrder { get { return 0; } }
    public void OnPreprocessBuild(BuildReport report)
    {
        BuildTarget target = report.summary.platform;
        if (target == BuildTarget.StandaloneWindows || target == BuildTarget.StandaloneWindows64)
        {
            string src = "Assets/Croquet/NodeJS/node.exe";
            string dest = "Assets/StreamingAssets/croquet-bridge/node/node.exe";
            FileUtil.CopyFileOrDirectory(src, dest);
        }
    }
}

[InitializeOnLoad]
public static class SceneAndPlayWatcher
{
    // register event handlers when the class is initialized
    static SceneAndPlayWatcher()
    {
        // because this is rebuilt on Play, it turns out that we miss the ExitingEditMode event.
        // but we can detect whether the init is happening because of an imminent state change
        // https://gamedev.stackexchange.com/questions/157266/unity-why-does-playmodestatechanged-get-called-after-start
        EditorApplication.playModeStateChanged += HandlePlayModeState;
        if (EditorApplication.isPlayingOrWillChangePlaymode)
        {
            CroquetBuilder.EnteringPlayMode();
        }

        EditorSceneManager.activeSceneChangedInEditMode += HandleSceneChange;
    }

    private static void HandlePlayModeState(PlayModeStateChange state)
    {
        //if (state == PlayModeStateChange.ExitingEditMode)
        //{
        //    CroquetBuilder.EnteringPlayMode();
        //}
        if (state == PlayModeStateChange.EnteredEditMode)
        {
            CroquetBuilder.EnteredPlayMode();
        }
    }

    private static void HandleSceneChange(Scene current, Scene next)
    {
        CroquetBuilder.CacheSceneBridgeComponent(next);
    }
}

class CroquetBuildPostprocess : IPostprocessBuildWithReport
{
    public int callbackOrder { get { return 0; } }
    public void OnPostprocessBuild(BuildReport report)
    {
        BuildTarget target = report.summary.platform;
        if (target == BuildTarget.StandaloneWindows || target == BuildTarget.StandaloneWindows64)
        {
            string dest = "Assets/StreamingAssets/croquet-bridge/node/node.exe";
            FileUtil.DeleteFileOrDirectory(dest);
            FileUtil.DeleteFileOrDirectory(dest + ".meta");
        }
    }
}



public class CroquetMenu
{
    private const string BuildNowItem = "Croquet/Build JS Now";
    private const string BuildOnPlayItem = "Croquet/Build JS on Play";

    private const string StarterItem = "Croquet/Start JS Watcher";
    private const string StopperItemHere = "Croquet/Stop JS Watcher (this scene)";
    private const string StopperItemOther = "Croquet/Stop JS Watcher (other scene)";

    [MenuItem(BuildNowItem)]
    private static void BuildNow()
    {
        CroquetBuilder.StartBuild(false); // false => no watcher
    }

    [MenuItem(BuildNowItem, true)]
    private static bool ValidateBuildNow()
    {
        // this item is not available if either
        //   we don't know how to build for the current scene, or
        //   a watcher for any scene is running (MacOS only), or
        //   a build has been requested and hasn't finished yet 
        if (!CroquetBuilder.KnowHowToBuildJS()) return false;
        
#if !UNITY_EDITOR_WIN
        if (CroquetBuilder.RunningWatcherApp() != "") return false;
#endif
        if (CroquetBuilder.oneTimeBuildProcess != null) return false;
        return true;
    }

    [MenuItem(BuildOnPlayItem)]
    private static void BuildOnPlayToggle()
    {
        CroquetBuilder.BuildOnPlayEnabled = !CroquetBuilder.BuildOnPlayEnabled;
    }

    [MenuItem(BuildOnPlayItem, true)]
    private static bool ValidateBuildOnPlayToggle()
    {
        if (!CroquetBuilder.KnowHowToBuildJS()) return false;

        Menu.SetChecked(BuildOnPlayItem, CroquetBuilder.BuildOnPlayEnabled);
        return true;
    }

#if !UNITY_EDITOR_WIN
    [MenuItem(StarterItem)]
    private static void StartWatcher()
    {
        CroquetBuilder.StartBuild(true); // true => start watcher
    }

    [MenuItem(StarterItem, true)]
    private static bool ValidateStartWatcher()
    {
        if (!CroquetBuilder.KnowHowToBuildJS()) return false;

        // Debug.Log($"CroquetBuilder has process: {CroquetBuilder.builderProcess != null}");
        return CroquetBuilder.RunningWatcherApp() == "";
    }

    [MenuItem(StopperItemHere)]
    private static void StopWatcherHere()
    {
        CroquetBuilder.StopWatcher();
    }

    [MenuItem(StopperItemHere, true)]
    private static bool ValidateStopWatcherHere()
    {
        if (!CroquetBuilder.KnowHowToBuildJS()) return false;

        return CroquetBuilder.RunningWatcherApp() == CroquetBuilder.GetSceneBuildDetails().appName;
    }

    [MenuItem(StopperItemOther)]
    private static void StopWatcherOther()
    {
        CroquetBuilder.StopWatcher();
    }

    [MenuItem(StopperItemOther, true)]
    private static bool ValidateStopWatcherOther()
    {
        if (!CroquetBuilder.KnowHowToBuildJS()) return false;

        string appName = CroquetBuilder.RunningWatcherApp();
        return appName != "" && appName != CroquetBuilder.GetSceneBuildDetails().appName;
    }
#endif
}

using System;
using System.IO;
using System.Diagnostics;
using System.Text;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEditor;
using Debug = UnityEngine.Debug;

public class CroquetBuilder
{
#if UNITY_EDITOR
    // on MacOS we offer the user the chance to start a webpack watcher that will
    // re-bundle the Croquet app automatically whenever the code is updated.
    // the console output from webpack is shown in the Unity console.  we do not
    // currently support the watcher on Windows, because we have not yet found a way
    // to stream the console output from a long-running webpack process.
    //
    // on both platforms we provide options for explicitly re-bundling by invocation
    // from the Croquet menu (for example, before hitting Build), or automatically
    // whenever the Play button is pressed.
    public static Process oneTimeBuildProcess;
    private static string sceneName;
    private static CroquetBridge sceneBridgeComponent;
    private static string sceneAppName;
    private static string sceneBuilderPath;
    
    private const string ID_PROP = "JS Builder Id";
    private const string APP_PROP = "JS Builder App";
    private const string LOG_PROP = "JS Builder Log";
    private const string BUILD_ON_PLAY = "JS Build on Play";

    public static bool BuildOnPlayEnabled
    {
        get { return EditorPrefs.GetBool(BUILD_ON_PLAY, false); }
        set { EditorPrefs.SetBool(BUILD_ON_PLAY, value); }
    }

    public static void CacheSceneBridgeComponent(Scene scene)
    {
        CroquetBridge bridgeComp = null;
        GameObject[] roots = scene.GetRootGameObjects();
        // we assume that the bridge has the tag Bridge (presumably faster than trying
        // GetComponent() on every object)
        // ...but note that this doesn't guarantee that it has, specifically, a
        // CroquetBridge component.
        GameObject bridge = Array.Find<GameObject>(roots, o => o.CompareTag("Bridge"));
        if (bridge != null)
        {
            bridgeComp = bridge.GetComponent<CroquetBridge>();
        }

        sceneName = scene.name;
        sceneBridgeComponent = bridgeComp;
    }

    public struct JSBuildDetails
    {
        public JSBuildDetails(string name, string path, bool useNode, string pathToNode)
        {
            appName = name;
            builderPath = path;
            useNodeJS = useNode;
            nodeExecutable = pathToNode;
        }

        public string appName;
        public string builderPath;
        public bool useNodeJS;
        public string nodeExecutable;
    }

    public static JSBuildDetails GetSceneBuildDetails()
    {
        Scene activeScene = SceneManager.GetActiveScene();
        if (activeScene.name != sceneName)
        {
            // look in the scene for an object with a CroquetBridge component,
            // and if found return its appName and builderPath values
            CacheSceneBridgeComponent(activeScene);
        }

        if (sceneBridgeComponent)
        {
#if UNITY_EDITOR_OSX
            string pathToNode = sceneBridgeComponent.appProperties.pathToNode;
#else
            string pathToNode = "";
#endif
            return new JSBuildDetails(sceneBridgeComponent.appName, sceneBridgeComponent.builderPath,
                sceneBridgeComponent.useNodeJS, pathToNode);
        }
        else return new JSBuildDetails("", "", false, "");
    }

    public static bool KnowHowToBuildJS()
    {
        JSBuildDetails details = GetSceneBuildDetails();
        return details.appName != "" && details.builderPath != "";
    }
    
    public static void StartBuild(bool startWatcher)
    {
        if (oneTimeBuildProcess != null) return; // already building

        JSBuildDetails details = GetSceneBuildDetails();
        string appName = details.appName;
        string builderPathOffset = details.builderPath;
        if (appName == "" || builderPathOffset == "") return; // don't know how to build

        string croquetRoot = Path.GetFullPath(Path.Combine(Application.streamingAssetsPath, $"../../../croquet/"));
        string builderPath = Path.Combine(croquetRoot, builderPathOffset);
    
        string nodeExecPath;
        string executable;
        string arguments = "";
        string target = "";
        string logFile = "";
        switch (Application.platform)
        {
            case RuntimePlatform.OSXEditor:
                nodeExecPath = details.nodeExecutable;
                executable = Path.Combine(builderPath, "runwebpack.sh");
                target = details.useNodeJS ? "node" : "web";
                break;
            case RuntimePlatform.WindowsEditor:
                nodeExecPath = Path.Combine(Application.streamingAssetsPath, "..", "Croquet", "NodeJS", "node.exe");
                executable = "powershell.exe";
                target = "node"; // actually not used
                arguments = $"-NoProfile -file \"runwebpack.ps1\" ";
                break;
            default:
                throw new PlatformNotSupportedException("Don't know how to support automatic builds on this platform");
        }

        // arguments to the runwebpack script, however it is invoked:
        // 1. full path to the platform-relevant node engine
        // 2. app name
        // 3. build target: 'node' or 'web'
        // 4. (iff starting a watcher) path to a temporary file to be used for output
        arguments += $"{nodeExecPath} {appName} {target} ";
        if (startWatcher)
        {
            logFile = Path.GetTempFileName();
            arguments += logFile;
        }
        else
        {
            Debug.Log($"building {appName} for {target}");
        }

        Process builderProcess = new Process();
        if (!startWatcher) oneTimeBuildProcess = builderProcess;
        builderProcess.StartInfo.UseShellExecute = false;
        builderProcess.StartInfo.RedirectStandardOutput = true;
        builderProcess.StartInfo.RedirectStandardError = true;
        builderProcess.StartInfo.CreateNoWindow = true;
        builderProcess.StartInfo.WorkingDirectory = builderPath;
        builderProcess.StartInfo.FileName = executable;
        builderProcess.StartInfo.Arguments = arguments;
        builderProcess.Start();

        string output = builderProcess.StandardOutput.ReadToEnd();
        string errors = builderProcess.StandardError.ReadToEnd();
        builderProcess.WaitForExit();

        if (!startWatcher)
        {
            oneTimeBuildProcess = null;

            string[] newLines = output.Split('\n');
            foreach (string line in newLines)
            {
                if (!string.IsNullOrWhiteSpace(line)) Debug.Log("JS builder: " + line);
            }
            newLines = errors.Split('\n');
            foreach (string line in newLines)
            {
                if (!string.IsNullOrWhiteSpace(line)) Debug.Log("JS builder error: " + line);
            }
        }
        else
        {
            string prefix = "webpack=";
            if (output.StartsWith(prefix))
            {
                int processId = int.Parse(output.Substring(prefix.Length));
                Debug.Log($"started JS watcher for {appName} as process {processId}");
                EditorPrefs.SetInt(ID_PROP, processId);
                EditorPrefs.SetString(APP_PROP, appName);
                EditorPrefs.SetString(LOG_PROP, logFile);

                WatchLogFile(logFile, 0);
            }
        }
    }
    
    public static void WaitUntilBuildComplete()
    {
        // if a one-time build is in progress, await its exit.
        // when running a watcher (MacOS only), this function will *not* wait at
        // any point.  it is the user's responsibility when starting the watcher
        // to hold off from any action that needs the build until the console shows
        // that it has completed.  thereafter, rebuilds tend to happen so quickly
        // that there is effectively no chance for an incomplete build to be used.
        if (oneTimeBuildProcess != null)
        {
            Debug.Log("waiting for one-time build to complete");
            oneTimeBuildProcess.WaitForExit();
        }
    }

    private static async void WatchLogFile(string filePath, long initialLength)
    {
        string appName = EditorPrefs.GetString(APP_PROP, "");
        long lastFileLength = initialLength;
        Debug.Log($"watching build log for {appName} from position {lastFileLength}");
        
        while (true)
        {
            if (EditorPrefs.GetString(LOG_PROP, "") != filePath)
            {
                Debug.Log($"stopping log watcher for {appName}");
                break;
            } 
            
            try
            {
                FileInfo info = new FileInfo(filePath);
                long length = info.Length;
                // Debug.Log($"log file length = {length}");
                if (length > lastFileLength)
                {
                    using (FileStream fs = info.OpenRead())
                    {
                        fs.Seek(lastFileLength, SeekOrigin.Begin);
                        byte[] b = new byte[length - lastFileLength];
                        UTF8Encoding temp = new UTF8Encoding(true);
                        while (fs.Read(b, 0, b.Length) > 0)
                        {
                            string[] newLines = temp.GetString(b).Split('\n');
                            foreach (string line in newLines)
                            {
                                if (!string.IsNullOrWhiteSpace(line)) Debug.Log("JS watcher: " + line);
                            }
                        }
                        fs.Close();
                    }

                    lastFileLength = length;
                }
            }
            catch (Exception e)
            {
                Debug.Log($"log watcher error: {e}");
            }
            finally
            {
                await System.Threading.Tasks.Task.Delay(1000);
            }
        }
    }
    
    public static void EnteringPlayMode()
    {
        // rebuild-on-Play is only available if a watcher *isn't* running
        string logFile = EditorPrefs.GetString(LOG_PROP, "");
        if (logFile == "" && BuildOnPlayEnabled)
        {
            Debug.Log("rebuilding JS code");
            StartBuild(false); // false => no watcher
        }
    }

    public static void EnteredPlayMode()
    {
        // if there is a watcher, re-establish the process reporting its logs
        string logFile = EditorPrefs.GetString(LOG_PROP, "");
        if (logFile != "")
        {
            FileInfo info = new FileInfo(logFile);
            WatchLogFile(logFile, info.Length);
        }
    }

    public static void StopWatcher()
    {
        Process process = RunningWatcherProcess();
        if (process != null)
        {
            Debug.Log($"stopping JS watcher for {EditorPrefs.GetString(APP_PROP)}");
            process.Kill();
            process.Dispose();
        }

        string logFile = EditorPrefs.GetString(LOG_PROP, "");
        if (logFile != "") FileUtil.DeleteFileOrDirectory(logFile);
        
        EditorPrefs.SetInt(ID_PROP, -1);
        EditorPrefs.SetString(APP_PROP, "");
        EditorPrefs.SetString(LOG_PROP, "");
    }

    private static Process RunningWatcherProcess()
    {
        Process process = null;
        int lastBuildId = EditorPrefs.GetInt(ID_PROP, -1);
        if (lastBuildId != -1)
        {
            try
            {
                // this line will throw if the process is no longer running
                Process builderProcess = Process.GetProcessById(lastBuildId);
                // to reduce the risk that the process id we had is now being used for
                // some random other process (which we therefore shouldn't kill), confirm
                // that it has the name "node" associated with it.
                if (builderProcess.ProcessName == "node" && !builderProcess.HasExited)
                {
                    process = builderProcess;
                }
            }
            catch(Exception e)
            {
                Debug.Log($"process has disappeared ({e})");
            }

            if (process == null)
            {
                // the id we had is no longer valid
                EditorPrefs.SetInt(ID_PROP, -1);
                EditorPrefs.SetString(APP_PROP, "");
                EditorPrefs.SetString(LOG_PROP, "");
            }
        }

        return process;
    }

    public static string RunningWatcherApp()
    {
        // return the app being served by the running builder process, if any.
        // this is the recorded Builder App, as long as the recorded Builder Id
        // corresponds to a running process that has the name "node".
        // if the process was not found, we will have reset both the Path and Id.
        Process builderProcess = RunningWatcherProcess();
        return builderProcess == null ? "" : EditorPrefs.GetString(APP_PROP);
    }
    
    private static void OutputHandler(object sendingProcess,
        DataReceivedEventArgs outLine)
    {
        if (!String.IsNullOrEmpty(outLine.Data))
        {
            Debug.Log("watcher: " + outLine.Data);
        }
    }

#endif
}

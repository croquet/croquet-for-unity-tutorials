using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Text;
using Unity.VisualScripting;
using UnityEngine;
using WebSocketSharp;
using WebSocketSharp.Server;
using UnityEngine.Networking;
using UnityEngine.AddressableAssets;
using UnityEngine.InputSystem;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.ResourceManagement.ResourceLocations;
using WebSocketSharp.Net;


public class CroquetBridge : MonoBehaviour
{
    public CroquetAppProperties appProperties;
    public string appName;
    public string builderPath;
    public bool useNodeJS;
    public bool croquetSessionReady = false;

    public bool showRigidbodyStateHighlight = false;

    HttpServer ws = null;
    WebSocketBehavior wsb = null; // not currently used
    static WebSocket clientSock = null;
    //static int sockMessagesReceived = 0;
    //static int sockMessagesSent = 0;
    public class QueuedMessage
    {
        public long queueTime;
        public bool isBinary;
        public byte[] rawData;
        public string data;
    }
    
    static ConcurrentQueue<QueuedMessage> messageQueue = new ConcurrentQueue<QueuedMessage>();
    static System.Diagnostics.Stopwatch stopWatch = new System.Diagnostics.Stopwatch();
    static long estimatedTeatimeAtStopwatchZero = -1; // an impossible value

    List<string> deferredMessages = new List<string>();
    static float messageThrottle = 0.05f; // 50ms
    float lastMessageSend = 0; // realtimeSinceStartup
    
    Dictionary<string, GameObject> croquetObjects = new Dictionary<string, GameObject>();
    public string localAvatarId = "";
    public string cameraOwnerId = "";
    Dictionary<string, Vector3> desiredScale = new Dictionary<string, Vector3>();
    Dictionary<string, Quaternion> desiredRot = new Dictionary<string, Quaternion>();
    Dictionary<string, Vector3> desiredPos = new Dictionary<string, Vector3>();

    static CroquetBridge bridge = null;
    private CroquetRunner croquetRunner;

    private const string CAMERA_ID = "1"; // @@ needs to match up with Croquet side

    public static void SendCroquet(params string[] strings)
    {
        if (bridge == null) return;
        bridge.SendToCroquet(strings);    
    }
    
    // settings for logging and measuring (on JS-side performance log).  absence of an entry for a
    // category is taken as false.
    Dictionary<string, bool> logOptions = new Dictionary<string, bool>();
    static string[] logCategories = new string[] { "info", "session", "diagnostics", "debug", "verbose" };
    Dictionary<string, bool> measureOptions = new Dictionary<string, bool>();
    static string[] measureCategories = new string[] { "update", "bundle", "geom" };

    // diagnostics counters
    int outMessageCount = 0;
    int outBundleCount = 0;
    int inBundleCount = 0;
    int inMessageCount = 0;
    long inBundleDelayMS = 0;
    float inProcessingTime = 0;
    float lastMessageDiagnostics; // realtimeSinceStartup
    
    private Dictionary<string, GameObject> addressableAssets;
    private bool addressablesReady = false;
    
    void Awake()
    {
        bridge = this;
        croquetRunner = this.gameObject.GetComponent<CroquetRunner>();
        SetLogOptions("info,session");
        // SetMeasureOptions("bundle,geom"); $$$ typically useful for development
        stopWatch.Start();
        
        addressableAssets = new Dictionary<string, GameObject>();
        StartCoroutine(LoadAddressableAssetsWithLabel(appName));
    }
    
    IEnumerator LoadAddressableAssetsWithLabel(string label)
    {
        // @@ LoadAssetsAsync throws an error - asynchronously - if there are
        // no assets that match the key.  One way to avoid that error is to run
        // the following code to get a list of locations matching the key.
        // If the list is empty, don't run the LoadAssetsAsync.
        // Presumably there are more efficient ways to do this (in particular, when
        // there *are* matches.  Maybe by using the list?

        //Returns any IResourceLocations that are mapped to the supplied label
        AsyncOperationHandle<IList<IResourceLocation>> handle = Addressables.LoadResourceLocationsAsync(label);
        yield return handle;

        IList<IResourceLocation> result = handle.Result;
        int prefabs = 0;
        foreach (var loc in result) {
            if (loc.ToString().EndsWith(".prefab")) prefabs++;
        }
        // int count = result.Count;
        // Debug.Log($"Found {prefabs} addressable prefabs");
        Addressables.Release(handle);

        if (prefabs != 0)
        {
            // Load any assets labelled with this appName from the Addressable Assets
            Addressables.LoadAssetsAsync<GameObject>(label, null).Completed += objects =>
            {
                foreach (var go in objects.Result)
                {
                    Debug.Log($"Addressable Loaded: {go.name}");
                    addressableAssets.Add(go.name, go);
                }

                addressablesReady = true;
            };
        }
        else
        {
            Debug.Log("No addressable assets found");
            addressablesReady = true;
        }
    }
    
    void Start()
    {
        // Frame cap
        Application.targetFrameRate = 60;

        lastMessageDiagnostics = Time.realtimeSinceStartup;

        croquetObjects[CAMERA_ID] = GameObject.FindWithTag("MainCamera"); // @@ hack
        
        // StartWS will be called to set up the websocket, and hence the session,
        // from Update() once we're sure the addressables are loaded.
    }
    
    private void OnDestroy()
    {
        if (ws != null)
        {
            ws.Stop();
        }
    }

    public class CroquetBridgeWS : WebSocketBehavior
    {

        protected override void OnOpen()
        {
            // hint from https://github.com/sta/websocket-sharp/issues/236
            clientSock = Context.WebSocket;

            bridge.Log("session", "server socket opened");

            string apiKey = bridge.appProperties.apiKey;
            string appId = bridge.appProperties.appPrefix + "." + bridge.appName;
            string sessionName = bridge.sessionNameValue.ToString();
            
            string[] command = new string[] {
                "readyForSession",
                apiKey,
                appId,
                sessionName    
            };

            string msg = String.Join('\x01', command);
            clientSock.Send(msg);
        }

        protected override void OnMessage(MessageEventArgs e)
        {
            // bridge.Log("verbose", "received message in Unity: " + (e.IsBinary ? "binary" : e.Data));
            HandleMessage(e);
        }

        protected override void OnClose(CloseEventArgs e)
        {
            bridge.Log("session", System.String.Format("server socket closed {0}: {1}", e.Code, e.Reason));
        }
    }

    private int sessionNameValue = -999; // @@ when running in the editor it would be good to see this; figure out how to make it read-only
    
    void StartWS()
    {
        // could try this workaround (effectively disabling Nagel), as suggested at
        // https://github.com/sta/websocket-sharp/issues/327
        //var listener = typeof(WebSocketServer).GetField("_listener", BindingFlags.NonPublic | BindingFlags.Instance).GetValue(ws) as System.Net.Sockets.TcpListener;
        //listener.Server.NoDelay = true;

        // recover a specific session name from PlayerPrefs
        sessionNameValue = PlayerPrefs.GetInt("sessionNameValue", 1);
        //Debug.Log($"SESSION NAME VAL: {sessionNameValue}");
        
        Log("session", "building WS Server on open port");
        int port = appProperties.preferredPort;
        int maximumTries = 9;
        bool goodPortFound = false;
        while (!goodPortFound && maximumTries>0)
        {
            HttpServer wsAttempt = null;
            try
            {
                wsAttempt = new HttpServer(port);
                wsAttempt.AddWebSocketService<CroquetBridgeWS>("/Bridge", s => wsb = s);
                wsAttempt.KeepClean = false; // see comment in https://github.com/sta/websocket-sharp/issues/43
                wsAttempt.DocumentRootPath = Application.streamingAssetsPath; // set now, before Start()
                
                wsAttempt.Start();

                goodPortFound = true;
                ws = wsAttempt; 
            }
            catch (Exception e)
            {
                Debug.Log($"Exception detected for port {port}:{e}");
                port++;
                maximumTries--;
                wsAttempt.Stop();
            }
        }

        ws.OnGet += OnGetHandler;

        Log("session", $"started HTTP/WS Server on port {port}");

        if (Application.platform == RuntimePlatform.WindowsEditor
            || Application.platform == RuntimePlatform.WindowsPlayer)
        {
            useNodeJS = true;
        }
        
#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
        string pathToNode = appProperties.pathToNode;
#else
        string pathToNode = "";
#endif

        StartCoroutine(croquetRunner.StartCroquetConnection(port, appName, useNodeJS, pathToNode));
    }

    void OnGetHandler(object sender, HttpRequestEventArgs e)
    {
        var req = e.Request;
        var res = e.Response;

        var path = req.Url.LocalPath;

        if (path == "/")
            path += "index.html";

        byte[] contents;

#if UNITY_ANDROID && !UNITY_EDITOR
        string src = Application.streamingAssetsPath + path;
        // Debug.Log("attempting to fetch " + src);
        var unityWebRequest = UnityWebRequest.Get(src);
        unityWebRequest.SendWebRequest();
        // until we figure out a way to incorporate an await or yield without
        // accidentally losing the HttpRequest along the way, using a busy-wait
        // is blunt but appears to get the job done.
        // note: "[isDone] will return true both when the UnityWebRequest
        // finishes successfully, or when it encounters a system error."
        while (!unityWebRequest.isDone) { }
        if (unityWebRequest.result != UnityWebRequest.Result.Success)
        {
            if (unityWebRequest.error != null) UnityEngine.Debug.Log(src + ": " + unityWebRequest.error);
            contents = new byte[0];
            res.StatusCode = (int) HttpStatusCode.NotFound; // whatever the error
        }
        else
        {
            contents = unityWebRequest.downloadHandler.data; // binary
        }
        unityWebRequest.Dispose();
#else
        if (!e.TryReadFile (path, out contents)) {
            res.StatusCode = (int) HttpStatusCode.NotFound;
        }
#endif

        if (path.EndsWith (".html")) {
            res.ContentType = "text/html";
            res.ContentEncoding = Encoding.UTF8;
        }
        else if (path.EndsWith (".js")) {
            res.ContentType = "application/javascript";
            res.ContentEncoding = Encoding.UTF8;
        }
        else if (path.EndsWith (".wasm")) {
            res.ContentType = "application/wasm";
        }

        res.ContentLength64 = contents.LongLength;

        res.Close (contents, true);
    }

    // WebSocket messages come in on a separate thread.  Put each message on a queue to be
    // read by the main thread.
    // static because called from a class that doesn't know about this instance.
    static void HandleMessage(MessageEventArgs e) // string message)
    {
        string data = "";
        if (e.IsText)
        {
            data = e.Data;
            if (data.StartsWith("_teatime"))
            {
                // @@ we can do much better than this.  for a start, switch to
                // communicating the offset of teatime relative to system time (which JS and
                // C# appear to share).
                // these messages are sent once per second
                string[] strings = data.Split('\x01');
                long teatime = long.Parse(strings[1]);
                long newEstimate = teatime - stopWatch.ElapsedMilliseconds;
                if (estimatedTeatimeAtStopwatchZero == -1) estimatedTeatimeAtStopwatchZero = newEstimate;
                else
                {
                    long oldEstimate = estimatedTeatimeAtStopwatchZero;
                    float ratio = 0.2f; // weight for the incoming value
                    estimatedTeatimeAtStopwatchZero =
                        (long)(ratio * newEstimate + (1f - ratio) * estimatedTeatimeAtStopwatchZero);
                    // if (Math.Abs(estimatedTeatimeAtStopwatchZero - oldEstimate) > 10)
                    // {
                    // Debug.Log($"TEATIME CHANGE: {estimatedTeatimeAtStopwatchZero - oldEstimate}ms");
                    // }
                }

                return;
            }
        }

        // add a time so we can tell how long it sits in the queue
        QueuedMessage qm = new QueuedMessage();
        qm.queueTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
        qm.isBinary = e.IsBinary;
        if (e.IsBinary) qm.rawData = e.RawData; 
        else qm.data = data;
        messageQueue.Enqueue(qm);
    }

    long EstimatedTeatime()
    {
        return estimatedTeatimeAtStopwatchZero + stopWatch.ElapsedMilliseconds;
    }

    public void SendToCroquet(params string[] strings)
    {
        deferredMessages.Add(PackCroquetMessage(strings));
        //if (deferredMessages.Count >= 50) SendDeferredMessages();
    }

    public string CroquetMessage(params string[] strings)
    {
        return PackCroquetMessage(strings);
    }

    public string PackCroquetMessage(string[] strings)
    {
        return String.Join('\x01', strings);
    }

    void SendDeferredMessages()
    {
        if (clientSock == null || clientSock.ReadyState != WebSocketState.Open || deferredMessages.Count == 0) return;
        float now = Time.realtimeSinceStartup;
        if (now - lastMessageSend < messageThrottle) return;

        lastMessageSend = now;

        outBundleCount++;
        outMessageCount += deferredMessages.Count;

        // preface every bundle with the current time
        deferredMessages.Insert(0, DateTimeOffset.Now.ToUnixTimeMilliseconds().ToString());
        string[] msgs = deferredMessages.ToArray<string>();
        clientSock.Send(String.Join('\x02', msgs));
        deferredMessages.Clear();
    }

    void Update()
    {
        // before WS has been started, check whether we're ready to do so
        if (sessionNameValue == -999)
        {
            if (addressablesReady) StartWS();
        }
        else
        {
            // session is notionally up and running
            UpdateGeometries();
        }
    }
    
    void FixedUpdate()
    {
        long start = DateTimeOffset.Now.ToUnixTimeMilliseconds(); // in case we'll be reporting to Croquet
        
        ProcessCroquetMessages();

        SendDeferredMessages();

        long duration = DateTimeOffset.Now.ToUnixTimeMilliseconds() - start;
        if (duration == 0) duration++;
        if (croquetSessionReady) Measure("update", start.ToString(), duration.ToString());

        float now = Time.realtimeSinceStartup;
        if (now - lastMessageDiagnostics > 1f)
        {
            if (inBundleCount > 0 || inMessageCount > 0)
            {
                Log("diagnostics", $"from Croquet: {inMessageCount} messages with {inBundleCount} bundles ({Mathf.Round((float)inBundleDelayMS / inBundleCount)}ms avg delay) handled in {Mathf.Round(inProcessingTime * 1000)}ms");
            }
            //Log("diagnostics", $"to Croquet: {outMessageCount} messages with {outBundleCount} bundles");
            lastMessageDiagnostics = now;
            inBundleCount = 0;
            inMessageCount = 0;
            inBundleDelayMS = 0; // long
            inProcessingTime = 0;
            outBundleCount = outMessageCount = 0;
        }
    }

    private void unused_FixedUpdate()
    {
        UpdateGeometries();
    }

    void ProcessCroquetMessages()
    {
        float start = Time.realtimeSinceStartup;
        QueuedMessage qm;
        while (messageQueue.TryDequeue(out qm))
        {
            long nowWhenQueued = qm.queueTime; // unixTimeMilliseconds
            long nowWhenDequeued = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            long queueDelay = nowWhenDequeued - nowWhenQueued;
            inBundleDelayMS += queueDelay;

            if (qm.isBinary)
            {
                byte[] rawData = qm.rawData;
                int sepPos = Array.IndexOf(rawData, (byte) 3);
                // Debug.Log(BitConverter.ToString(rawData));
                if (sepPos >= 1)
                {
                    byte[] timeAndCmdBytes = new byte[sepPos];
                    Array.Copy(rawData, timeAndCmdBytes, sepPos);
                    string[] strings = System.Text.Encoding.UTF8.GetString(timeAndCmdBytes).Split('\x02');
                    string command = strings[1];
                    int count = 0;
                    if (command == "updateGeometry") count = BundledUpdateGeometry(rawData, sepPos + 1);
                    
                    long sendTime = long.Parse(strings[0]);
                    long transmissionDelay = nowWhenQueued - sendTime;
                    long nowAfterProcessing = DateTimeOffset.Now.ToUnixTimeMilliseconds();
                    long processing = nowAfterProcessing - nowWhenDequeued;
                    long totalTime = nowAfterProcessing - sendTime;
                    string annotation = $"{count} objects, {rawData.Length - sepPos - 1} bytes. sock={transmissionDelay}ms, queue={queueDelay}ms, process={processing}ms";
                    Measure("geom", sendTime.ToString(), totalTime.ToString(), annotation); // @@ assumed to be geometry
                }
                continue;
            }

            string nextMessage = qm.data;
            string[] messages = nextMessage.Split('\x02');
            if (messages.Length > 1)
            {
                inBundleCount++;

                for (int i = 1; i < messages.Length; i++) ProcessCroquetCommand(messages[i]);

                // to measure message-processing performance, we gather
                //  JS now() when message was sent
                //  transmission delay (time until read and queued by C#)
                //  queue delay (time between queuing and dequeuing)
                //  processing time (time between dequeuing and completion)
                long sendTime = long.Parse(messages[0]); // first entry is just the JS Date.now() when sent
                long transmissionDelay = nowWhenQueued - sendTime;
                long nowAfterProcessing = DateTimeOffset.Now.ToUnixTimeMilliseconds();
                long processing = nowAfterProcessing - nowWhenDequeued;
                long totalTime = nowAfterProcessing - sendTime;
                string annotation = $"{messages.Length - 1} msgs in {nextMessage.Length} chars. sock={transmissionDelay}ms, queue={queueDelay}ms, process={processing}ms";
                Measure("bundle", sendTime.ToString(), totalTime.ToString(), annotation);
            }
            else
            {
                ProcessCroquetCommand(messages[0]);
            }            
        }
        inProcessingTime += Time.realtimeSinceStartup - start;
    }

    void ProcessCroquetCommand(string msg)
    {
        // a command message is an array of strings separated by \x01, of which the first is the command
        string[] strings = msg.Split('\x01');
        string command = strings[0]; // or a single piece of text, for logging
        string[] args = strings[1..];
        Log("verbose", command + ": " + String.Join(", ", args));
        if (command == "updateGeometry") UpdateGeometry(args);
        else if (command == "makeObject") MakeObject(args);
        else if (command == "registerAsAvatar") RegisterAsAvatar(args[0]);
        else if (command == "unregisterAsAvatar") UnregisterAsAvatar(args[0]);
        else if (command == "grabCamera") GrabCamera(args);
        else if (command == "releaseCamera") ReleaseCamera(args);
        else if (command == "setParent") SetParent(args);
        else if (command == "unparent") Unparent(args);
        else if (command == "destroyObject") DestroyObject(args);
        else if (command == "croquetPing") HandleCroquetPing(args[0]);
        else if (command == "setLogOptions") SetLogOptions(args[0]);
        else if (command == "setMeasureOptions") SetMeasureOptions(args[0]);
        else if (command == "joinProgress") {} // ignore
        else if (command == "croquetSessionReady")
        {
            Log("session", "Croquet session ready");
            croquetSessionReady = true;
        }
        else if (command == "setColor") SetColor(args); // introduced for tutorial4
        else if (command == "makeClickable") MakeClickable(args); // introduced for tutorial5
        else
        {
            // not a known command; maybe just text for logging
            Log("info", "[Croquet] " + msg);
        }

        inMessageCount++;
    }

    [System.Serializable]
    public class ObjectSpec
    {
        public string id; // currently an integer, but no point converting all the time
        public string cN; // Croquet name (generally, the model id)
        public bool cC; // confirmCreation: whether Croquet is waiting for a confirmCreation message for this 
        public bool wTA; // waitToActivate:  whether to make visible immediately, or only on first posn update
        public string type;
        public string cs; // comma-separated list of extra components
        public float[] c; // color;
        public float a; // alpha;
        public float[] s; // scale;
        public float[] r; // rotation;
        public float[] t; // translation;
    }

    void MakeObject(string[] args)
    {
        ObjectSpec spec = JsonUtility.FromJson<ObjectSpec>(args[0]);
        Log("debug", $"making object {spec.id}");

        // try to find a prefab with the given name
        GameObject obj = null;
        if (!spec.type.StartsWith("primitive"))
        {
            obj = Instantiate(addressableAssets[spec.type]);
        }
        if (obj == null)
        {
            Log("debug", $"Specified spec.type ({spec.type}) is not found as a prefab!");
            PrimitiveType type = PrimitiveType.Cube;
            if (spec.type == "primitiveSphere") type = PrimitiveType.Sphere;

            obj = new GameObject(spec.type);
            obj.AddComponent<CroquetGameObject>();
            GameObject inner = GameObject.CreatePrimitive(type);
            inner.transform.parent = obj.transform;
        }

        CroquetGameObject cgo = obj.GetComponent<CroquetGameObject>();
        cgo.croquetGameHandle = spec.id;
        if (spec.type.StartsWith("primitive")) cgo.recolorable = true; // all primitives can take arbitrary colour
        if (spec.cN != "") cgo.croquetActorId = spec.cN;

        if (spec.cs != "")
        {
            string[] comps = spec.cs.Split(',');
            foreach (string compName in comps)
            {
                try
                {
                    obj.AddComponent(Type.GetType(compName));
                }
                catch (Exception e)
                {
                    Debug.Log($"Error in adding component {compName}: {e}");
                }
            }
        }

        if (cgo.recolorable)
        {
            Material material = obj.GetComponentInChildren<Renderer>().material;
            if (spec.a != 1f)
            {
                // sorcery from https://forum.unity.com/threads/standard-material-shader-ignoring-setfloat-property-_mode.344557/
                material.SetOverrideTag("RenderType", "Transparent");
                material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.One);
                material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                material.SetInt("_ZWrite", 0);
                material.DisableKeyword("_ALPHATEST_ON");
                material.DisableKeyword("_ALPHABLEND_ON");
                material.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                material.renderQueue = 3000;
            }

            Color color = new Color(spec.c[0], spec.c[1], spec.c[2], spec.a);
            material.SetColor("_Color", color);
        }

        obj.SetActive(!spec.wTA);

        croquetObjects[spec.id] = obj;

        obj.transform.localScale = new Vector3(spec.s[0], spec.s[1], spec.s[2]);
        // normalise the quaternion because it's potentially being sent with reduced precision
        obj.transform.localRotation = Quaternion.Normalize(new Quaternion(spec.r[0], spec.r[1], spec.r[2], spec.r[3]));
        obj.transform.localPosition = new Vector3(spec.t[0], spec.t[1], spec.t[2]);

        if (spec.cC)
        {
            SendToCroquet("objectCreated", spec.id.ToString(), DateTimeOffset.Now.ToUnixTimeMilliseconds().ToString());
        }
    }

    public GameObject FindObject(string id)
    {
        GameObject obj;
        if (croquetObjects.TryGetValue(id, out obj)) return obj;
        Log("debug", $"Failed to find object {id}");
        return null;
    }
    
    void RegisterAsAvatar(string id)
    {
        if (localAvatarId == id) return; // already registered

        GameObject obj = FindObject(id);
        if (obj == null) return;

        localAvatarId = id;
    }

    void UnregisterAsAvatar(string id)
    {
        if (localAvatarId != id) return; // has already been switched

        localAvatarId = "";
    }

    void GrabCamera(string[] args)
    {
        string id = args[0];
        if (cameraOwnerId == id) return; // already registered

        GameObject obj = FindObject(id);
        if (obj == null) return;

        cameraOwnerId = id;

        string[] rot = args[1].Split(',');
        string[] pos = args[2].Split(',');
        
        GameObject camera = GameObject.FindWithTag("MainCamera");
        camera.transform.SetParent(obj.transform, false); // false => ignore child's existing world position
        List<string> geomUpdate = new List<string>();
        geomUpdate.Add(CAMERA_ID);
        geomUpdate.Add("rotationSnap");
        geomUpdate.AddRange(rot);
        geomUpdate.Add("translationSnap"); // the keyword we'd get from Croquet
        geomUpdate.AddRange(pos);
        UpdateGeometry(geomUpdate.ToArray());
    }

    void ReleaseCamera(string[] args)
    {
        string id = args[0];
        if (cameraOwnerId != id) return; // has already been switched

        cameraOwnerId = "";
        GameObject camera = GameObject.FindWithTag("MainCamera");
        camera.transform.parent = null;
    }

    void SetParent(string[] args)
    {
        GameObject child = FindObject(args[0]);
        GameObject parent = FindObject(args[1]);
        if (parent && child)
        {
            child.transform.SetParent(parent.transform, false); // false => ignore child's existing world position
        }
    }
    
    void Unparent(string[] args)
    {
        GameObject child = FindObject(args[0]);
        if (child)
        {
            child.transform.SetParent(null);
        }
    }

    void DestroyObject(string[] args)
    {
        string id = args[0];
        Log("debug", "destroying object " + id.ToString());
        if (cameraOwnerId == id)
        {
            cameraOwnerId = "";
            GameObject camera = GameObject.FindWithTag("MainCamera");
            camera.transform.parent = null;
        }
        if (croquetObjects.ContainsKey(id))
        {
            GameObject obj = croquetObjects[id];
            Destroy(obj);
            desiredScale.Remove(id);
            desiredRot.Remove(id);
            desiredPos.Remove(id);
            croquetObjects.Remove(id);
        }
        else
        {
            // asking to destroy a pawn for which there's no view can happen just because of
            // creation/destruction timing in worldcore.  not necessarily a problem.
            Log("debug", $"attempt to destroy absent object {id}");
        }
    }
    
    void ProcessKeyboard()
    {
        foreach (var key in Keyboard.current.allKeys)
        {
            if (key.wasPressedThisFrame)
            {
                // Debug.Log($"Key code: {key.keyCode}");
                SendToCroquet("event", "keyDown", key.keyCode.ToString());
            }
        }
    }
    
    Vector3 Vector3FromBuffer(byte[] rawData, int startPos)
    {
        return new Vector3(
            BitConverter.ToSingle(rawData, startPos),
            BitConverter.ToSingle(rawData, startPos + 4),
            BitConverter.ToSingle(rawData, startPos + 8)
        );
    }

    Quaternion QuaternionFromBuffer(byte[] rawData, int startPos)
    {
        return new Quaternion(
            BitConverter.ToSingle(rawData, startPos),
            BitConverter.ToSingle(rawData, startPos + 4),
            BitConverter.ToSingle(rawData, startPos + 8),
            BitConverter.ToSingle(rawData, startPos + 12)
        );
    }

    int BundledUpdateGeometry(byte[] rawData, int startPos)
    {
        const uint SCALE = 32;
        const uint SCALE_SNAP = 16;
        const uint ROT = 8;
        const uint ROT_SNAP = 4;
        const uint POS = 2;
        const uint POS_SNAP = 1;
        
        int objectCount = 0;
        int bufferPos = startPos; // byte index through the buffer
        while (bufferPos < rawData.Length)
        {
            // first number encodes object id and (in bits 0-5) whether there is an update (with/without
            // a snap) for each of scale, rotation, translation.  this leaves room for 2**26
            // possible ids - i.e., around 67 million.  that seems more than enough for any given
            // instant, but if some app creates and destroys thousands of entities per second, we
            // would need some kind of id recycling so we don't run out.
            UInt32 encodedId = BitConverter.ToUInt32(rawData, bufferPos);
            bufferPos += 4;
            string id = (encodedId >> 6).ToString();
            if (croquetObjects.ContainsKey(id))
            {
                bool do_log = id == CAMERA_ID; // $$$ hack
                objectCount++;
                
                Transform trans = croquetObjects[id].transform;
                if ((encodedId & SCALE) != 0)
                {
                    Vector3 s = Vector3FromBuffer(rawData, bufferPos);
                    bufferPos += 12;
                    if ((encodedId & SCALE_SNAP) != 0)
                    {
                        trans.localScale = s;
                        desiredScale.Remove(id);
                    }
                    else
                    {
                        desiredScale[id] = s;
                    }
                    // Log("verbose", "scale: " + s.ToString());
                }
                if ((encodedId & ROT) != 0)
                {
                    Quaternion r = QuaternionFromBuffer(rawData, bufferPos);
                    bufferPos += 16;
                    if ((encodedId & ROT_SNAP) != 0)
                    {
                        trans.localRotation = r;
                        desiredRot.Remove(id);
                    }
                    else
                    {
                        desiredRot[id] = r;
                    }
                    // Log("verbose", "rot: " + r.ToString());
                }
                if ((encodedId & POS) != 0)
                {
                    // in Unity it's referred to as position
                    Vector3 p = Vector3FromBuffer(rawData, bufferPos);
                    // if (do_log) Debug.Log($"camera to {p} with snap: {(encodedId & POS_SNAP) != 0}");
                    bufferPos += 12;
                    if ((encodedId & POS_SNAP) != 0)
                    {
                        trans.localPosition = p;
                        desiredPos.Remove(id);
                    }
                    else
                    {
                        desiredPos[id] = p;
                    }
                    // Log("verbose", "pos: " + p.ToString());
                }
            }
            else Log("debug", $"attempt to update absent object {id}");
        }

        return objectCount;
    }

    void UpdateGeometry(string[] strings)
    {
        string id = strings[0];
        if (croquetObjects.ContainsKey(id))
        {
            bool do_log = id == CAMERA_ID; // $$$ hack

            Transform trans = croquetObjects[id].transform;
            for (int i = 1; i < strings.Length;)
            {
                string aspect = strings[i];
                if (aspect == "scale" || aspect == "scaleSnap")
                {
                    Vector3 s = new Vector3(float.Parse(strings[i + 1]), float.Parse(strings[i + 2]), float.Parse(strings[i + 3]));
                    i += 4;
                    if (aspect == "scaleSnap")
                    {
                        trans.localScale = s;
                        desiredScale.Remove(id);
                    }
                    else
                    {
                        desiredScale[id] = s;
                    }
                    // Log("verbose", "scale: " + scale.ToString());
                }
                else if (aspect == "rotation" || aspect == "rotationSnap")
                {
                    Quaternion r = Quaternion.Normalize(new Quaternion(float.Parse(strings[i + 1]), float.Parse(strings[i + 2]), float.Parse(strings[i + 3]), float.Parse(strings[i + 4])));
                    i += 5;
                    if (aspect == "rotationSnap")
                    {
                        trans.localRotation = r;
                        desiredRot.Remove(id);
                    }
                    else
                    {
                        desiredRot[id] = r;
                    }
                    // Log("verbose", "rot: " + r.ToString());
                }
                else if (aspect == "translation" || aspect == "translationSnap")
                {
                    // in Unity it's referred to as position
                    Vector3 p = new Vector3(float.Parse(strings[i + 1]), float.Parse(strings[i + 2]), float.Parse(strings[i + 3]));
                    i += 4;
                    // if (do_log) Debug.Log($"one-off camera to {p} with snap: {aspect == "translationSnap"}");

                    if (aspect == "translationSnap")
                    {
                        trans.localPosition = p;
                        desiredPos.Remove(id);
                    }
                    else
                    {
                        desiredPos[id] = p;
                    }
                    // Log("verbose", "pos: " + p.ToString());
                }
                else
                {
                    Log("debug", "invalid geometry message: " + String.Join(",", strings));
                    break;
                }
            }
        }
        else Log("debug", $"attempt to update absent object {id}");
    }

    void UpdateGeometries()
    {
        // timing note: running in MacOS editor, when 450 objects have updates their total
        // processing time is around 2ms.
        foreach (KeyValuePair<string, GameObject> kvp in croquetObjects)
        {
            string id = kvp.Key;
            GameObject obj = kvp.Value;
            if (obj == null) continue;

            float lerpFactor = 0.2f;
            bool anyChange = false;
            if (desiredScale.ContainsKey(id))
            {
                obj.transform.localScale = Vector3.Lerp(obj.transform.localScale, desiredScale[id], lerpFactor);
                anyChange = true;
                if (Vector3.Distance(obj.transform.localScale, desiredScale[id]) < 0.01) desiredScale.Remove(id);
            }
            if (desiredRot.ContainsKey(id))
            {
                obj.transform.localRotation = Quaternion.Lerp(obj.transform.localRotation, desiredRot[id], lerpFactor);
                anyChange = true;
                if (Quaternion.Angle(obj.transform.localRotation, desiredRot[id]) < 0.1) desiredRot.Remove(id);
            }
            if (desiredPos.ContainsKey(id))
            {
                obj.transform.localPosition = Vector3.Lerp(obj.transform.localPosition, desiredPos[id], lerpFactor);
                anyChange = true;
                if (Vector3.Distance(obj.transform.localPosition, desiredPos[id]) < 0.01) desiredPos.Remove(id);
            }
            if (int.Parse(id) >= 100) // not one of the reserved objects (e.g., camera)
            {
                Renderer renderer = obj.GetComponentInChildren<Renderer>();
                Material material;
                if (renderer != null)
                {
                    material = renderer.material;
                }
                else // early return if bad material
                {
                    return;
                }

                if (anyChange)
                {
                    obj.SetActive(true);
                    if (showRigidbodyStateHighlight)
                    {
                        material.EnableKeyword("_EMISSION");
                        material.SetColor("_EmissionColor", new Color(0.1f, 0.1f, 0.1f));
                    }
                }
                else
                {
                    if (showRigidbodyStateHighlight)
                    {
                        material.DisableKeyword("_EMISSION");
                    }
                }
            }
        }
    }
    
    void HandleCroquetPing(string time)
    {
        Log("diagnostics", "PING");
        SendToCroquet("unityPong", time);
    }

    void SetLogOptions(string options)
    {
        // arg is a comma-separated list of the log categories to show
        string[] wanted = options.Split(',');
        foreach (string cat in logCategories)
        {
            logOptions[cat] = wanted.Contains(cat);
        }

        // and display options
        logOptions["routeToCroquet"] = wanted.Contains("routeToCroquet");
    }

    void SetMeasureOptions(string options)
    {
        // arg is a comma-separated list of the measure categories to send
        string[] wanted = options.Split(',');
        foreach (string cat in measureCategories)
        {
            measureOptions[cat] = wanted.Contains(cat);
        }
    }
    
    void Log(string category, string msg)
    {
        bool loggable;
        if (logOptions.TryGetValue(category, out loggable) && loggable)
        {
            string logString = $"{DateTimeOffset.Now.ToUnixTimeMilliseconds() % 100000}: {msg}";
            if (logOptions.TryGetValue("routeToCroquet", out loggable) && loggable)
            {
                SendToCroquet("log", logString);
            }
            else
            {
                Debug.Log(logString);
            }
        }
    }

    void Measure(params string[] strings)
    {
        string category = strings[0];
        bool loggable;
        if (measureOptions.TryGetValue(category, out loggable) && loggable)
        {
            string[] cmdString = { "measure" };
            string[] cmdAndArgs = cmdString.Concat(strings).ToArray();
            SendToCroquet(cmdAndArgs);
        }
    }
    
    // app-specific additions
    void SetColor(string[] strings)
    {
        // strings[0] is the object id
        // strings[1] is a comma-separated list of rgb or rgba 0..1 values
        string id = strings[0];
        // Debug.Log("setColor " + strings[0] + " to " + strings[1]);
        if (croquetObjects.ContainsKey(id))
        {
            GameObject obj = croquetObjects[id];
            Material material = obj.GetComponentInChildren<Renderer>().material;
            
            string[] numStrs = strings[1].Split(",");
            float r = float.Parse(numStrs[0]);
            float g = float.Parse(numStrs[1]);
            float b = float.Parse(numStrs[2]);
            float a = numStrs.Length == 4 ? float.Parse(numStrs[3]) : 1f;
            if (a != 1f)
            {
                // sorcery from https://forum.unity.com/threads/standard-material-shader-ignoring-setfloat-property-_mode.344557/
                material.SetOverrideTag("RenderType", "Transparent");
                material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.One);
                material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                material.SetInt("_ZWrite", 0);
                material.DisableKeyword("_ALPHATEST_ON");
                material.DisableKeyword("_ALPHABLEND_ON");
                material.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                material.renderQueue = 3000;
            }
            Color color = new Color(r, g, b, a);
            material.SetColor("_Color", color);
        }
    }

    void MakeClickable(string[] strings)
    {
        string id = strings[0];
        string layers = strings[1];
        if (croquetObjects.ContainsKey(id))
        {
            GameObject obj = croquetObjects[id];
            CroquetGameObject cgo = obj.GetComponent<CroquetGameObject>();
            cgo.clickable = true;
            if (layers != "") cgo.clickLayers = layers.Split(',');
            // Debug.Log($"hittable object {cgo.croquetActorId} has handle {cgo.croquetGameHandle}");
        }
    }
}


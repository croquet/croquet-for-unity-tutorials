using UnityEngine;

[CreateAssetMenu(fileName = "Data", menuName = "ScriptableObjects/CroquetAppProperties", order = 1)]
public class CroquetAppProperties : ScriptableObject
{
    public string apiKey;
    public string appPrefix;
    public int preferredPort;
#if !UNITY_EDITOR_OSX
    [HideInInspector]
#endif
    public string pathToNode;
}

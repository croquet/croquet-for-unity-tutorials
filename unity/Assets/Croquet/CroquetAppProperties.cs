using UnityEngine;

[CreateAssetMenu(fileName = "Data", menuName = "ScriptableObjects/CroquetAppProperties", order = 1)]
public class CroquetAppProperties : ScriptableObject
{
    public string apiKey;
    public string appPrefix;
    public int preferredPort;
}

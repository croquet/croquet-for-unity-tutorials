using UnityEngine;
using Multisynq;

//========== ||||||||||| ====================
public class PlayerCoins : SynqBehaviour {

  [SynqVar]
  public int coins = 0;

  void Update() {
    if (Input.GetKeyDown(KeyCode.C)) coins += 1;
  }

  //-- ||||| ----------------------------------------
  void OnGUI() { // Old school Unity UI! Yuck. But self-contained!   =]
    var scaleFactor = Screen.height / 400f;
    var y = 150 * scaleFactor;
    GUI.backgroundColor = new Color(0f, 0f, 0f, 0.5f); // Black panel
    GUI.Box(new Rect(0, y, 120 * scaleFactor, 45 * scaleFactor), ""); // Panel background
    GUI.contentColor = Color.white;

    GUIStyle style = new GUIStyle();
    style.alignment = TextAnchor.MiddleCenter;
    style.fontSize = (int)(20 * scaleFactor);
    style.normal.textColor = new Color(1f, 1f, 0.5f, 1f); // Yellow
    GUI.Label(new Rect(10 * scaleFactor, y + (10 * scaleFactor), 100 * scaleFactor, 20 * scaleFactor), $"Coins: {coins}", style);
  }
}

/*
<color=#ffaa00>[<color=#5577ff>Synq</color>Var]</color>
<color=#ffdd00>[<color=#5577ff>Synq</color>RPC]</color>
<size=-14>
Demo Keymap:
    <color=#ffaa00>T</color> - Torso damage
    <color=#ffaa00>H</color> - Head damage
    <color=#ffaa00>L</color> - Leg damage
    <color=#ffaa00>R</color> - Reset / heal damage.
    <color=#ffaa00>C</color> - Gain coins.

<color=#ddd>Demo files:</color></size>
<color=#ddd><size=-20>Assets / CroquetJs / tutorial10 / </size><color=white>PlayerHealth.cs</color> <size=-10>( demos <color=#ffaa00>[SynqVar]</color> )</size>
<size=-20>Assets / CroquetJs / tutorial10 / </size><color=white>TakeDamage.cs </color><size=-10>( demos <color=#ffdd00>[SynqCommand]</color> )</size>
</color>
*/
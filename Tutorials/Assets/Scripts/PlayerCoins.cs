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
    var scl   = Screen.height / 400f;
    int xOffset = 20;
    var y     = 185 * scl;
    var paneW = 150 * scl;
    var paneH = 40 * scl;
    var paneX = Screen.width - ((xOffset+10) * scl) - paneW;
    var txtW  = 100 * scl;
    var txtX  = Screen.width - ((xOffset+50) * scl) - txtW;
    var lineH = 20 * scl;

    GUI.backgroundColor = new Color(0f, 0f, 0f, 0.5f); // Black panel
    GUI.Box(new Rect(paneX, y, paneW, paneH), ""); // panel background
    GUI.contentColor = Color.white;

    GUIStyle style = new GUIStyle();
    style.alignment = TextAnchor.MiddleLeft;
    style.fontSize = (int)(20 * scl);
    style.normal.textColor = new Color(1f, 1f, 0.5f, 1f); // Yellow
    GUI.Label(new Rect(txtX, y + (10 * scl), txtW, lineH), $" Coins:     {coins}", style);
  }
}

/*
<size=-15><align=center>Demonstration of:</size>
<color=#ffaa00>[<color=#5577ff>Synq</color>Var]</color><size=-10> and</size> <color=#ffdd00>[<color=#5577ff>Synq</color>RPC]</color></align>
<size=-14>
Demo Keymap:<size=-37>

</size>  <color=#aaa>[ <color=#55ff55><b>H</b></color> ]</color> - Heal all
  <color=#aaa>[ <color=#ff4444><b>L</b></color> ]</color> - Leg damage
  <color=#aaa>[ <color=#ff4444><b>T</b></color> ]</color> - Torso damage
  <color=#aaa>[ <color=#ff4444>A</color> ]</color> - Arm damage
  <color=#aaa>[ <color=#ffff00><b>C</b></color> ]</color> - Coins +1

<color=#ddd>Demo files:</color></size>
<color=#ddd><size=-20>Assets / Scripts / </size><size=-14><color=white>PlayerHealth.cs</color></size> <size=-17>( demos <color=#ffaa00>[<color=#5577ff>Synq</color>Var]</color> )</size>
<size=-20>Assets / Scripts / </size><size=-14><color=white>DamageFlash.cs </color></size><size=-17>( demos <color=#ffdd00>[<color=#5577ff>Synq</color>RPC]</color> )</size>
</color>
*/
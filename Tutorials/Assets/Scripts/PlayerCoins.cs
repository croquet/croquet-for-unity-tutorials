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


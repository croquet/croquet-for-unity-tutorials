using UnityEngine;
using Multisynq;

public class PlayerHealth : SynqBehaviour {

  [SynqVar(CustomName = "hp", OnChangedCallback = nameof(OnHealthChanged) )] 
  public int health = 100;

  [SynqVar] public int legHealth = 100;
  [SynqVar] public int torsoHealth = 100;
  [SynqVar(updateInterval=0.5f)] public int armHealth = 100;

  private void OnHealthChanged(int newValue) {
    Debug.Log($"[SynqVar] Player health changed to {newValue}");
    if      (newValue <= 0) Die();
    else if (newValue < 70) LowHealthWarning();
  }

  void CalcHealth() { health = (legHealth + torsoHealth + armHealth) / 3; }
  void Die() {              Debug.Log($"<color=red>Player died</color> health:{health}"); }
  void LowHealthWarning() { Debug.Log($"<color=yellow>Player health is low</color> health:{health}"); }

  void Update() {
    // Each key "damages" a body part, L, T, H, or heal all parts with R!
    if (Input.GetKeyDown(KeyCode.L)) legHealth   -= 3;
    if (Input.GetKeyDown(KeyCode.T)) torsoHealth -= 3;
    if (Input.GetKeyDown(KeyCode.A)) armHealth  -= 3; 
    if (Input.GetKeyDown(KeyCode.H)) { // Reset (Heal)
      health = 100;
      legHealth = 100;
      torsoHealth = 100;
      armHealth = 100;
    }
    CalcHealth();
  }

  //-- ||||| ----------------------------------------
  void OnGUI() { // Old school Unity UI! Yuck. But self-contained!   =]
    var scl = Screen.height / 400f; // bottom edge y
    int xOffset = 22;
    var y     = 90 * scl;
    var paneW = 150 * scl;
    var paneH = 100 * scl;
    var paneX = Screen.width - ((xOffset+10) * scl) - paneW;
    var txtW  = 100 * scl;
    var txtX  = Screen.width - ((xOffset+50) * scl) - txtW;
    var lineH = 20 * scl;
    GUI.backgroundColor = new Color(0f, 0f, 0f, 0.5f);
    GUI.Box(new Rect(paneX, y, paneW, paneH), ""); // panel background
    GUI.contentColor = Color.white;

    GUIStyle style = new GUIStyle();
    style.alignment = TextAnchor.MiddleLeft;
    style.fontSize = (int)(20 * scl);
    style.normal.textColor = new Color(0.5f, 1f, 0.5f, 1f); // lime green
    GUI.Label(new Rect(txtX, y + (10 * scl), txtW, lineH), $" Health:  {health.ToString("F1")}",       style);
    GUI.Label(new Rect(txtX, y + (30 * scl), txtW, lineH), $" Leg:      {legHealth.ToString("F1")}", style);
    GUI.Label(new Rect(txtX, y + (50 * scl), txtW, lineH), $" Torso:   {torsoHealth.ToString("F1")}", style);
    GUI.Label(new Rect(txtX, y + (70 * scl), txtW, lineH), $" Arm:     {armHealth.ToString("F1")}", style);
  }

}


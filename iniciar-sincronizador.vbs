Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\sincronizar.ps1""", 0, False

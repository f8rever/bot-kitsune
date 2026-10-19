Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
If Not fso.FileExists(currentDir & "\iniciar_bot.bat") Then
    currentDir = "c:\Users\jeff\Documents\KITSUNE V2 BOT"
End If
WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c """ & currentDir & "\iniciar_bot.bat""", 0, False

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\iniciar_bot.bat""", 0, False

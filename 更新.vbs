CreateObject("WScript.Shell").Run "pythonw.exe """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\update.pyw""", 0, False

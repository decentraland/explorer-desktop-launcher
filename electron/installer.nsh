!macro customUnInstall
MessageBox MB_YESNO "Do you want to clear the local data?" IDYES true IDNO false
true:
  DeleteRegKey HKCU "SOFTWARE\Decentraland"
  Goto next
false:
next:
!macroend
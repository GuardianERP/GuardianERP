; Guardian Desktop ERP - Custom NSIS Installer Script
; Professional installer with auto-start and security configuration

!macro customHeader
  !system "echo Building Guardian ERP Professional Installer"
!macroend

!macro customInit
  ; Check for running instances
  System::Call 'kernel32::OpenMutexA(i 0x1F0001, b 0, t "GuardianERPMutex") i .R0'
  IntCmp $R0 0 notRunning
  System::Call 'kernel32::CloseHandle(i $R0)'
  MessageBox MB_OK|MB_ICONEXCLAMATION "Guardian ERP is already running. Please close it before installing."
  Abort
  notRunning:
!macroend

!macro customInstall
  ; Create application data directory
  CreateDirectory "$APPDATA\Guardian ERP"
  CreateDirectory "$APPDATA\Guardian ERP\logs"
  CreateDirectory "$APPDATA\Guardian ERP\data"
  CreateDirectory "$APPDATA\Guardian ERP\cache"
  
  ; Register protocol handler
  WriteRegStr HKCU "Software\Classes\guardian-erp" "" "Guardian ERP Protocol"
  WriteRegStr HKCU "Software\Classes\guardian-erp" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\guardian-erp\shell\open\command" "" '"$INSTDIR\Guardian Desktop ERP.exe" "%1"'
  
  ; Add to Windows Defender exclusions (requires admin, silent fail if not admin)
  nsExec::ExecToLog 'powershell -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
  
  ; Add to Windows firewall exceptions
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Guardian ERP" dir=in action=allow program="$INSTDIR\Guardian Desktop ERP.exe" enable=yes profile=any'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Guardian ERP Outbound" dir=out action=allow program="$INSTDIR\Guardian Desktop ERP.exe" enable=yes profile=any'
  
  ; Create auto-start registry entry
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GuardianERP" '"$INSTDIR\Guardian Desktop ERP.exe" --autostart'
  
  ; Write app info for Windows
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Guardian Desktop ERP.exe" "" "$INSTDIR\Guardian Desktop ERP.exe"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Guardian Desktop ERP.exe" "Path" "$INSTDIR"
!macroend

!macro customUnInstall
  ; Remove protocol handler
  DeleteRegKey HKCU "Software\Classes\guardian-erp"
  
  ; Remove auto-start entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GuardianERP"
  
  ; Remove Windows firewall rules
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Guardian ERP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Guardian ERP Outbound"'
  
  ; Remove Windows Defender exclusion
  nsExec::ExecToLog 'powershell -Command "Remove-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
  
  ; Remove app path
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Guardian Desktop ERP.exe"
  
  ; Optionally remove user data
  MessageBox MB_YESNO "Do you want to remove all application data (database, settings, logs)?" IDNO skipRemoveData
    RMDir /r "$APPDATA\Guardian ERP"
  skipRemoveData:
!macroend

!macro customRemoveFiles
  ; Remove additional files created during installation
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
!macroend

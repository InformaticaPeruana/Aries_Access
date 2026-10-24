# F-003 - Acota RDP al servidor del portal en un equipo Windows.
#
# Uso (PowerShell COMO ADMINISTRADOR, en cada equipo de la red):
#   .\rdp-firewall.ps1
#   .\rdp-firewall.ps1 -AlsoRestrictSmb
#
# Que hace: las reglas de "Escritorio remoto" que trae Windows permiten 3389
# desde CUALQUIER origen. Este script las deja con alcance SOLO a
# 192.168.18.70 (server01), que es el unico que debe abrir RDP (lo hace guacd).
#
# No crea reglas nuevas ni toca otros servicios salvo que se pida -AlsoRestrictSmb.
# Idempotente: se puede correr las veces que haga falta.

param(
    [switch]$AlsoRestrictSmb,
    [string]$AllowedSource = "192.168.18.70"
)

$ErrorActionPreference = "Stop"

# Requiere elevacion: cambiar el firewall sin admin falla a medias.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Ejecutar en una consola de PowerShell como Administrador."
    exit 1
}

$groups = @("Escritorio remoto", "Remote Desktop")
$touched = 0

foreach ($g in $groups) {
    $rules = Get-NetFirewallRule -DisplayGroup $g -ErrorAction SilentlyContinue
    if (-not $rules) { continue }
    foreach ($r in $rules) {
        Set-NetFirewallRule -Name $r.Name -RemoteAddress $AllowedSource
        $touched++
        Write-Output ("acotada: {0} [{1}] -> {2}" -f $r.DisplayName, $r.Direction, $AllowedSource)
    }
}

if ($touched -eq 0) {
    Write-Warning "No se encontraron reglas de Escritorio remoto. RDP puede estar deshabilitado en este equipo."
}

if ($AlsoRestrictSmb) {
    foreach ($g in @("Compartir archivos e impresoras", "File and Printer Sharing")) {
        $rules = Get-NetFirewallRule -DisplayGroup $g -ErrorAction SilentlyContinue
        foreach ($r in $rules) {
            Set-NetFirewallRule -Name $r.Name -RemoteAddress $AllowedSource
            Write-Output ("SMB acotado: {0}" -f $r.DisplayName)
        }
    }
}

Write-Output ""
Write-Output "== estado final de las reglas de RDP =="
$report = @()
foreach ($g in $groups) {
    Get-NetFirewallRule -DisplayGroup $g -ErrorAction SilentlyContinue | ForEach-Object {
        $addr = ($_ | Get-NetFirewallAddressFilter).RemoteAddress -join ", "
        $report += [pscustomobject]@{
            Regla      = $_.DisplayName
            Habilitada = $_.Enabled
            Direccion  = $_.Direction
            Origen     = $addr
        }
    }
}
$report | Format-Table -AutoSize

Write-Output "Listo. Desde server01 el 3389 debe responder; desde cualquier otro equipo, no."

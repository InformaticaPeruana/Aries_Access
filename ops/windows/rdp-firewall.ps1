# F-003 T05 - Acota RDP al servidor del portal en un equipo Windows.
#
# Uso (PowerShell COMO ADMINISTRADOR, en cada equipo de la red):
#   .\rdp-firewall.ps1
#   .\rdp-firewall.ps1 -AlsoRestrictSmb
#
# Que hace: busca las reglas de entrada habilitadas que abren el 3389 y les pone
# como origen SOLO 192.168.18.70 (server01), que es el unico que debe abrir RDP
# (lo hace guacd). Busca por PUERTO, no por nombre: el nombre depende del idioma
# de Windows y ahi estaba el fallo del primer intento.
#
# Devuelve:
#   0 = aplicado (todas las reglas con 3389 acotadas)
#   1 = no encontro ninguna regla con 3389 (RDP deshabilitado o caso raro)
#   2 = aplico, pero queda alguna regla con 3389 abierta a cualquier origen
#
# Guarda el estado previo en el escritorio del usuario (rollback manual).

param(
    [switch]$AlsoRestrictSmb,
    [string]$AllowedSource = "192.168.18.70"
)

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Ejecutar en una consola de PowerShell como Administrador."
    exit 1
}

function Get-RulesOnPort([int]$port) {
    Get-NetFirewallRule -Direction Inbound -Enabled True -ErrorAction SilentlyContinue | Where-Object {
        $pf = $_ | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
        if (-not $pf) { return $false }
        $spec = ($pf.LocalPort -join ",")
        # Coincide si el puerto esta listado, si la regla abre "Any" o si un
        # rango lo incluye (p. ej. 3389-3390).
        if ($spec -match "(^|,)($port)(,|$)") { return $true }
        if ($spec -match "(^|,)Any(,|$)") { return $true }
        foreach ($p in ($pf.LocalPort)) {
            if ($p -match "^(\d+)-(\d+)$") {
                if ($port -ge [int]$Matches[1] -and $port -le [int]$Matches[2]) { return $true }
            }
        }
        return $false
    }
}

$rdpRules = Get-RulesOnPort 3389
if (-not $rdpRules) {
    Write-Warning "No hay reglas de entrada habilitadas en el 3389. RDP puede estar deshabilitado en este equipo."
    exit 1
}

# Estado previo, para poder revertir a mano.
$backup = Join-Path $env:USERPROFILE ("rdp-firewall-antes-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$rdpRules | ForEach-Object {
    $addr = ($_ | Get-NetFirewallAddressFilter).RemoteAddress -join ";"
    [pscustomobject]@{ Nombre = $_.Name; DisplayName = $_.DisplayName; OrigenPrevio = $addr }
} | ConvertTo-Json -Depth 3 | Set-Content -Path $backup -Encoding UTF8
Write-Output ("estado previo guardado en {0}" -f $backup)

foreach ($r in $rdpRules) {
    Set-NetFirewallRule -Name $r.Name -RemoteAddress $AllowedSource
    Write-Output ("acotada: {0} -> {1}" -f $r.DisplayName, $AllowedSource)
}

if ($AlsoRestrictSmb) {
    foreach ($r in (Get-RulesOnPort 445)) {
        Set-NetFirewallRule -Name $r.Name -RemoteAddress $AllowedSource
        Write-Output ("SMB acotado: {0}" -f $r.DisplayName)
    }
}

Write-Output ""
Write-Output "== estado final de las reglas de entrada en el 3389 =="
$final = Get-RulesOnPort 3389
$abiertas = @()
foreach ($r in $final) {
    $addr = ($r | Get-NetFirewallAddressFilter).RemoteAddress -join ", "
    if ($addr -match "Any|Cualquiera|\*") { $abiertas += $r.DisplayName }
    Write-Output ("{0} :: {1}" -f $r.DisplayName, $addr)
}

if ($abiertas.Count -gt 0) {
    Write-Warning ("quedan reglas con 3389 abierto a cualquier origen: " + ($abiertas -join "; "))
    exit 2
}

Write-Output ""
Write-Output "OK: desde server01 el 3389 debe responder; desde cualquier otro equipo, no."
exit 0

# setup-claude-desktop.ps1
# Run via run-setup.bat (double-click that file). Safe to run more than once.
#
# What it does:
#   1. Checks Node.js and the Claude Code CLI are installed
#   2. Installs the project's npm packages
#   3. Creates .env from .env.example (if you don't have one yet)
#   4. Adds the "instagram" MCP server to Claude Desktop's config
#      (keeps your other servers and settings; backs up the old file)
#   5. Installs the ig-creator / ig-optimizer / ig-reviewer skills

param(
    [string]$ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json",
    [switch]$SkipInstall,
    [switch]$SkipSkills
)

$ErrorActionPreference = 'Stop'
$igRoot = $PSScriptRoot

function Pause-And-Exit($code) {
    Read-Host "Press Enter to close"
    exit $code
}

Write-Host ""
Write-Host "=== Instagram Agent - Claude Desktop Setup ===" -ForegroundColor Cyan
Write-Host "Project folder: $igRoot"
Write-Host ""

# -- 1. Prerequisites -------------------------------------------------------------

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[1/5] Node.js is not installed. Install the LTS version from https://nodejs.org and run this again." -ForegroundColor Red
    Pause-And-Exit 1
}
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Host "[1/5] Node.js $(& node --version) is too old. Install version 20 or newer from https://nodejs.org." -ForegroundColor Red
    Pause-And-Exit 1
}
Write-Host "[1/5] Node.js $(& node --version) found." -ForegroundColor Green

if (Get-Command claude -ErrorAction SilentlyContinue) {
    Write-Host "      Claude Code CLI found." -ForegroundColor Green
} else {
    Write-Host "      Claude Code CLI not found. The AI steps need it (LLM_BACKEND=claude-code)." -ForegroundColor Yellow
    Write-Host "      Install it:  npm install -g @anthropic-ai/claude-code   then run  claude  once to log in." -ForegroundColor Yellow
}

# -- 2. npm packages ----------------------------------------------------------------

if ($SkipInstall) {
    Write-Host "[2/5] Skipped npm install." -ForegroundColor DarkGray
} else {
    Push-Location (Join-Path $igRoot "tools")
    try {
        & npm ci --omit=dev --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    } finally {
        Pop-Location
    }
    Write-Host "[2/5] npm packages installed." -ForegroundColor Green
}

# -- 3. .env --------------------------------------------------------------------------

$envFile = Join-Path $igRoot ".env"
if (Test-Path $envFile) {
    Write-Host "[3/5] .env already exists - left unchanged." -ForegroundColor Green
} else {
    Copy-Item (Join-Path $igRoot ".env.example") $envFile
    Write-Host "[3/5] Created .env from .env.example. Fill in your Instagram token, account id and album link." -ForegroundColor Yellow
    Start-Process notepad.exe $envFile
}

# -- 4. Claude Desktop config (merge, don't overwrite) ----------------------------------

New-Item -ItemType Directory -Force -Path (Split-Path $ConfigPath) | Out-Null

if (Test-Path $ConfigPath) {
    $raw = [IO.File]::ReadAllText($ConfigPath)
    $config = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { New-Object PSObject }
    Copy-Item $ConfigPath "$ConfigPath.bak" -Force
} else {
    $config = New-Object PSObject
}

if (-not $config.PSObject.Properties['mcpServers']) {
    $config | Add-Member -NotePropertyName mcpServers -NotePropertyValue (New-Object PSObject)
}

# Tokens are NOT stored here - the server reads them from .env.
$server = [ordered]@{
    command = $node.Source
    args    = @((Join-Path $igRoot "tools\ig-mcp-server.js"))
    env     = [ordered]@{ IG_DATA_DIR = (Join-Path $igRoot "instagram") }
}
$config.mcpServers | Add-Member -NotePropertyName instagram -NotePropertyValue $server -Force

# Write UTF-8 without BOM (a BOM breaks JSON parsing).
$json = $config | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($ConfigPath, $json, (New-Object Text.UTF8Encoding $false))
Write-Host "[4/5] Added the 'instagram' server to $ConfigPath" -ForegroundColor Green

# -- 5. Skills ----------------------------------------------------------------------------

if ($SkipSkills) {
    Write-Host "[5/5] Skipped skills." -ForegroundColor DarkGray
} else {
    $skillsPluginBase = "$env:APPDATA\Claude\local-agent-mode-sessions\skills-plugin"
    $skillsDir = Get-ChildItem -Path $skillsPluginBase -Recurse -Filter "skills" -Directory `
                 -ErrorAction SilentlyContinue | Where-Object {
                     Test-Path (Join-Path $_.FullName "docx")
                 } | Select-Object -First 1 -ExpandProperty FullName

    if (-not $skillsDir) {
        Write-Host "[5/5] Could not find Claude's skills folder - open Claude Desktop once, then run this again." -ForegroundColor Yellow
    } else {
        $sourceDir = Join-Path $igRoot "skills"
        foreach ($skill in @("ig-creator", "ig-optimizer", "ig-reviewer")) {
            $src = Join-Path $sourceDir $skill
            $dst = Join-Path $skillsDir $skill
            if (Test-Path $src) {
                if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
                Copy-Item -Path $src -Destination $dst -Recurse -Force
                Write-Host "      Installed: $skill" -ForegroundColor DarkGreen
            } else {
                Write-Host "      WARNING: Source folder not found: $src" -ForegroundColor Red
            }
        }
        Write-Host "[5/5] Skills installed." -ForegroundColor Green
    }
}

# -- Done -----------------------------------------------------------------------------------

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Fill in .env (see README - 'Get your Instagram token')."
Write-Host "  2. Check it:  node tools\diagnose.mjs"
Write-Host "  3. Restart Claude Desktop (fully quit from the tray icon, then reopen)."
Write-Host "  4. In Claude Desktop, give Claude access to this folder and say: Write a post about X"
Write-Host ""
Read-Host "Press Enter to close"

param(
    [Parameter(Mandatory = $true)]
    [string]$AppDirectory
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$AppDirectory = (Resolve-Path -LiteralPath $AppDirectory).Path

try {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw 'npm est introuvable. Installez Node.js puis relancez la mise a jour.'
    }

    Set-Location -LiteralPath $AppDirectory
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    $isGitRepository = $false

    if ($git) {
        & $git.Source rev-parse --is-inside-work-tree *> $null
        $isGitRepository = $LASTEXITCODE -eq 0
    }

    if ($isGitRepository) {
        $status = @(& $git.Source status --porcelain)
        if ($LASTEXITCODE -ne 0) {
            throw "Impossible de verifier l'etat du depot Git."
        }
        if ($status.Count -gt 0) {
            throw 'Des fichiers locaux ont ete modifies. Sauvegardez ou annulez ces modifications avant de recommencer.'
        }

        $branch = ((@(& $git.Source branch --show-current)) -join '').Trim()
        if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') {
            throw 'La branche Git active doit etre main.'
        }

        Write-Host 'Recherche de la derniere version avec Git...'
        & $git.Source fetch origin main
        if ($LASTEXITCODE -ne 0) { throw 'Echec du telechargement Git.' }

        & $git.Source merge --ff-only origin/main
        if ($LASTEXITCODE -ne 0) { throw 'La mise a jour Git ne peut pas etre appliquee automatiquement.' }
    }
    else {
        Write-Host 'Installation ZIP detectee : telechargement de la derniere version...'
        $temporaryBase = [IO.Path]::GetTempPath().TrimEnd([IO.Path]::DirectorySeparatorChar)
        $temporaryDirectory = Join-Path $temporaryBase ("EasyBreaking-update-{0}" -f [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
        $temporaryDirectory = (Resolve-Path -LiteralPath $temporaryDirectory).Path

        try {
            $archivePath = Join-Path $temporaryDirectory 'main.zip'
            $extractPath = Join-Path $temporaryDirectory 'archive'
            Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/HugoErb/EasyBreaking/archive/refs/heads/main.zip' -OutFile $archivePath
            Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

            $sourceDirectory = Get-ChildItem -LiteralPath $extractPath -Directory | Select-Object -First 1
            if (-not $sourceDirectory) {
                throw "L'archive GitHub est invalide."
            }

            & robocopy.exe $sourceDirectory.FullName $AppDirectory /E /XD .git node_modules dist /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
            $robocopyExitCode = $LASTEXITCODE
            if ($robocopyExitCode -ge 8) {
                throw "Echec de la copie des fichiers (code $robocopyExitCode)."
            }
        }
        finally {
            $safePrefix = $temporaryBase + [IO.Path]::DirectorySeparatorChar + 'EasyBreaking-update-'
            if ($temporaryDirectory.StartsWith($safePrefix, [StringComparison]::OrdinalIgnoreCase)) {
                Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }

    Write-Host 'Mise a jour des dependances...'
    Set-Location -LiteralPath $AppDirectory
    & $npm.Source install
    if ($LASTEXITCODE -ne 0) {
        throw 'Echec de la mise a jour des dependances.'
    }
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}

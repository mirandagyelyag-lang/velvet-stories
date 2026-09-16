$ErrorActionPreference = "Stop"

# Velvet Stories · Android installer
# Builds, installs and opens the CURRENT project version on one authorized Android device.
# The version is read from package.json so this file does not become stale.

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project

function Assert-LastExitCode([string]$message) {
    if ($LASTEXITCODE -ne 0) {
        throw $message
    }
}

function Test-NpmScript([string]$name) {
    node -e "const s=require('./package.json').scripts||{}; process.exit(s[process.argv[1]] ? 0 : 1)" $name
    return ($LASTEXITCODE -eq 0)
}

if (!(Test-Path (Join-Path $project "package.json"))) {
    throw "package.json was not found. Put this installer in the Velvet Stories project root."
}

$version = (node -p "require('./package.json').version || ''").Trim()
Assert-LastExitCode "Could not read package.json."

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "The project version could not be read from package.json."
}

$appId = "com.velvetstories.app"
if (Test-Path (Join-Path $project "capacitor.config.json")) {
    $resolvedAppId = (node -e "const c=require('./capacitor.config.json'); console.log(c.appId || '')").Trim()
    if (-not [string]::IsNullOrWhiteSpace($resolvedAppId)) {
        $appId = $resolvedAppId
    }
}

Write-Host ""
Write-Host "=== Velvet Stories Android v$version ===" -ForegroundColor Magenta
Write-Host "Clean flow: dependencies -> web build -> Capacitor sync -> Android build -> install -> open."
Write-Host ""

# ---------------------------------------------------------------------------
# 1. JavaScript dependencies
# ---------------------------------------------------------------------------

Write-Host "1/6 · Installing npm dependencies..." -ForegroundColor Cyan

if (Test-Path (Join-Path $project "package-lock.json")) {
    npm ci --no-audit --no-fund
    Assert-LastExitCode "npm ci failed."
} else {
    npm install --no-audit --no-fund
    Assert-LastExitCode "npm install failed."
}

# ---------------------------------------------------------------------------
# 2. Build + Capacitor sync
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "2/6 · Building and syncing Android..." -ForegroundColor Cyan

if (Test-NpmScript "android:sync") {
    npm run android:sync
    Assert-LastExitCode "npm run android:sync failed."
} else {
    npm run build
    Assert-LastExitCode "npm run build failed."

    npx cap sync android
    Assert-LastExitCode "npx cap sync android failed."
}

# Run the general project verifier if the project defines one.
if (Test-NpmScript "verify:project") {
    Write-Host "Running verify:project..." -ForegroundColor DarkGray
    npm run verify:project
    Assert-LastExitCode "verify:project failed."
}

# ---------------------------------------------------------------------------
# 3. Java 21
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "3/6 · Locating Java 21..." -ForegroundColor Cyan

$java21 = $null

# Prefer the current JAVA_HOME when it already points to Java 21.
if ($env:JAVA_HOME) {
    $javaFromHome = Join-Path $env:JAVA_HOME "bin\java.exe"
    if (Test-Path $javaFromHome) {
        $javaVersion = (& $javaFromHome --version 2>$null | Select-Object -First 1)
        if ("$javaVersion" -match "21\.") {
            $java21 = $javaFromHome
        }
    }
}

# Common Android Studio / JDK locations.
if (!$java21) {
    $directCandidates = @(
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\java.exe",
        "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\java.exe"
    )

    foreach ($candidate in $directCandidates) {
        if (!(Test-Path $candidate)) { continue }

        $javaVersion = (& $candidate --version 2>$null | Select-Object -First 1)
        if ("$javaVersion" -match "21\.") {
            $java21 = $candidate
            break
        }
    }
}

if (!$java21) {
    $javaRoots = @(
        "$env:USERPROFILE\.jdks",
        "$env:LOCALAPPDATA\Programs",
        "$env:LOCALAPPDATA\JetBrains",
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Microsoft",
        "$env:ProgramFiles\Java",
        "$env:ProgramFiles\JetBrains"
    )

    foreach ($root in $javaRoots) {
        if (!(Test-Path $root)) { continue }

        foreach ($java in Get-ChildItem $root -Filter java.exe -Recurse -ErrorAction SilentlyContinue) {
            if ($java.FullName -notmatch "\\bin\\java\.exe$") { continue }

            $javaVersion = (& $java.FullName --version 2>$null | Select-Object -First 1)
            if ("$javaVersion" -match "21\.") {
                $java21 = $java.FullName
                break
            }
        }

        if ($java21) { break }
    }
}

if (!$java21) {
    throw "Java 21 was not found. Install/select JDK 21 in Android Studio and run this installer again."
}

$jdk = Split-Path (Split-Path $java21 -Parent) -Parent
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"

Write-Host "Java 21: $jdk" -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# 4. Android SDK + device
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "4/6 · Checking Android SDK and connected device..." -ForegroundColor Cyan

$sdk = $null

if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $sdk = $env:ANDROID_HOME
} elseif ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    $sdk = $env:ANDROID_SDK_ROOT
} else {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $sdk = $defaultSdk
    }
}

if (!$sdk) {
    throw "Android SDK was not found. Open Android Studio and install Android SDK Platform Tools."
}

$adb = Join-Path $sdk "platform-tools\adb.exe"
if (!(Test-Path $adb)) {
    throw "ADB was not found at: $adb"
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$sdk\platform-tools;$env:Path"

$androidProject = Join-Path $project "android"
if (!(Test-Path $androidProject)) {
    throw "The android project folder was not found."
}

$sdkForGradle = $sdk.Replace("\", "/")
Set-Content `
    -Path (Join-Path $androidProject "local.properties") `
    -Value "sdk.dir=$sdkForGradle" `
    -Encoding ASCII

$deviceLines = & $adb devices
$deviceLines | ForEach-Object { Write-Host $_ }

$ready = @($deviceLines | Where-Object { $_ -match "\tdevice$" })
$unauthorized = @($deviceLines | Where-Object { $_ -match "\tunauthorized$" })

if ($unauthorized.Count -gt 0) {
    throw "An Android device is connected but USB debugging is not authorized. Unlock the phone and tap Allow."
}

if ($ready.Count -eq 0) {
    throw "No authorized Android device is connected by USB."
}

if ($ready.Count -gt 1) {
    throw "More than one Android device is connected. Leave only the phone you want to install Velvet on."
}

# ---------------------------------------------------------------------------
# 5. APK build
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "5/6 · Compiling Velvet v$version..." -ForegroundColor Cyan

$gradleWrapper = Join-Path $androidProject "gradlew.bat"
if (!(Test-Path $gradleWrapper)) {
    throw "android\gradlew.bat was not found. The Gradle Wrapper is required."
}

Push-Location $androidProject
try {
    & $gradleWrapper --stop | Out-Host
    & $gradleWrapper assembleDebug | Out-Host
    Assert-LastExitCode "Android APK build failed."
}
finally {
    Pop-Location
}

$apk = Join-Path $androidProject "app\build\outputs\apk\debug\app-debug.apk"
if (!(Test-Path $apk)) {
    throw "Gradle finished but app-debug.apk was not created."
}

# ---------------------------------------------------------------------------
# 6. Install + launch
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "6/6 · Installing Velvet v$version..." -ForegroundColor Cyan

& $adb install -r $apk | Out-Host
Assert-LastExitCode "Android could not install the Velvet APK."

& $adb shell am force-stop $appId | Out-Null
Start-Sleep -Milliseconds 400

& $adb shell am start -n "$appId/.MainActivity" | Out-Host
Assert-LastExitCode "Velvet was installed, but Android could not launch MainActivity."

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "VELVET STORIES v$version IS INSTALLED AND OPEN." -ForegroundColor Green
Write-Host "You can unplug the USB when Velvet is visible on the phone." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

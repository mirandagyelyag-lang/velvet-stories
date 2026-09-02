$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project

Write-Host ""
Write-Host "=== Velvet Stories Android 3.14.6 · One-Take Fluid Cinematic Splash ===" -ForegroundColor Magenta
Write-Host "One clean flow: dependencies -> Supabase public config -> Android sync -> Java 21 -> SDK -> APK -> Samsung."

Write-Host "Synchronizing npm dependencies..."
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "Preparing and verifying the native Android bundle..."
npm run android:sync
if ($LASTEXITCODE -ne 0) { throw "Android sync/verification failed" }
npm run verify:v3146
if ($LASTEXITCODE -ne 0) { throw "Native polish verification failed" }

# Find a Java 21 runtime. Android Studio/JetBrains frequently installs it under .jdks.
$javaRoots = @(
  "$env:USERPROFILE\.jdks",
  "$env:LOCALAPPDATA\Programs",
  "$env:LOCALAPPDATA\JetBrains",
  "$env:ProgramFiles\Eclipse Adoptium",
  "$env:ProgramFiles\Microsoft",
  "$env:ProgramFiles\Java",
  "$env:ProgramFiles\JetBrains",
  "$env:ProgramFiles\Android"
)
$java21 = $null
foreach ($root in $javaRoots) {
  if (!(Test-Path $root)) { continue }
  foreach ($java in Get-ChildItem $root -Filter java.exe -Recurse -ErrorAction SilentlyContinue) {
    if ($java.FullName -notmatch "\\bin\\java\.exe$") { continue }
    $version = (& $java.FullName --version 2>$null | Select-Object -First 1)
    if ("$version" -match "21\.") { $java21 = $java.FullName; break }
  }
  if ($java21) { break }
}
if (!$java21) { throw "Java 21 was not found. Open Android Studio once and install/select JDK 21, then rerun this installer." }

$jdk = Split-Path (Split-Path $java21 -Parent) -Parent
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"
Write-Host "Java 21: $jdk" -ForegroundColor DarkGray

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$adb = Join-Path $sdk "platform-tools\adb.exe"
if (!(Test-Path $adb)) { throw "Android SDK/ADB was not found. Open Android Studio once so SDK Platform Tools finish installing." }
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$sdk\platform-tools;$env:Path"

$androidProject = Join-Path $project "android"
$sdkForGradle = $sdk.Replace("\", "/")
Set-Content -Path (Join-Path $androidProject "local.properties") -Value "sdk.dir=$sdkForGradle" -Encoding ASCII

$deviceLines = & $adb devices
$deviceLines | ForEach-Object { Write-Host $_ }
$ready = @($deviceLines | Where-Object { $_ -match "\tdevice$" })
$unauthorized = @($deviceLines | Where-Object { $_ -match "\tunauthorized$" })
if ($unauthorized.Count -gt 0) { throw "The phone is connected but USB debugging is not authorized. Unlock it and tap Allow." }
if ($ready.Count -eq 0) { throw "No authorized Android phone is connected by USB." }
if ($ready.Count -gt 1) { throw "More than one Android device is connected. Leave only the Samsung connected." }

# The old Android export was missing the stock wrapper binary. Use the exact Gradle
# distribution already downloaded by Android Studio/Gradle, which is equally valid.
$gradle = Get-ChildItem "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.14.3-all" -Filter gradle.bat -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$gradle) {
  $gradle = Get-ChildItem "$env:USERPROFILE\.gradle\wrapper\dists" -Filter gradle.bat -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match "gradle-8\.14\.3" } | Select-Object -First 1
}
if (!$gradle) { throw "Gradle 8.14.3 was not found in the local Gradle cache. Open the Android project in Android Studio once, wait for Gradle sync, and rerun." }

Write-Host "Compiling Velvet APK..." -ForegroundColor Cyan
& $gradle.FullName --stop | Out-Host
& $gradle.FullName -p $androidProject assembleDebug | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Android APK build failed" }

$apk = Join-Path $androidProject "app\build\outputs\apk\debug\app-debug.apk"
if (!(Test-Path $apk)) { throw "Gradle finished but app-debug.apk was not created" }

Write-Host "Installing Velvet 3.14.6 on the Samsung..." -ForegroundColor Cyan
& $adb install -r -d $apk | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Android could not install the Velvet APK" }

& $adb shell am force-stop com.velvetstories.app | Out-Null
Start-Sleep -Milliseconds 400
& $adb shell am start -n com.velvetstories.app/.MainActivity | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Velvet installed, but Android could not launch MainActivity" }

Write-Host ""
Write-Host "VELVET 3.14.6 ONE-TAKE FLUID SPLASH IS INSTALLED AND OPENED." -ForegroundColor Green
Write-Host "You can unplug the USB when Velvet is visible on the phone." -ForegroundColor Green
Write-Host ""

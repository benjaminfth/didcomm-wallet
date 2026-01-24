# Setup script to create a second wallet instance (Bob) for testing
# Run this in PowerShell from d:\CODING\oc\wallet

Write-Host "Creating second wallet instance (Bob)..." -ForegroundColor Green

# Create copy of wallet folder
$sourcePath = "."
$destPath = "..\wallet-bob"

if (Test-Path $destPath) {
    Write-Host "Wallet-bob folder already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $destPath
}

Write-Host "Copying wallet folder..." -ForegroundColor Cyan
Copy-Item -Recurse $sourcePath $destPath

# Update background.js to use Bob's identity
$bgPath = "$destPath\background\background.js"
$content = Get-Content $bgPath -Raw

Write-Host "Updating wallet identity to Bob..." -ForegroundColor Cyan

# Comment out Alice's wallet address and private key (line by line)
$content = $content -replace "^const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';", "// const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';"
$content = $content -replace "^const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';", "// const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';"

# Comment out Alice's encryption keys (multi-line)
$content = $content -replace "const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx.*?==';", "// const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx+22Pycd7/tGz91Y6FqXyt+WHy7xA==';"
$content = $content -replace "const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGzkRAogLNTD6ahm\+DqODy054lm41lP8N8\+CmTJ/mcUyhRANCAATcwnrDOYI7swgLtfUBGaLBcUWA2mQx5HMw61u\+iLsV7A6CBkyPSQAKhtcvH7bY/Jx3v\+0bP3VjoWpfK35YfLvE';", "// const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGzkRAogLNTD6ahm+DqODy054lm41lP8N8+CmTJ/mcUyhRANCAATcwnrDOYI7swgLtfUBGaLBcUWA2mQx5HMw61u+iLsV7A6CBkyPSQAKhtcvH7bY/Jx3v+0bP3VjoWpfK35YfLvE';"

# Uncomment Bob's wallet address and private key
$content = $content -replace "^// const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';", "const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';"
$content = $content -replace "^// const DUMMY_PRIVATE_KEY = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';", "const DUMMY_PRIVATE_KEY = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';"

# Uncomment Bob's encryption keys
$content = $content -replace "^// const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr\+fGVCPgQyglPdbMOYgey66BZeRzt/RMmAsQ6VCQ==';", "const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr+fGVCPgQyglPdbMOYgey66BZeRzt/RMmAsQ6VCQ==';"
$content = $content -replace "^// const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgB6bStmlXvU27nob/9Xt\+cFh/FC/s1DR8OdFFDHFdkeShRANCAAQ/TpNQeovV5rfLc09aTbIGigHsWSE8uPSdGFcO7bbqJXhe\+v58ZUI\+BDKCU91sw5iB7LroFl5HO39EyYCxDpUJ';", "const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgB6bStmlXvU27nob/9Xt+cFh/FC/s1DR8OdFFDHFdkeShRANCAAQ/TpNQeovV5rfLc09aTbIGigHsWSE8uPSdGFcO7bbqJXhe+v58ZUI+BDKCU91sw5iB7LroFl5HO39EyYCxDpUJ';"

# Update signing keys to use Bob's derived keys
$content = $content -replace "const SIGNING_PRIVATE_KEY = DUMMY_PRIVATE_KEY; // 32 bytes hex", "const SIGNING_PRIVATE_KEY = DUMMY_PRIVATE_KEY; // 32 bytes hex"
$content = $content -replace "const SIGNING_PUBLIC_KEY = '02a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'; // Compressed pubkey placeholder", "const SIGNING_PUBLIC_KEY = '02b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2'; // Compressed pubkey placeholder"

# Save the updated content
Set-Content $bgPath $content -Encoding UTF8

# Verify changes by showing key lines
Write-Host "`nVerifying changes in background.js:" -ForegroundColor Yellow
$lines = Get-Content $bgPath
$walletLine = $lines | Where-Object { $_ -match "^const WALLET_ADDRESS" } | Select-Object -First 1
$privateKeyLine = $lines | Where-Object { $_ -match "^const DUMMY_PRIVATE_KEY" } | Select-Object -First 1
$encPubLine = $lines | Where-Object { $_ -match "^const ENCRYPTION_PUBLIC_KEY" } | Select-Object -First 1

Write-Host "  $walletLine" -ForegroundColor Cyan
Write-Host "  $privateKeyLine" -ForegroundColor Cyan
Write-Host "  $encPubLine" -ForegroundColor Cyan

Write-Host "`n✅ Success! Second wallet created at: $destPath" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Create a new Chrome profile or use Edge/Brave" -ForegroundColor White
Write-Host "2. Load unpacked extension from: $(Resolve-Path $destPath)" -ForegroundColor White
Write-Host "3. Open demo page in both browsers and test DIDComm messaging" -ForegroundColor White
Write-Host "`nWallet identities:" -ForegroundColor Yellow
Write-Host "  Alice (wallet):     did:example:0x1111111111111111111111111111111111111111" -ForegroundColor Cyan
Write-Host "  Bob (wallet-bob):   did:example:0x2222222222222222222222222222222222222222" -ForegroundColor Cyan

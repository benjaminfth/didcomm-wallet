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

# Comment out Alice's config and uncomment Bob's
$content = $content -replace '(// Wallet Profile: ALICE.*?\r?\n)(const WALLET_ADDRESS = ''0x1111.*?'';.*?\r?\n)(const DUMMY_PRIVATE_KEY = ''a1a1.*?'';)', '// Wallet Profile: ALICE (default)$1// $2// $3'
$content = $content -replace '// (Wallet Profile: BOB.*?\r?\n)// (const WALLET_ADDRESS = ''0x2222.*?'';.*?\r?\n)// (const DUMMY_PRIVATE_KEY = ''b2b2.*?'';)', '$1$2$3'

Set-Content $bgPath $content

Write-Host "`n✅ Success! Second wallet created at: $destPath" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Create a new Chrome profile or use Edge/Brave" -ForegroundColor White
Write-Host "2. Load unpacked extension from: $(Resolve-Path $destPath)" -ForegroundColor White
Write-Host "3. Open demo page in both browsers and test DIDComm messaging" -ForegroundColor White
Write-Host "`nWallet identities:" -ForegroundColor Yellow
Write-Host "  Alice (wallet):     did:example:0x1111111111111111111111111111111111111111" -ForegroundColor Cyan
Write-Host "  Bob (wallet-bob):   did:example:0x2222222222222222222222222222222222222222" -ForegroundColor Cyan

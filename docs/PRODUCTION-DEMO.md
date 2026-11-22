# WEB TEHYAN university demonstration

The Vercel project is `laudzas-projects/web-tehyan` and tracks GitHub `main`. Its assigned Production domain is `web-tehyan.vercel.app`. Standard Protection is enabled. The assigned Production domain is intended for anonymous access after release, while Preview and generated deployment URLs require Vercel authentication. Verify anonymous access after deployment. Application admin authentication still applies.

## Catalog for review

| Menu | Demo price | Existing illustration |
| --- | ---: | --- |
| Teh Manis Tehyan (Demo) | Rp10.000 | `teh-manis-tehyan.webp` |
| Teh Tarik Tehyan (Demo) | Rp16.000 | `teh-tarik-tehyan.webp` |
| Teh Lemon Madu (Demo) | Rp18.000 | `teh-lemon-madu.webp` |

Tehyan Margonda (Demo) and Tehyan Beji (Demo) have fictional Depok locations and hours. The records have no street address, phone contact, or map link. Photos are existing repository illustrations.

The seed runs in one transaction. It inserts missing categories, products, outlets, and hours for newly created outlets. It uses unique slugs to skip existing rows. Reruns preserve existing prices and outlet hours. The original development seed is separate.

From the repository root, `npx.cmd tsx prisma/seed-production-demo.ts` prints the proposed data with no database connection. Run Production operations from a source copy without dotenv files. Both Vercel CLI and the Prisma Client generated in the workspace can load the original local `.env`.

```powershell
$repo = (Get-Location).Path
$ops = Join-Path $repo '.qa/production-env'
$clean = Join-Path $repo '.qa/production-build'
$directHost = 'ep-noisy-wildflower-biuraczk.c-5.ap-southeast-1.aws.neon.tech'
$tsx = Join-Path $clean 'node_modules/tsx/dist/cli.mjs'
New-Item -ItemType Directory -Path (Join-Path $ops '.vercel') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo '.vercel/project.json') -Destination (Join-Path $ops '.vercel/project.json')
```

Keep both folders free of dotenv files. The prepared build copy contains the reviewed scripts, images, locked packages and a Prisma Client generated in that copy. Vercel injects the managed direct connection into the child process. The script checks the exact Neon host and requires TLS.

```powershell
Push-Location -LiteralPath $ops
try {
    vercel.cmd env run -e production -- node $tsx (Join-Path $clean 'prisma/seed-production-demo.ts') --apply "--host=$directHost"
} finally {
    Pop-Location
}
```

## First administrator for review

This is an independent operation. Run it after approval in your own PowerShell terminal with the same isolated directory and variables established above. Enter the email of the designated administrator and a new password generated in a password manager. The password prompt masks input. The helper passes the password on standard input and uses the application's existing scrypt hash. The database transaction refuses to proceed if any administrator already exists or the email belongs to an existing user. It also refuses an inherited `ADMIN_BOOTSTRAP_PASSWORD`.

```powershell
$email = Read-Host 'Production administrator email'
$helper = Join-Path $clean 'prisma/bootstrap-production-admin.ps1'
Push-Location -LiteralPath $ops
try {
    vercel.cmd env run -e production -- powershell.exe -NoProfile -File $helper -DatabaseHost $directHost -Email $email
} finally {
    Pop-Location
}
```

Keep the password in the password manager. Use the normal admin login to verify access after deployment.

## Rotate the administrator password

Use the same private prompt with the existing administrator email. Run from the workspace root after preparing the isolated folders and variables above. The rotation requires a different password and preserves the administrator's account ID, role, and profile.

```powershell
$email = Read-Host 'Existing Production administrator email'
$helper = Join-Path $clean 'prisma/bootstrap-production-admin.ps1'
Push-Location -LiteralPath $ops
try {
    vercel.cmd env run -e production -- powershell.exe -NoProfile -File $helper -DatabaseHost $directHost -Email $email -Rotate
} finally {
    Pop-Location
}
```

Wait for `Administrator password rotated.` before proceeding. If rotating a password after the site has already been deployed, rotate `ADMIN_SESSION_SECRET` and deploy with the new signing key so previously signed sessions cannot be reused.

## Release checks

Neon Production contains three demo drinks, two demo outlets, and one administrator. The release includes the approved motion work and Next.js 15.5.29. Verify the password rotation and release checks, then review the staged diff and push `main` to trigger the Git-backed deployment.

### Request size and collection validation

Checkout was the public request path validating an untrusted array. Its JSON reader stops above 48 KiB and the schema rejects more than 50 items before parsing any item. Chat request bodies retain their 8 KiB cap. Career applications use 24 KiB, admin login and small mutations use 8 KiB, and authenticated journal and job editing use 128 KiB to allow existing long-text fields. The streamed byte count is enforced independently of `Content-Length`, and reads time out after five seconds. Oversized bodies return HTTP 413.

Chat response, history, and provider tool-call schemas also enforce collection length before per-element validation. Zod 3 remains installed for compatibility. Its package-level advisory remains open. The mitigation applies to inspected input paths and must also be used for future collection schemas. Aggregate traffic can still consume resources because existing rate limits are per process.

After the release, verify READY status and visit the Production domain from an anonymous browser context. Test checkout and tracking with controlled demo inputs and verify the admin gate and privately authenticated login.

# Fetch Datastream Batch Errors

To download and analyze failed batch errors from Adobe Experience Platform:

## 1. Add your Platform access token to `.env`

**If you have Platform API for NLD2** but still get 403027:

1. **Different project?** Platform may be on a different project than Launch. Add to `.env`:
   ```
   ADOBE_PLATFORM_CLIENT_ID=<client_id from project with Platform API>
   ADOBE_PLATFORM_CLIENT_SECRET=<client_secret from that project>
   ```

2. **Same project?** Ensure the OAuth credential in `.env` is the one that has Platform API (a project can have multiple credentials). Use the credential from the project/API that has Platform.

3. **Token from Console:** Generate a token in Developer Console → your Platform project → Credentials → Generate access token. Add to `.env` as `ADOBE_ACCESS_TOKEN=<token>`.

Your OAuth credential may not have Platform API access (causes 403027 "User region is missing"). Use a token from Postman instead:

1. In Postman, use **Generate Access Token** (or get a token from Developer Console → your project → OAuth Server-to-Server)
2. Ensure the credential has **Adobe Experience Platform** API added
3. Add to `.env`:
   ```
   ADOBE_ACCESS_TOKEN=eyJ...your_full_token...
   ```

## 2. Run the script

```bash
node scripts/fetch-batch-errors.js 01KK22MR1EHHNTBDT8FH1N2FZD apalmer
```

- Batch ID: `01KK22MR1EHHNTBDT8FH1N2FZD`
- Sandbox: `apalmer` (from your Postman config)

## 3. Output

- `batch-errors/` – failed records and summary
- Console – error counts by type

# OCR GCSE CS Quiz

## Changing the password

Run the following in your terminal and paste the output as the new `PASSWORD_HASH` value in `index.html`:

```
echo -n 'yournewpassword' | shasum -a 256
```

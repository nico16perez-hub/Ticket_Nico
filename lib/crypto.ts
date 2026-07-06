import CryptoJS from "crypto-js"

const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_SECRET ?? ""

export function encryptPassword(password: string): string {
  if (!SECRET_KEY) return password

  return CryptoJS.AES.encrypt(password, CryptoJS.enc.Utf8.parse(SECRET_KEY), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
}

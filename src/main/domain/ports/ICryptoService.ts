export interface ICryptoService {
  encrypt(plaintext: string): string
  decrypt(ciphertext: string): string
}

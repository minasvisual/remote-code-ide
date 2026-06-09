import { safeStorage } from 'electron'
import type { ICryptoService } from '../../domain/ports/ICryptoService'

export class SafeStorageCrypto implements ICryptoService {
  encrypt(plaintext: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS keychain encryption is not available on this system')
    }
    return safeStorage.encryptString(plaintext).toString('base64')
  }

  decrypt(ciphertext: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS keychain encryption is not available on this system')
    }
    return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))
  }
}

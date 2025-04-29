// src/utils/crypto

import { sm2 } from 'sm-crypto-v2'
import CryptoJs from 'crypto-js'

export const sm2Encrypt = (string: string, publicKey: string) => {
  return sm2.doEncrypt(string, publicKey, 1)
}

export const hashEncrypt = (string: string) => {
  return CryptoJs.SHA256(string).toString()
}

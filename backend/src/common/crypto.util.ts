// src/common/crypto.util

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { sm2 } from 'sm-crypto-v2';
import { LoginKey } from '../database/entities/login_key.entity';

@Injectable()
export class CryptoUtil {
  constructor(
    @InjectRepository(LoginKey)
    private readonly loginKeyRepository: Repository<LoginKey>,
  ) {}

  // 生成新的密钥对并存储到数据库
  private async generateKeyPair(): Promise<LoginKey> {
    const keyPair = sm2.generateKeyPairHex();

    const newLoginKey = new LoginKey();
    newLoginKey.private_key = keyPair.privateKey;
    newLoginKey.expiry_time = new Date(Date.now() + 60 * 60 * 1000); // 1小时

    await this.loginKeyRepository.save(newLoginKey);

    return newLoginKey;
  }

  // 从数据库获取有效的私钥，如果没有则生成新的
  private async getValidKeyPair(): Promise<LoginKey> {
    // 查找未过期的密钥
    const validKey = await this.loginKeyRepository
      .createQueryBuilder('loginKey')
      .where('loginKey.expiry_time > :now', { now: new Date() })
      .orderBy('loginKey.expiry_time', 'DESC')
      .getOne();

    return validKey ? validKey : await this.generateKeyPair(); // 没有找到则生成新的密钥对
  }

  // 获取公钥，如果不存在则生成
  public async getPublicKey(): Promise<string> {
    const validKey = await this.getValidKeyPair();
    const publicKey = sm2.getPublicKeyFromPrivateKey(validKey.private_key);
    return publicKey;
  }

  // 使用公钥进行加密
  public async encryptWithSM2(plaintext: string): Promise<string> {
    const validKey = await this.getValidKeyPair();
    const publicKey = sm2.getPublicKeyFromPrivateKey(validKey.private_key);

    const cipherMode = 1; // C1C3C2 默认加密模式
    const encrypted = sm2.doEncrypt(plaintext, publicKey, cipherMode);

    return encrypted;
  }

  // 解密之前检查私钥是否有效
  public async decryptWithSM2(encryptedText: string): Promise<string> {
    const validKey = await this.loginKeyRepository
      .createQueryBuilder('loginKey')
      .where('loginKey.expiry_time > :now', { now: new Date() })
      .orderBy('loginKey.expiry_time', 'DESC')
      .getOne();

    // 如果找不到有效密钥，或者密钥已经过期，抛出错误
    if (!validKey || new Date() > new Date(validKey.expiry_time)) {
      throw new Error('Key 已过期或不存在');
    }

    const cipherMode = 1;

    try {
      const decrypted = sm2.doDecrypt(
        encryptedText,
        validKey.private_key,
        cipherMode,
        { output: 'array' },
      );

      if (!decrypted) {
        throw new Error('解密结果为空');
      }

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(new Uint8Array(decrypted));

      return decryptedText;
    } catch (err) {
      throw new Error('解密失败: ' + (err.message || JSON.stringify(err)));
    }
  }

  // AES 加密
  aesEncrypt(text: string, key: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.scryptSync(key.toString(), 'salt', 32),
      Buffer.alloc(16, 0),
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // AES 解密
  aesDecrypt(encryptedText: string, key: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.scryptSync(key.toString(), 'salt', 32),
      Buffer.alloc(16, 0), // 初始向量 IV
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // SHA256 加密
  hashEncrypt(text: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    return hash.digest('hex');
  }
}

import type { Account } from "@domain/entities/account";

export interface AuthRepository {
  loadAccounts(): Promise<Account[]>;
  saveAccounts(accounts: Account[]): Promise<void>;
}

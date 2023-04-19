import {
  Bucket,
  CreateWriteStreamOptions,
  GetFileOptions,
  GetFilesOptions,
  GetSignedUrlConfig,
  SaveOptions,
  Storage,
} from '@google-cloud/storage';
import { Writable } from 'stream';

interface FileStorageAdapter {
  listSignedLinks(...args: any[]): any;
  listPublicLinks(...args: any[]): any;
  list(...args: any[]): any;
  exists(...args: any[]): Promise<any>;
  delete(...args: any[]): Promise<any>;
  create(...args: any[]): Promise<any>;
  uploadStream(...args: any[]): Writable;
  filePublicUrl(...args: any[]): any;
}

const typeToKindMap: Record<string, Kind> = {
  png: 'image',
  jpeg: 'image',
  pdf: 'document',
};

function getKindByType(value: string) {
  return typeToKindMap[value] ?? 'other';
}

type Kind = 'folder' | 'image' | 'document' | 'other';
interface FFile {
  kind: Kind;
  name: string;
  link: string;
  ext: string;
  isFolder: boolean;
  size: string;
  updatedAt: string;
  createdAt: string;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface GoogleCloudStorageAdapterConfig {
  /**
   * The service account to use for authentication.
   * @see https://cloud.google.com/storage/docs/authentication#service_accounts
   * @see https://cloud.google.com/iam/docs/creating-managing-service-accounts
   * @see https://cloud.google.com/iam/docs/creating-managing-service-account-keys
   * @see https://cloud.google.com/iam/docs/understanding-service-accounts
   */
  serviceAccount: ServiceAccount;

  /**
   * The name of the bucket to use. If not provided, the bucket name will be
   * inferred from the service account.
   * @default <project-id>.appspot.com
   * @see https://cloud.google.com/storage/docs/projects
   * @see https://cloud.google.com/storage/docs/naming-buckets
   */
  bucket?: string;
}

export class GoogleCloudStorageAdapter implements FileStorageAdapter {
  private _storage: Storage;
  private _bucket: Bucket;

  constructor({ bucket, serviceAccount }: GoogleCloudStorageAdapterConfig) {
    this._storage = new Storage({ credentials: serviceAccount });
    bucket = bucket || `${serviceAccount.project_id}.appspot.com`;
    this._bucket = this._storage.bucket(bucket);
  }

  filePublicUrl(options: { fileName: string }) {
    return this._bucket.file(options.fileName).publicUrl();
  }

  uploadStream(options: { fileName: string } & CreateWriteStreamOptions) {
    return this._bucket
      .file(options.fileName)
      .createWriteStream({ resumable: false, ...options });
  }

  /**
   * Lists public URLs for the files in the bucket.
   *
   * @param options The options to use when listing the files.
   * @returns A list of public URLs for the files in the bucket.
   */
  async listPublicLinks(options?: GetFilesOptions) {
    const [files] = await this._bucket.getFiles(options);
    const result: FFile[] = [];
    for (const file of files) {
      const link = file.publicUrl();
      const ext = link.split('.').pop() as string;
      result.push({
        ext,
        link: link,
        name: file.name,
        kind: file.name.endsWith('/') ? 'folder' : getKindByType(ext),
        isFolder: file.name.endsWith('/'),
        createdAt: file.metadata.timeCreated,
        updatedAt: file.metadata.updated,
        size: file.metadata.size,
      });
    }
    return result;
  }

  /**
   * Returns a list of signed URLs for the files in the bucket.
   *
   * @param signUrlOptions The options to use when generating the signed URLs.
   * @param options The options to use when listing the files.
   * @returns A list of signed URLs for the files in the bucket.
   */
  async listSignedLinks(
    signUrlOptions: GetSignedUrlConfig,
    options?: GetFileOptions
  ): Promise<FFile[]> {
    const [files] = await this._bucket.getFiles(options);
    const result: FFile[] = [];
    for (const file of files) {
      const [link] = await file.getSignedUrl(signUrlOptions);
      const ext = link.split('.').pop() as string;
      result.push({
        ext,
        link: link,
        kind: file.name.endsWith('/') ? 'folder' : getKindByType(ext),
        name: file.name,
        isFolder: file.name.endsWith('/'),
        createdAt: file.metadata.timeCreated,
        updatedAt: file.metadata.updated,
        size: file.metadata.size,
      });
    }
    return result;
  }

  /**
   * Lists files in the bucket.
   *
   * @param options The options to use when listing the files.
   * @returns A list of files in the bucket.
   */
  list(options?: GetFileOptions) {
    return this._bucket.getFiles(options);
  }

  create(options: { fileName: string; content: Buffer } & SaveOptions) {
    return this._bucket.file(options.fileName).save(options.content, options);
  }

  delete(options: { fileName: string }) {
    return this._bucket.file(options.fileName).delete({});
  }

  exists(options: { fileName: string }) {
    return this._bucket.file(options.fileName).exists({});
  }
}

export class FileManager<T extends FileStorageAdapter>
  implements FileStorageAdapter
{
  private _adapter: FileStorageAdapter;
  constructor({ adapter }: { adapter: T }) {
    this._adapter = adapter;
  }

  filePublicUrl(
    ...args: Parameters<T['filePublicUrl']>
  ): Promise<ReturnType<T['filePublicUrl']>> {
    return this._adapter.filePublicUrl(...args);
  }

  exists(...args: Parameters<T['exists']>): Promise<ReturnType<T['exists']>> {
    return this._adapter.exists(...args);
  }
  delete(...args: Parameters<T['delete']>) {
    return this._adapter.delete(...args);
  }
  create(...args: Parameters<T['create']>) {
    return this._adapter.create(...args);
  }
  list(...args: Parameters<T['list']>): ReturnType<T['list']> {
    return this._adapter.list(...args);
  }
  listPublicLinks(
    ...args: Parameters<T['listPublicLinks']>
  ): ReturnType<T['listPublicLinks']> {
    return this._adapter.listPublicLinks(...args);
  }
  listSignedLinks(
    ...args: Parameters<T['listSignedLinks']>
  ): ReturnType<T['listSignedLinks']> {
    return this._adapter.listSignedLinks(...args);
  }
  uploadStream(...args: Parameters<T['uploadStream']>): Writable {
    return this._adapter.uploadStream(...args);
  }
}

const testServiceAccount = {
  type: 'service_account',
  project_id: 'fiber-testing-267a3',
  private_key_id: '6263341cc4164419183f3abd17d22c60e0aa64f0',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCUJznQqXq/YCxF\nYpJyHp15oJE+0HRU3yAuUv4g8Pdw3vuFSbIanOjH6cPOXnttNklbdS9mAjM6V58E\nXJE7Aij9dy6YknGuq/FwlB0OZQrw6Y+3v74IliQhsTpijKakQsarW4JPzc1xdP5j\npdThDT+xj/F6WRWYtpqoTzyrjMCajlcnJXS2CPvGQ/aYjrfaAVhlYOMx34JH4LYk\n3UWLo2j2TIDKL00UBopjPulnUj/4TDjq8hx1fkD2CbiGOw//hAYKj1O1Wbmm9yfT\nh0V+JZPjBqXtg6zi4ofBepWsuLt4zVgoUHBZkdy+/T/hj07esa2eORpjV7O2fktT\nQVNIprGvAgMBAAECggEAFuRCDwIblksiQWJWuyK3NbOKsx2l1qCsqfERlT4bwv6h\nTISzlrXHU28aXd5uzH7b3NwsLmMz+SrQG5jAqVEkdkLzxIgJisdvRJ7jfSA9uDXO\nisIqIczZLl+NDux+qdjWNmSrAPENcnTKWH6neFKsvx89B6jmKQo7YWWaO+5BVbVh\nLx5YzCLADD/nEUZN6UgPMm9AVdwVqGPK6x2cyjb+5/6umBOZglc+f+h1tmY07FRX\nOxfORBilbOoxSBw2Xl9gvtXhhME2Fkg250oiNmR1uR1epDhB+8q/oMcBHUpqLuEn\nUmDEf/jr/tlSnsRKP3fiZjcxiz1B3jpcWMhaQ/ZaGQKBgQDF250IzCMeWy3DwEm8\n8rymll6Glk2r+NUs6ZVDVpL1KCjwbgjYqxLtvTW9+T7Mwcs2904oRWNE9g2JTTOX\nMpMopPG3B3VwmrIN+FzSzJVKc+zPIdTfGEjF+GhEjK7ExTfdXiv9NH0WPq4tnaqG\nRAEgPuVrzcTAEqMQOlzmG3is3QKBgQC/sHK5dmB89t1RT9iHqv3c7u1koJTblJbO\nwW6feVX2bAkFbqRuG7EcbgpO9hRPU35/xVV3HmTzYcWSx1Rp+tCUGDdCOdoijMfS\niQC7ETEPbPvC4ofXXxsS1rLcKT6aUZRLd7vVTsIby57HGGEsHWmTdmSibiIDFSqw\nrqU7bLg5+wKBgG5OXoD+FgIhgSUl+bYeefBB2tcbype6tVZBr1aIWIvW5OQN5F6v\nGXFzUBfmcg2DaUDupSMsdAiJSMioQr/jkUlSk/Ofc+jgRa4mLdHT/tMwR/C+gsgR\n6Nh+Adtdtz26WcfPbaTPc4FIVqDVyrDqDtqkVhFA+ZS/jytH7mzXGfL9AoGAIqp6\nVOf/kxnh9G6ILiDSQD5FWEliIkPA8isxIk4DKcln6D+WJQOFCCsuWhFOovnqipjZ\nV+17PDiWTnEV5wSg6+dlNujXdiAXkw+LvkjhonSHIztsbZqZftKtDfu3gpj2RJ+m\nrHDN0dEFKeRSznOTQEPM90MLi5ssWT98Sj7jIjkCgYB0s1HybO/O+bczsIUFpuGc\niP8DN1FxjhbiiNZNF2UEbdg3frBPEkmK4F4qD932wjjEw4RUOoxNq4F/JcXwkYil\n1lQ3HWtfStaYKjO7hTQyySHlPLXfs/eWBlb95oxtgJ0Pei8nUpQm3hl0/BbbJtbE\n1E5ZwE37lkbY0XczE5wUww==\n-----END PRIVATE KEY-----\n',
  client_email:
    'cloud-storage-example@fiber-testing-267a3.iam.gserviceaccount.com',
  client_id: '116874887483579443535',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/cloud-storage-example%40fiber-testing-267a3.iam.gserviceaccount.com',
};

const serviceAccount = process.env.GOOGLE_CLOUD_STORAGE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.GOOGLE_CLOUD_STORAGE_SERVICE_ACCOUNT_KEY)
  : testServiceAccount;
export const fileManager = new FileManager({
  adapter: new GoogleCloudStorageAdapter({
    serviceAccount: serviceAccount,
  }),
});

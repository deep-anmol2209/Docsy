export class SupabaseStorageAdapter {
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL ?? '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  }

  public async download(objectKey: string): Promise<Buffer> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase storage configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
    }

    const [bucket, ...pathParts] = objectKey.split('/');
    if (!bucket || pathParts.length === 0) {
      throw new Error(`Invalid Supabase storage objectKey: ${objectKey}`);
    }

    const filePath = pathParts.join('/');
    const downloadUrl = `${this.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(filePath)}`;
    const response = await fetch(downloadUrl, {
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${objectKey}: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async upload(objectKey: string, data: Buffer, options?: { contentType?: string; upsert?: boolean }): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase storage configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
    }

    const [bucket, ...pathParts] = objectKey.split('/');
    if (!bucket || pathParts.length === 0) {
      throw new Error(`Invalid Supabase storage objectKey: ${objectKey}`);
    }

    const filePath = pathParts.join('/');
    const uploadUrl = `${this.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(filePath)}`;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': options?.contentType ?? 'application/octet-stream',
        'x-upsert': options?.upsert ? 'true' : 'false',
      },
      body: data as unknown as BodyInit,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${objectKey}: ${response.status} ${response.statusText}`);
    }
  }
}

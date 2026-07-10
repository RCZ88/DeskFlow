export function getApi(): any | undefined {
  return (window as any).deskflowAPI;
}

export async function awaitApi(timeoutMs = 10000): Promise<any> {
  const start = Date.now();
  while (!(window as any).deskflowAPI) {
    if (Date.now() - start > timeoutMs) throw new Error('deskflowAPI bridge not ready');
    await new Promise(r => setTimeout(r, 100));
  }
  return (window as any).deskflowAPI;
}

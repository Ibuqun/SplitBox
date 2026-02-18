export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      if (textarea && document.body.contains(textarea)) {
        document.body.removeChild(textarea);
      }
    }
  }
}

/** Saves text as a file on the user's device. Nothing is sent anywhere. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Let the browser start the download before the temporary address goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

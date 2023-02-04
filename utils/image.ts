import { toBlob } from "html-to-image";

export async function generateAndDownloadImage(
  node: HTMLElement,
  poem: string
) {
  const device = useDevice();

  console.log({ isSafari: device.isSafari });
  if (device.isSafari) {
    // https://github.com/bubkoo/html-to-image/issues/361#issuecomment-1402537176
    await toBlob(node);
    await toBlob(node);
    await toBlob(node);
  }

  const blob = await toBlob(node, {
    type: "image/jpeg",
    backgroundColor: "white",
    pixelRatio: 2,
  });

  if (!blob) {
    return;
  }

  const files = [new File([blob], "poema.jpg")];

  if (navigator.canShare) {
    const valid = navigator.canShare({ files });

    if (valid) {
      try {
        await navigator.share({
          files,
          title: "FotoPoema",
          text: poem,
        });

        return;
      } catch (error) {}
    }
  }

  const dataUrl = URL.createObjectURL(files[0]);
  const a = document.createElement("a");
  a.download = "poema.jpg";
  a.href = dataUrl;
  a.click();

  URL.revokeObjectURL(dataUrl);
}
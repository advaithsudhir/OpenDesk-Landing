import { fontStylesheetHref } from "./theme";

export default function FontLinks() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={fontStylesheetHref} rel="stylesheet" />
    </>
  );
}

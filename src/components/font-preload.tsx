export function FontPreload() {
  const fonts = [
    "be-vietnam-pro-latin-400-normal",
    "be-vietnam-pro-vietnamese-400-normal",
    "playfair-display-latin-600-normal",
    "playfair-display-vietnamese-600-normal",
    "playfair-display-latin-400-italic",
    "playfair-display-vietnamese-400-italic",
  ];
  // Explicit head markup keeps server/client resource order stable during streaming.
  return (
    <>
      {fonts.map((font) => (
        <link
          key={font}
          rel="preload"
          href={`/fonts/${font}.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
}
